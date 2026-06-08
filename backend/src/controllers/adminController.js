const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const Vehicle = require('../models/Vehicle');
// ─── Draco compression ────────────────────────────────────────────────────────
// npm install gltf-pipeline
const { processGlb } = require('gltf-pipeline');

// Same normalizer as vehicleController – must stay in sync
const normalizeSlug = (str = '') =>
  str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Update modelUrl for all vehicles whose normalised brand+model matches the publicId
const syncVehiclesForModel = async (brand, model, secureUrl) => {
  const nb = normalizeSlug(brand);
  const nm = normalizeSlug(model || 'default');

  // Build a regex that matches the original brand/model case-insensitively
  // e.g. brand='Peugeot', model='3008 P4'  → find vehicles where
  //   normalizeSlug(brand)==nb AND normalizeSlug(model)==nm
  // We do this by fetching candidates and filtering in JS (collections are small)
  const candidates = await Vehicle.find({
    brand: { $regex: new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });

  const toUpdate = candidates.filter(
    (v) => normalizeSlug(v.model || 'default') === nm,
  );

  if (toUpdate.length > 0) {
    await Vehicle.updateMany(
      { _id: { $in: toUpdate.map((v) => v._id) } },
      { $set: { modelUrl: secureUrl } },
    );
  }
  return toUpdate.length;
};

/**
 * @desc  Search users by username or email (Admin/Staff)
 * @route GET /api/admin/users/search
 * @access Admin only
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const User = require('../models/User'); // Import here to avoid circular dependencies if any
    
    const filter = q ? {
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    } : {};
    
    const users = await User.find(filter)
      .select('username email role status')
      .limit(20)
      .lean();
      
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Upload a .glb 3D model for a vehicle brand/model
 * @route POST /api/admin/vehicles/upload-model
 * @access Admin only
 * Body (multipart/form-data):
 *   - brand   : string  (e.g. "Toyota")
 *   - model   : string  (e.g. "Camry") — use "default" to set a brand-level fallback
 *   - file    : .glb binary
 */
exports.uploadVehicleModel = async (req, res, next) => {
  try {
    const { brand, model } = req.body;

    if (!brand) {
      return res.status(400).json({ success: false, message: 'brand is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (ext !== 'glb') {
      return res.status(400).json({ success: false, message: 'Only .glb files are accepted' });
    }

    const nb = normalizeSlug(brand);
    const nm = normalizeSlug(model || 'default');
    const publicId = `vehicles/${nb}/${nm}`;

    // ── Step 1: Compress GLB in-memory with Draco ─────────────────────────────
    // Processes the raw buffer — no temp files written to disk.
    // If gltf-pipeline fails (e.g. model already compressed), fall back to original.
    let uploadBuffer = req.file.buffer;
    try {
      const compressResult = await processGlb(req.file.buffer, {
        dracoOptions: { compressionLevel: 7 },
      });
      uploadBuffer = compressResult.glb;
      console.log(
        `[uploadVehicleModel] Draco compressed: ${req.file.buffer.length} → ${uploadBuffer.length} bytes`,
      );
    } catch (compressErr) {
      // Non-fatal: upload uncompressed if Draco step fails
      console.warn('[uploadVehicleModel] Draco compression skipped:', compressErr.message);
      // uploadBuffer stays as req.file.buffer (original)
    }
    // NOTE: We use multer memoryStorage so there are NO temp files on disk.
    // If you ever switch to diskStorage, add fs.unlinkSync(req.file.path) in
    // a try/finally block here to clean up the temp file.

    // ── Step 2: Upload compressed buffer → Cloudinary as raw resource ─────────
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: publicId,
          overwrite: true,
          invalidate: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(uploadBuffer).pipe(uploadStream);
    });

    const synced = await syncVehiclesForModel(brand, model || 'default', uploadResult.secure_url);

    res.status(200).json({
      success: true,
      message: `Model uploaded at vehicles/${nb}/${nm}`,
      data: {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        bytes: uploadResult.bytes,
        brand,
        model: model || 'default',
        vehiclesSynced: synced,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Delete a .glb model from Cloudinary
 * @route DELETE /api/admin/vehicles/upload-model
 * @access Admin only
 * Body: { brand, model }
 */
exports.deleteVehicleModel = async (req, res, next) => {
  try {
    const { brand, model } = req.body;
    if (!brand) {
      return res.status(400).json({ success: false, message: 'brand is required' });
    }
    const nb = normalizeSlug(brand);
    const nm = normalizeSlug(model || 'default');

    // Step 1: Remove the file from Cloudinary
    await cloudinary.uploader.destroy(`vehicles/${nb}/${nm}`, { resource_type: 'raw' });

    // Step 2: Clear modelUrl on all Vehicle documents that pointed to this model.
    // Without this, existing vehicles still hold the old URL and keep rendering
    // the 3D model even after deletion.
    const vehiclesSynced = await syncVehiclesForModel(brand, model || 'default', '');

    res.status(200).json({
      success: true,
      message: `Deleted vehicles/${nb}/${nm}`,
      data: { vehiclesSynced },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  List all uploaded vehicle models
 * @route GET /api/admin/vehicles/models
 * @access Admin only
 */
exports.listVehicleModels = async (req, res, next) => {
  try {
    const result = await cloudinary.api.resources({
      resource_type: 'raw',
      type: 'upload',
      prefix: 'vehicles/',
      max_results: 200,
    });

    const models = (result.resources || []).map((r) => ({
      publicId: r.public_id,
      url: r.secure_url,
      bytes: r.bytes,
      createdAt: r.created_at,
    }));

    res.status(200).json({ success: true, data: models });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Re-scan all vehicles against Cloudinary models and fix missing modelUrls
 * @route POST /api/admin/vehicles/sync-models
 * @access Admin only
 */
exports.syncAllVehicleModels = async (req, res, next) => {
  try {
    // 1. Get all Cloudinary raw files under vehicles/
    const result = await cloudinary.api.resources({
      resource_type: 'raw',
      type: 'upload',
      prefix: 'vehicles/',
      max_results: 200,
    });

    // Build a lookup map: "brand/model" → secure_url
    const cloudMap = {};
    for (const r of result.resources || []) {
      // public_id format: vehicles/{brand}/{model}
      const key = r.public_id.replace(/^vehicles\//, '');
      cloudMap[key] = r.secure_url;
    }

    // 2. Get all vehicles
    const vehicles = await Vehicle.find({});
    let updated = 0;

    for (const v of vehicles) {
      const nb = normalizeSlug(v.brand);
      const nm = normalizeSlug(v.model || 'default');
      const key = `${nb}/${nm}`;
      const url = cloudMap[key] || '';

      if (v.modelUrl !== url) {
        v.modelUrl = url;
        await v.save();
        updated++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Synced ${updated} vehicle(s)`,
      data: { total: vehicles.length, updated },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Vehicle Approval ─────────────────────────────────────────────────────────

/**
 * @desc  List all pending vehicles (with owner info)
 * @route GET /api/admin/vehicles/pending
 * @access Admin only
 */
exports.getPendingVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ status: 'pending' })
      .populate('owner', 'name email')
      .sort({ createdAt: 1 });
    res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Approve a vehicle (optionally assign modelUrl)
 * @route PATCH /api/admin/vehicles/:id/approve
 * @access Admin only
 */
exports.approveVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    vehicle.status = 'approved';
    if (req.body.modelUrl !== undefined) vehicle.modelUrl = req.body.modelUrl;
    await vehicle.save();

    res.status(200).json({ success: true, message: 'Vehicle approved', data: vehicle });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Reject (delete) a pending vehicle
 * @route DELETE /api/admin/vehicles/:id/reject
 * @access Admin only
 */
exports.rejectVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.status(200).json({ success: true, message: 'Vehicle rejected and removed' });
  } catch (err) {
    next(err);
  }
};
