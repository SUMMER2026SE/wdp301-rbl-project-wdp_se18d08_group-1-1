const Subscription = require('../models/Subscription');
const mongoose = require('mongoose');
const TicketPackage = require('../models/TicketPackage');
const User = require('../models/User');
const Slot = require('../models/Slot');
const payos = require('../config/payos');
const walletService = require('../services/walletService');
const {
  buildAccountMembershipQrPayload,
  buildMembershipQrPayload,
  isMembershipQrAvailable,
} = require('../services/membershipQrService');

const buildExpirationDate = (packageType, fromDate = new Date()) => {
  const expireAt = new Date(fromDate);
  if (packageType === 'monthly') {
    expireAt.setMonth(expireAt.getMonth() + 1);
  } else {
    expireAt.setFullYear(expireAt.getFullYear() + 1);
  }
  return expireAt;
};

exports.getMembershipQr = async (req, res, next) => {
  try {
    const now = new Date();
    const expireAt = req.user.membership?.expireAt ? new Date(req.user.membership.expireAt) : null;
    const membershipActive = Boolean(req.user.membership?.isVip && expireAt && expireAt > now);
    const activeSubscription = membershipActive ? null : await Subscription.findOne({
      user: req.user._id,
      status: 'active',
      paymentStatus: 'paid',
      expireAt: { $gt: now },
    }).sort({ expireAt: -1 });

    const effectiveExpiry = expireAt && expireAt > now ? expireAt : activeSubscription?.expireAt || null;
    if (!membershipActive && !activeSubscription) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          credentialType: 'ACCOUNT',
          membershipStatus: 'inactive',
          expireAt: effectiveExpiry,
          payload: null,
          reason: 'Membership QR is unavailable because there is no active membership.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        available: true,
        credentialType: membershipActive ? 'ACCOUNT' : 'LEGACY_SUBSCRIPTION',
        membershipStatus: 'active',
        expireAt: effectiveExpiry,
        payload: membershipActive
          ? buildAccountMembershipQrPayload(req.user)
          : buildMembershipQrPayload(activeSubscription),
        reason: null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.getSubscriptionMembershipQr = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.subscriptionId)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription ID' });
    }
    const query = { _id: req.params.subscriptionId };
    if (req.user.role !== 'admin') query.user = req.user._id;

    const subscription = await Subscription.findOne(query);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    const available = isMembershipQrAvailable(subscription);
    return res.status(200).json({
      success: true,
      data: {
        available,
        credentialType: 'LEGACY_SUBSCRIPTION',
        membershipStatus: available ? 'active' : subscription.status,
        expireAt: subscription.expireAt,
        payload: available ? buildMembershipQrPayload(subscription) : null,
        reason: available ? null : 'MEMBERSHIP_QR_INACTIVE',
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Create payment order for subscription
exports.createSubscriptionPayment = async (req, res, next) => {
  try {
    const { packageId, slots } = req.body;
    
    // Validate package
    const ticketPackage = await TicketPackage.findById(packageId);
    if (!ticketPackage || !['monthly', 'yearly'].includes(ticketPackage.type) || !ticketPackage.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid subscription package.' });
    }

    // Validate slots limit based on vehicles
    const Vehicle = require('../models/Vehicle');
    const vehiclesCount = await Vehicle.countDocuments({ owner: req.user._id });
    const maxSlots = Math.min(3, vehiclesCount); // User can choose up to their vehicle count, max 3
    if (slots.length > maxSlots) {
      return res.status(400).json({ success: false, message: `You can only select up to ${maxSlots} slots based on your registered vehicles.` });
    }

    // Check if slots are already reserved
    for (const slot of slots) {
      const slotDoc = await Slot.findOne({ floorID: slot.floorId, slotNumber: slot.slotCode });
      if (slotDoc && slotDoc.reservedFor && slotDoc.reservedFor.toString() !== req.user._id.toString()) {
        return res.status(400).json({ success: false, message: `Slot ${slot.slotCode} is already reserved by someone else.` });
      }
    }

    // Amount to pay (price * number of slots)
    const amount = ticketPackage.price * Math.max(1, slots.length);

    // Generate Order Code for PayOS
    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 100));

    // Calculate expiration date
    const expireAt = buildExpirationDate(ticketPackage.type);

    // Call PayOS API to create payment link
    const paymentData = {
      orderCode,
      amount: parseInt(amount),
      description: `VIP ${ticketPackage.type === 'monthly' ? 'Thang' : 'Nam'}`,
      returnUrl: process.env.PAYOS_RETURN_URL || `${process.env.CLIENT_URL}/membership?orderCode=${orderCode}`,
      cancelUrl: process.env.PAYOS_CANCEL_URL || `${process.env.CLIENT_URL}/membership?orderCode=${orderCode}&cancel=true`,
      items: [
        {
          name: `VIP ${ticketPackage.type === 'monthly' ? 'Month' : 'Year'}`,
          quantity: 1,
          price: parseInt(amount),
        },
      ],
    };

    const paymentLink = await payos.paymentRequests.create(paymentData);
    const checkoutUrl = paymentLink.checkoutUrl;

    // Create pending subscription
    const subscription = new Subscription({
      user: req.user._id,
      ticketPackage: ticketPackage._id,
      slots,
      amount,
      orderCode,
      expireAt,
      paymentStatus: 'pending'
    });
    await subscription.save();

    res.status(200).json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        orderCode,
        amount,
        checkoutUrl, // Client will redirect or show QR code
        qrCode: paymentLink.qrCode,
        paymentLinkId: paymentLink.paymentLinkId,
      }
    });

  } catch (error) {
    next(error);
  }
};

// Verify payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderCode } = req.body;
    
    const subscription = await Subscription.findOne({ orderCode, user: req.user._id });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found.' });
    }

    if (subscription.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Already paid.' });
    }

    // Verify via PayOS API
    let isPaymentSuccessful = false;
    try {
      const payosInfo = await payos.paymentRequests.get(parseInt(orderCode));
      if (payosInfo.status === 'PAID') {
        isPaymentSuccessful = true;
      }
    } catch (payosError) {
      console.error('Error checking PayOS status for subscription:', payosError.message);
    }
    
    if (isPaymentSuccessful) {
      subscription.paymentStatus = 'paid';
      subscription.status = 'active';
      await subscription.save();

      // Update User VIP status
      const user = await User.findById(req.user._id);
      user.membership.isVip = true;
      user.membership.packageId = subscription.ticketPackage;
      user.membership.expireAt = subscription.expireAt;
      
      const ticketPackage = await TicketPackage.findById(subscription.ticketPackage);
      if (ticketPackage && ticketPackage.type === 'yearly') {
        user.membership.freeServiceCount = 12; // Free 12 services for Yearly
      }
      await user.save();

      // Update Slots reservedFor
      for (const slot of subscription.slots) {
        await Slot.updateOne(
          { floorID: slot.floorId, slotNumber: slot.slotCode },
          { reservedFor: user._id }
        );
      }

      return res.status(200).json({ success: true, message: 'Subscription activated successfully!' });
    } else {
      const payosInfo = await payos.paymentRequests.get(parseInt(orderCode)).catch(() => null);
      if (['CANCELLED', 'FAILED'].includes(payosInfo?.status)) {
        subscription.paymentStatus = payosInfo.status === 'CANCELLED' ? 'cancelled' : 'failed';
        subscription.status = payosInfo.status === 'CANCELLED' ? 'cancelled' : 'failed';
        await subscription.save();
      }
      return res.status(400).json({ success: false, message: 'Payment not completed.' });
    }
  } catch (error) {
    next(error);
  }
};

// Pay subscription with Valo Wallet
exports.paySubscriptionWithWallet = async (req, res, next) => {
  try {
    const { packageId, slots } = req.body;
    
    // Validate package
    const ticketPackage = await TicketPackage.findById(packageId);
    if (!ticketPackage || !['monthly', 'yearly'].includes(ticketPackage.type) || !ticketPackage.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid subscription package.' });
    }

    // Validate slots limit based on vehicles
    const Vehicle = require('../models/Vehicle');
    const vehiclesCount = await Vehicle.countDocuments({ owner: req.user._id });
    const maxSlots = Math.min(3, vehiclesCount); 
    if (slots.length > maxSlots) {
      return res.status(400).json({ success: false, message: `You can only select up to ${maxSlots} slots based on your registered vehicles.` });
    }

    // Check if slots are already reserved
    for (const slot of slots) {
      const slotDoc = await Slot.findOne({ floorID: slot.floorId, slotNumber: slot.slotCode });
      if (slotDoc && slotDoc.reservedFor && slotDoc.reservedFor.toString() !== req.user._id.toString()) {
        return res.status(400).json({ success: false, message: `Slot ${slot.slotCode} is already reserved by someone else.` });
      }
    }

    // Amount to pay (price * number of slots)
    const amount = ticketPackage.price * Math.max(1, slots.length);

    // Calculate expiration date
    const expireAt = buildExpirationDate(ticketPackage.type);

    // Create subscription
    const subscription = new Subscription({
      user: req.user._id,
      ticketPackage: ticketPackage._id,
      slots,
      amount,
      orderCode: Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 100)),
      expireAt,
      paymentStatus: 'pending' // Will update after wallet debit
    });
    
    await subscription.save();

    // Debit Wallet
    try {
      await walletService.debitWallet(req.user._id, amount, `Buy VIP Package - ${ticketPackage.type}`, {
        refSource: 'subscription',
        refSourceId: subscription._id.toString()
      });
    } catch (err) {
      subscription.paymentStatus = 'failed';
      await subscription.save();
      return res.status(400).json({ success: false, message: err.message || 'Insufficient wallet balance.' });
    }

    // Wallet debit successful, activate subscription
    subscription.paymentStatus = 'paid';
    subscription.status = 'active';
    await subscription.save();

    // Update User VIP status
    const user = await User.findById(req.user._id);
    user.membership.isVip = true;
    user.membership.packageId = subscription.ticketPackage;
    user.membership.expireAt = subscription.expireAt;
    
    if (ticketPackage.type === 'yearly') {
      user.membership.freeServiceCount = 12; // Free 12 services for Yearly
    }
    await user.save();

    // Update Slots reservedFor
    for (const slot of subscription.slots) {
      await Slot.updateOne(
        { floorID: slot.floorId, slotNumber: slot.slotCode },
        { reservedFor: user._id }
      );
    }

    return res.status(200).json({ success: true, message: 'Subscription activated successfully via Valo Wallet!' });
  } catch (error) {
    next(error);
  }
};

exports.getMembership = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('membership')
      .populate('membership.packageId', 'name type price description isActive')
      .lean();

    const activeSubscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active',
      paymentStatus: 'paid',
    })
      .sort({ expireAt: -1 })
      .populate('ticketPackage', 'name type price description isActive')
      .populate('slots.floorId', 'name floorNumber')
      .lean();

    const expireAt = user?.membership?.expireAt ? new Date(user.membership.expireAt) : null;
    const now = new Date();
    const isActive = Boolean(user?.membership?.isVip && expireAt && expireAt > now);
    const daysUntilExpiration = expireAt
      ? Math.ceil((expireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const pkg = activeSubscription?.ticketPackage || user?.membership?.packageId || null;

    res.status(200).json({
      success: true,
      data: {
        isVip: isActive,
        status: isActive ? 'active' : 'expired',
        expireAt,
        expirationWarning: Boolean(isActive && daysUntilExpiration !== null && daysUntilExpiration <= 7),
        freeServiceCount: user?.membership?.freeServiceCount || 0,
        package: pkg
          ? {
              id: pkg._id,
              name: pkg.name,
              type: pkg.type,
              price: pkg.price,
              description: pkg.description,
            }
          : null,
        reservedSlots: (activeSubscription?.slots || []).map((slot) => ({
          floorId: slot.floorId?._id || slot.floorId,
          floorName: slot.floorId?.name || '',
          floorNumber: slot.floorId?.floorNumber || null,
          slotCode: slot.slotCode,
        })),
        benefits: isActive
          ? ['Reserved VIP parking slots', 'Priority parking access', 'Membership parking coverage']
          : [],
        renewal: {
          status: 'manual',
          nextRenewalDate: expireAt,
          price: pkg?.price || 0,
          message: 'Auto-renewal is not yet supported.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.buildExpirationDate = buildExpirationDate;

// Admin: Get all subscriptions
exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('user', 'username email status')
      .populate('ticketPackage', 'name type price')
      .populate({
        path: 'slots.floorId',
        select: 'name floorNumber'
      })
      .sort({ createdAt: -1 })
      .lean();

    const Vehicle = require('../models/Vehicle');
    const userIds = [...new Set(subscriptions.map(s => s.user?._id?.toString()).filter(Boolean))];
    const vehicles = await Vehicle.find({ owner: { $in: userIds } }).select('owner licensePlate').lean();
    
    const vehiclesByUserId = {};
    for (const v of vehicles) {
      if (!vehiclesByUserId[v.owner]) vehiclesByUserId[v.owner] = [];
      vehiclesByUserId[v.owner].push(v.licensePlate);
    }

    const enhancedSubscriptions = subscriptions.map(sub => {
      const userId = sub.user?._id?.toString();
      return {
        ...sub,
        user: {
          ...sub.user,
          vehicles: vehiclesByUserId[userId] || []
        }
      };
    });

    res.status(200).json({
      success: true,
      data: enhancedSubscriptions
    });
  } catch (error) {
    next(error);
  }
};
