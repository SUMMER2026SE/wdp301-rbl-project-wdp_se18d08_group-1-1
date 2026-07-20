const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const Session = require('../models/Session');
const Subscription = require('../models/Subscription');
const Vehicle = require('../models/Vehicle');
const StaffSubscriptionAction = require('../models/StaffSubscriptionAction');
const notifTriggers = require('../services/notificationTriggers');
const {
  isMembershipQrAvailable,
  parseAndVerifyMembershipQr,
} = require('../services/membershipQrService');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');

const EVIDENCE_IMAGE_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/;
const normalizeSlotCode = (slotCode = '') => String(slotCode).trim().toUpperCase();

const validateTransitionBody = (body = {}) => {
  const action = String(body.action || '').toUpperCase();
  const reason = String(body.reason || '').trim();
  const idempotencyKey = String(body.idempotencyKey || '').trim();
  const evidenceImageBase64 = body.evidenceImageBase64;

  if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) {
    return { error: 'Action must be CHECK_IN or CHECK_OUT' };
  }
  if (!reason || reason.length > 500) {
    return { error: 'A reason of at most 500 characters is required' };
  }
  if (!idempotencyKey || idempotencyKey.length > 100) {
    return { error: 'A valid idempotency key is required' };
  }
  if (
    typeof evidenceImageBase64 !== 'string' ||
    evidenceImageBase64.length > 20 * 1024 * 1024 ||
    !EVIDENCE_IMAGE_PATTERN.test(evidenceImageBase64)
  ) {
    return { error: 'A JPEG, PNG, or WebP evidence image is required' };
  }
  if (action === 'CHECK_IN') {
    if (!mongoose.Types.ObjectId.isValid(body.vehicleId)) {
      return { error: 'A valid membership vehicle is required' };
    }
    if (!mongoose.Types.ObjectId.isValid(body.floorId) || !normalizeSlotCode(body.parkingSlot)) {
      return { error: 'A reserved membership space is required' };
    }
  } else if (!mongoose.Types.ObjectId.isValid(body.sessionId)) {
    return { error: 'An active membership session is required' };
  }

  return { action, reason, idempotencyKey, evidenceImageBase64 };
};

const findVerifiedMembership = async (payload) => {
  const parsed = parseAndVerifyMembershipQr(payload);
  const subscription = await Subscription.findById(parsed.subscriptionId);

  if (!subscription || Number(subscription.qrVersion || 1) !== parsed.version) {
    throw Object.assign(new Error('Membership QR not found'), { statusCode: 404 });
  }
  if (!isMembershipQrAvailable(subscription)) {
    throw Object.assign(
      new Error('This membership has expired and its QR code is no longer valid'),
      { statusCode: 410, code: 'MEMBERSHIP_QR_INACTIVE' }
    );
  }

  return { parsed, subscription };
};

const uploadEvidence = async (base64, subscriptionId, action) => {
  const result = await cloudinary.uploader.upload(base64, {
    folder: `valo-parking/staff-membership-evidence/${subscriptionId}`,
    public_id: `${action.toLowerCase()}-${Date.now()}`,
    resource_type: 'image',
  });
  return result.secure_url;
};

exports.resolveMembershipQr = async (req, res, next) => {
  try {
    const { subscription } = await findVerifiedMembership(req.body?.payload);
    await subscription.populate([
      { path: 'user', select: 'username email' },
      { path: 'ticketPackage', select: 'name type' },
      { path: 'slots.floorId', select: 'name floorNumber' },
    ]);

    const userId = subscription.user?._id || subscription.user;
    const [vehicles, activeSessions] = await Promise.all([
      Vehicle.find({ owner: userId, status: 'approved' })
        .select('licensePlate vehicleType brand model color')
        .lean(),
      Session.find({
        userId,
        type: 'SUBSCRIPTION',
        status: 'active',
        $or: [
          { subscriptionId: subscription._id },
          { subscriptionId: null },
        ],
      })
        .populate('floorId', 'name floorNumber')
        .sort({ checkInTime: -1 })
        .lean(),
    ]);

    const allowedActions = [];
    if (
      vehicles.length > 0 &&
      subscription.slots.length > 0 &&
      activeSessions.length < subscription.slots.length
    ) {
      allowedActions.push('CHECK_IN');
    }
    if (activeSessions.length > 0) {
      allowedActions.push('CHECK_OUT');
    }

    return res.status(200).json({
      success: true,
      data: {
        credentialType: 'MEMBERSHIP',
        membership: subscription,
        vehicles,
        activeSessions,
        allowedActions,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.transitionMembershipByQr = async (req, res, next) => {
  try {
    const input = validateTransitionBody(req.body);
    if (input.error) {
      return res.status(400).json({ success: false, message: input.error });
    }

    const { parsed, subscription } = await findVerifiedMembership(req.body?.payload);
    if (String(parsed.subscriptionId) !== String(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'QR code does not match this membership',
      });
    }

    const existingAction = await StaffSubscriptionAction.findOne({
      staffId: req.user._id,
      idempotencyKey: input.idempotencyKey,
    });
    if (existingAction) {
      if (
        String(existingAction.subscriptionId) !== String(subscription._id) ||
        existingAction.action !== input.action
      ) {
        return res.status(409).json({
          success: false,
          message: 'Idempotency key was already used for another staff action',
        });
      }
      const session = await Session.findById(existingAction.sessionId);
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Staff membership action was already completed',
        data: { session },
      });
    }

    let session;
    let vehicle;
    let evidenceImageUrl;

    if (input.action === 'CHECK_IN') {
      vehicle = await Vehicle.findOne({
        _id: req.body.vehicleId,
        owner: subscription.user,
        status: 'approved',
      });
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Membership vehicle not found' });
      }

      const floorId = String(req.body.floorId);
      const parkingSlot = normalizeSlotCode(req.body.parkingSlot);
      const ownsSlot = subscription.slots.some(
        (slot) =>
          String(slot.floorId) === floorId &&
          normalizeSlotCode(slot.slotCode) === parkingSlot
      );
      if (!ownsSlot) {
        return res.status(403).json({
          success: false,
          message: 'This parking space is not assigned to the membership',
        });
      }

      const cleanPlate = normalizeLicensePlate(vehicle.licensePlate);
      const [vehicleSession, occupiedSlot] = await Promise.all([
        Session.findOne({ licensePlate: cleanPlate, status: 'active' }),
        Session.findOne({ floorId, parkingSlot, status: 'active' }),
      ]);
      if (vehicleSession) {
        return res.status(409).json({
          success: false,
          message: 'This vehicle already has an active parking session',
        });
      }
      if (occupiedSlot) {
        return res.status(409).json({
          success: false,
          message: 'The selected membership space is currently occupied',
        });
      }

      evidenceImageUrl = await uploadEvidence(
        input.evidenceImageBase64,
        subscription._id,
        input.action
      );
      session = await Session.create({
        licensePlate: cleanPlate,
        userId: subscription.user,
        subscriptionId: subscription._id,
        type: 'SUBSCRIPTION',
        source: 'staff_manual',
        vehicleType: vehicle.vehicleType,
        parkingSlot,
        floorId,
        expectedDurationHours: 24,
        entryImage_url: evidenceImageUrl,
        entryCamera: 'staff_mobile',
        entryGate: 'manual_override',
        paymentStatus: 'paid',
        status: 'active',
      });
    } else {
      session = await Session.findOne({
        _id: req.body.sessionId,
        userId: subscription.user,
        type: 'SUBSCRIPTION',
        status: 'active',
        $or: [
          { subscriptionId: subscription._id },
          { subscriptionId: null },
        ],
      });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Active membership session not found',
        });
      }

      vehicle = await Vehicle.findOne({
        owner: subscription.user,
        licensePlate: normalizeLicensePlate(session.licensePlate),
      });
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle for this membership session was not found',
        });
      }

      evidenceImageUrl = await uploadEvidence(
        input.evidenceImageBase64,
        subscription._id,
        input.action
      );
      const updatedSession = await Session.findOneAndUpdate(
        { _id: session._id, status: 'active' },
        {
          status: 'completed',
          checkOutTime: new Date(),
          totalPrice: 0,
          paymentStatus: 'paid',
          exitImage_url: evidenceImageUrl,
          exitCamera: 'staff_mobile',
          exitGate: 'manual_override',
        },
        { new: true }
      );
      if (!updatedSession) {
        return res.status(409).json({
          success: false,
          message: 'Membership session is no longer active',
        });
      }
      session = updatedSession;
    }

    await StaffSubscriptionAction.create({
      subscriptionId: subscription._id,
      sessionId: session._id,
      staffId: req.user._id,
      action: input.action,
      vehicleId: vehicle._id,
      reason: input.reason,
      evidenceImageUrl,
      idempotencyKey: input.idempotencyKey,
    });

    const notification =
      input.action === 'CHECK_IN'
        ? notifTriggers.notifyVehicleEntry(
            req.app,
            subscription.user,
            vehicle.licensePlate,
            session.parkingSlot || 'N/A'
          )
        : notifTriggers.notifyVehicleExit(
            req.app,
            subscription.user,
            vehicle.licensePlate,
            0
          );
    notification.catch((error) =>
      console.error('Failed to send staff membership notification:', error)
    );

    return res.status(200).json({
      success: true,
      message: `Membership ${input.action === 'CHECK_IN' ? 'check-in' : 'check-out'} completed`,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};
