const Subscription = require('../models/Subscription');
const TicketPackage = require('../models/TicketPackage');
const User = require('../models/User');
const Slot = require('../models/Slot');
const payos = require('../config/payos');
const walletService = require('../services/walletService');
const {
  validateNewSubscriptionEligibility,
} = require('../services/subscriptionEligibilityService');
const { isEnabled, defaultForCurrentEnvironment } = require('../utils/featureFlags');
const {
  buildMembershipQrPayload,
  isMembershipQrAvailable,
} = require('../services/membershipQrService');
const { validationResult } = require('express-validator');

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

    // Validate slots limit based on vehicles
    const Vehicle = require('../models/Vehicle');
    const vehiclesCount = await Vehicle.countDocuments({ owner: req.user._id });

    // Count currently owned active slots
    const activeSubscriptions = await Subscription.find({
      user: req.user._id,
      status: 'active',
      paymentStatus: 'paid',
      expireAt: { $gt: new Date() }
    });
    const currentActiveSlots = activeSubscriptions.reduce((acc, sub) => acc + (sub.slots ? sub.slots.length : 0), 0);

    const maxSlots = Math.min(3, vehiclesCount); // User can choose up to their vehicle count, max 3
    const availableSlots = Math.max(0, maxSlots - currentActiveSlots);

    if (slots.length > availableSlots) {
      return res.status(400).json({ success: false, message: `You can only select up to ${availableSlots} additional slots based on your registered vehicles.` });
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
    
    const subscription = await Subscription.findOne({
      $or: [{ orderCode }, { 'pendingRenewal.orderCode': orderCode }],
      user: req.user._id
    });
    
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found.' });
    }

    const isRenewal = subscription.pendingRenewal && subscription.pendingRenewal.orderCode == orderCode;

    if (!isRenewal && subscription.paymentStatus === 'paid') {
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
      if (isRenewal) {
        subscription.expireAt = subscription.pendingRenewal.newExpireAt;
        subscription.status = 'active';
        subscription.expireWarningSent = false;
        subscription.pendingRenewal = undefined;
      } else {
        subscription.paymentStatus = 'paid';
        subscription.status = 'active';
      }
      
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
          {
            reservedFor: user._id,
            reservedBySubscriptionId: subscription._id,
            reservedUntil: subscription.expireAt,
          }
        );
      }

      return res.status(200).json({ success: true, message: isRenewal ? 'Subscription renewed successfully!' : 'Subscription activated successfully!' });
    } else {
      const payosInfo = await payos.paymentRequests.get(parseInt(orderCode)).catch(() => null);
      if (['CANCELLED', 'FAILED'].includes(payosInfo?.status)) {
        if (isRenewal) {
           subscription.pendingRenewal = undefined; // clear pending renewal if failed
           await subscription.save();
        } else {
           subscription.paymentStatus = payosInfo.status === 'CANCELLED' ? 'cancelled' : 'failed';
           subscription.status = payosInfo.status === 'CANCELLED' ? 'cancelled' : 'failed';
           await subscription.save();
        }
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

    // Count currently owned active slots
    const activeSubscriptions = await Subscription.find({
      user: req.user._id,
      status: 'active',
      paymentStatus: 'paid',
      expireAt: { $gt: new Date() }
    });
    const currentActiveSlots = activeSubscriptions.reduce((acc, sub) => acc + (sub.slots ? sub.slots.length : 0), 0);

    const maxSlots = Math.min(3, vehiclesCount); 
    const availableSlots = Math.max(0, maxSlots - currentActiveSlots);

    if (slots.length > availableSlots) {
      return res.status(400).json({ success: false, message: `You can only select up to ${availableSlots} additional slots based on your registered vehicles.` });
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
        {
          reservedFor: user._id,
          reservedBySubscriptionId: subscription._id,
          reservedUntil: subscription.expireAt,
        }
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
      .populate(
        'membership.packageId',
        'name type price description isActive isRenewable renewalWindowDays maxSlots'
      )
      .lean();

    const activeSubscriptions = await Subscription.find({
      user: req.user._id,
      status: 'active',
      paymentStatus: 'paid',
      expireAt: { $gt: new Date() }
    })
      .sort({ expireAt: -1 })
      .populate(
        'ticketPackage',
        'name type price description isActive isRenewable renewalWindowDays maxSlots'
      )
      .populate('slots.floorId', 'name floorNumber')
      .lean();

    const expireAt = user?.membership?.expireAt ? new Date(user.membership.expireAt) : null;
    const now = new Date();
    const isActive = Boolean(user?.membership?.isVip && expireAt && expireAt > now);
    const daysUntilExpiration = expireAt
      ? Math.ceil((expireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    // Use the latest subscription package for general info
    const latestSubscription = activeSubscriptions[0];
    const pkg = latestSubscription?.ticketPackage || user?.membership?.packageId || null;

    const renewalWindowDays = Number(pkg?.renewalWindowDays || 7);
    const canRenew = Boolean(
      isEnabled('SUBSCRIPTION_RENEWAL_ENABLED', defaultForCurrentEnvironment()) &&
      isActive &&
      latestSubscription?._id &&
      pkg?.isRenewable !== false &&
      daysUntilExpiration !== null &&
      daysUntilExpiration <= renewalWindowDays
    );

    const reservedSlots = activeSubscriptions.flatMap(sub => 
      (sub.slots || []).map(slot => ({
        floorId: slot.floorId?._id || slot.floorId,
        floorName: slot.floorId?.name || '',
        floorNumber: slot.floorId?.floorNumber || null,
        slotCode: slot.slotCode,
      }))
    );

    res.status(200).json({
      success: true,
      data: {
        isVip: isActive,
        status: isActive ? 'active' : 'expired',
        subscriptionId: latestSubscription?._id || null,
        expireAt,
        daysUntilExpiration,
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
        reservedSlots,
        benefits: isActive
          ? ['Reserved VIP parking slots', 'Priority parking access', 'Membership parking coverage']
          : [],
        renewal: {
          status: 'manual',
          nextRenewalDate: expireAt,
          price: pkg?.price || 0,
          canRenew,
          renewalWindowDays,
          message: canRenew
            ? 'Your renewal window is open. Renew now to keep your reserved spaces.'
            : 'Manual renewal opens before your membership expires.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMembershipQr = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((error) => ({
          field: error.path || error.param,
          message: error.msg,
        })),
      });
    }

    const query = { _id: req.params.subscriptionId };
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    const subscription = await Subscription.findOne(query);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    const available = isMembershipQrAvailable(subscription);
    return res.status(200).json({
      success: true,
      data: {
        available,
        membershipStatus: subscription.status,
        expireAt: subscription.expireAt,
        payload: available ? buildMembershipQrPayload(subscription) : null,
        reason: available ? null : 'MEMBERSHIP_QR_INACTIVE',
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

// Renew subscription
exports.renewSubscription = async (req, res, next) => {
  try {
    const { subscriptionId, paymentMethod } = req.body;
    
    const subscription = await Subscription.findById(subscriptionId).populate('ticketPackage');
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found.' });
    }
    
    if (subscription.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!['active', 'expired'].includes(subscription.status)) {
      return res.status(400).json({ success: false, message: 'Can only renew active or expired subscriptions.' });
    }

    const ticketPackage = subscription.ticketPackage;
    if (!ticketPackage || !ticketPackage.isActive) {
      return res.status(400).json({ success: false, message: 'Package is no longer available.' });
    }

    const amount = ticketPackage.price * Math.max(1, subscription.slots.length);
    
    // Determine the base date for renewal
    const now = new Date();
    const baseDate = (subscription.status === 'active' && subscription.expireAt > now) 
                     ? subscription.expireAt 
                     : now;
                     
    const newExpireAt = buildExpirationDate(ticketPackage.type, baseDate);

    if (paymentMethod === 'WALLET') {
      try {
        await walletService.debitWallet(req.user._id, amount, `Renew VIP Package - ${ticketPackage.type}`, {
          refSource: 'subscription_renewal',
          refSourceId: subscription._id.toString()
        });
        
        subscription.expireAt = newExpireAt;
        subscription.status = 'active';
        subscription.expireWarningSent = false;
        
        // Also update User membership and Slot reservedFor to ensure they are active
        const user = await User.findById(req.user._id);
        user.membership.isVip = true;
        user.membership.expireAt = newExpireAt;
        if (ticketPackage.type === 'yearly') {
           user.membership.freeServiceCount = 12;
        }
        await user.save();

        for (const slot of subscription.slots) {
          await Slot.updateOne(
            { floorID: slot.floorId, slotNumber: slot.slotCode },
            { reservedFor: user._id }
          );
        }

        await subscription.save();
        return res.status(200).json({ success: true, message: 'Renewed successfully via Valo Wallet.', data: subscription });
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message || 'Insufficient wallet balance.' });
      }
    } else if (paymentMethod === 'PAYOS') {
      const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 100));
      const paymentData = {
        orderCode,
        amount: parseInt(amount),
        description: `Renew VIP ${ticketPackage.type}`,
        returnUrl: process.env.PAYOS_RETURN_URL || `${process.env.CLIENT_URL}/membership?orderCode=${orderCode}`,
        cancelUrl: process.env.PAYOS_CANCEL_URL || `${process.env.CLIENT_URL}/membership?orderCode=${orderCode}&cancel=true`,
        items: [{ name: `Renew VIP ${ticketPackage.type}`, quantity: 1, price: parseInt(amount) }]
      };

      const paymentLink = await payos.paymentRequests.create(paymentData);
      
      subscription.pendingRenewal = {
        orderCode,
        newExpireAt,
        amount
      };
      await subscription.save();

      return res.status(200).json({
        success: true,
        data: {
          subscriptionId: subscription._id,
          orderCode,
          amount,
          checkoutUrl: paymentLink.checkoutUrl
        }
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

  } catch (error) {
    next(error);
  }
};
