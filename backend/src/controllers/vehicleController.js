const { validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');

/**
 * @desc    Get all vehicles of current user
 * @route   GET /api/vehicles
 * @access  Private
 */
const getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get a single vehicle by ID
 * @route   GET /api/vehicles/:id
 * @access  Private
 */
const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: 'Vehicle not found' });
    }

    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add a new vehicle
 * @route   POST /api/vehicles
 * @access  Private
 */
const addVehicle = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { licensePlate, vehicleType, brand, model, color, nickname, isDefault } =
      req.body;

    // Check duplicate license plate
    const existing = await Vehicle.findOne({
      licensePlate: licensePlate.toUpperCase().trim(),
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This license plate is already registered',
      });
    }

    // If first vehicle, set as default automatically
    const count = await Vehicle.countDocuments({ owner: req.user._id });
    const setDefault = count === 0 ? true : !!isDefault;

    const vehicle = await Vehicle.create({
      owner: req.user._id,
      licensePlate,
      vehicleType,
      brand,
      model,
      color,
      nickname,
      isDefault: setDefault,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: vehicle,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This license plate is already registered',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a vehicle
 * @route   PUT /api/vehicles/:id
 * @access  Private
 */
const updateVehicle = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: 'Vehicle not found' });
    }

    const { licensePlate, vehicleType, brand, model, color, nickname, isDefault } =
      req.body;

    // Check duplicate license plate (excluding this vehicle)
    if (licensePlate) {
      const duplicate = await Vehicle.findOne({
        licensePlate: licensePlate.toUpperCase().trim(),
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'This license plate is already registered',
        });
      }
      vehicle.licensePlate = licensePlate;
    }

    if (vehicleType !== undefined) vehicle.vehicleType = vehicleType;
    if (brand !== undefined) vehicle.brand = brand;
    if (model !== undefined) vehicle.model = model;
    if (color !== undefined) vehicle.color = color;
    if (nickname !== undefined) vehicle.nickname = nickname;
    if (isDefault !== undefined) vehicle.isDefault = isDefault;

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This license plate is already registered',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a vehicle
 * @route   DELETE /api/vehicles/:id
 * @access  Private
 */
const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: 'Vehicle not found' });
    }

    // If deleted vehicle was default, assign default to the newest remaining vehicle
    if (vehicle.isDefault) {
      const next = await Vehicle.findOne({ owner: req.user._id }).sort({
        createdAt: -1,
      });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Set a vehicle as default
 * @route   PATCH /api/vehicles/:id/default
 * @access  Private
 */
const setDefaultVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: 'Vehicle not found' });
    }

    vehicle.isDefault = true;
    await vehicle.save(); // pre-save hook clears other defaults

    res.status(200).json({
      success: true,
      message: 'Default vehicle updated',
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  setDefaultVehicle,
};
