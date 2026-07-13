const Subscription = require('../models/Subscription');
const TicketPackage = require('../models/TicketPackage');
const User = require('../models/User');
const Slot = require('../models/Slot');
const payos = require('../config/payos');
const walletService = require('../services/walletService');
const Vehicle = require('../models/Vehicle');
const mongoose = require('mongoose');

const validateSubscriptionRequest = async ({ userId, ticketPackage, slots }) => {
  if (!Array.isArray(slots) || slots.length === 0) {
    return { error: 'Please select at least one parking slot to reserve.' };
  }

  const vehiclesCount = await Vehicle.countDocuments({ owner: userId });
  const maxSlots = Math.min(3, vehiclesCount);
  if (vehiclesCount === 0 || slots.length > maxSlots) {
    return { error: `You can only select 1-${maxSlots} slots based on your registered vehicles.` };
  }

  const normalizedSlots = slots.map((slot) => ({
    floorId: String(slot?.floorId || '').trim(),
    slotCode: String(slot?.slotCode || '').trim(),
  }));
  if (normalizedSlots.some((slot) => !slot.floorId || !slot.slotCode)) {
    return { error: 'Invalid parking slot selection.' };
  }
  if (normalizedSlots.some((slot) => !mongoose.isValidObjectId(slot.floorId))) {
    return { error: 'Invalid parking floor selection.' };
  }

  const uniqueKeys = new Set(normalizedSlots.map((slot) => `${slot.floorId}:${slot.slotCode.toUpperCase()}`));
  if (uniqueKeys.size !== normalizedSlots.length) {
    return { error: 'Duplicate parking slots are not allowed.' };
  }

  const activeSubscription = await Subscription.findOne({
    user: userId,
    status: 'active',
    paymentStatus: 'paid',
    expireAt: { $gt: new Date() },
  }).populate('ticketPackage', 'type');
  const membershipUser = await User.findById(userId)
    .select('membership')
    .populate('membership.packageId', 'type');
  const membershipIsActive = Boolean(
    membershipUser?.membership?.isVip
      && membershipUser.membership.expireAt
      && new Date(membershipUser.membership.expireAt) > new Date(),
  );
  const activePackage = activeSubscription?.ticketPackage
    || (membershipIsActive ? membershipUser.membership.packageId : null);
  if (activePackage) {
    if (String(activePackage._id) === String(ticketPackage._id)) {
      return { error: 'You are already using this subscription package.' };
    }
    if (activePackage.type === 'yearly' && ticketPackage.type === 'monthly') {
      return { error: 'The monthly package is already included in your active yearly package.' };
    }
  }

  const slotDocs = await Promise.all(normalizedSlots.map((slot) => Slot.findOne({
    floorID: slot.floorId,
    slotNumber: { $regex: `^${slot.slotCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  })));
  for (let index = 0; index < normalizedSlots.length; index += 1) {
    const selectedSlot = normalizedSlots[index];
    const slotDoc = slotDocs[index];
    if (!slotDoc) return { error: `Slot ${selectedSlot.slotCode} does not exist.` };
    if (['occupied', 'booked', 'maintenance'].includes(slotDoc.status)) {
      return { error: `Slot ${selectedSlot.slotCode} is not available.` };
    }
    if (slotDoc.reservedFor && String(slotDoc.reservedFor) !== String(userId)) {
      return { error: `Slot ${selectedSlot.slotCode} is already reserved by someone else.` };
    }
    selectedSlot.slotCode = slotDoc.slotNumber;
    selectedSlot.floorId = String(slotDoc.floorID);
  }

  return { normalizedSlots };
};

const buildExpirationDate = (packageType, fromDate = new Date()) => {
  const expireAt = new Date(fromDate);
  if (packageType === 'monthly') {
    expireAt.setMonth(expireAt.getMonth() + 1);
  } else {
    expireAt.setFullYear(expireAt.getFullYear() + 1);
  }
  return expireAt;
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

    const validation = await validateSubscriptionRequest({ userId: req.user._id, ticketPackage, slots });
    if (validation.error) return res.status(400).json({ success: false, message: validation.error });
    const validatedSlots = validation.normalizedSlots;

    // Amount to pay
    const amount = ticketPackage.price;

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
      slots: validatedSlots,
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

    const validation = await validateSubscriptionRequest({ userId: req.user._id, ticketPackage, slots });
    if (validation.error) return res.status(400).json({ success: false, message: validation.error });
    const validatedSlots = validation.normalizedSlots;

    const amount = ticketPackage.price;

    // Calculate expiration date
    const expireAt = buildExpirationDate(ticketPackage.type);

    // Create subscription
    const subscription = new Subscription({
      user: req.user._id,
      ticketPackage: ticketPackage._id,
      slots: validatedSlots,
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
