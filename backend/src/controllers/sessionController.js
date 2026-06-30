const Session = require('../models/Session');
const UserDetail = require('../models/UserDetail');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const ParkingFloor = require('../models/ParkingFloor');
const payos = require('../config/payos');
const cloudinary = require('../config/cloudinary');
const { sendKioskCheckInEmail, sendCheckoutEmail } = require('../utils/emailUtils');
const notifTriggers = require('../services/notificationTriggers');
const walletService = require('../services/walletService');
const pricingEngine = require('../services/pricingEngine');

/**
 * Xác thực biển số xe khi đến Kiosk
 * POST /api/sessions/verify-plate
 */
exports.verifyPlate = async (req, res, next) => {
  try {
    const { licensePlate } = req.body;
    if (!licensePlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    // 1. Kiểm tra xe đang có session ACTIVE trong bãi không
    const activeSession = await Session.findOne({ licensePlate, status: 'active' });
    if (activeSession) {
      return res.status(200).json({
        success: true,
        data: { isActive: true, phone: activeSession.phone, session: activeSession }
      });
    }

    // 2. Kiểm tra xe đăng ký chính chủ
    const registeredVehicle = await Vehicle.findOne({
      licensePlate: normalizedPlate,
      status: 'approved'
    });

    let isVIP = false;
    let isRegisteredVehicle = false;
    let phone = null;
    let userId = null;

    if (registeredVehicle) {
      isVIP = true;
      userId = registeredVehicle.owner;
      const userDetail = await UserDetail.findOne({ userId });
      if (userDetail) {
        phone = userDetail.phone;
      }

      registeredUser = await User.findById(registeredVehicle.owner);
      if (registeredUser && registeredUser.membership && registeredUser.membership.isVip && new Date(registeredUser.membership.expireAt) > new Date()) {
        isVIP = true;
      }
    }

    // Tìm SĐT trong các session cũ để tự điền (TC2/TC3)
    const pastSession = await Session.findOne({ licensePlate, phone: { $ne: null } }).sort({ checkInTime: -1 });
    if (!phone && pastSession) {
      phone = pastSession.phone;
    }

    // 3. Kiểm tra xe có Booking đang hợp lệ (PAID / PAUSED)
    const now = new Date();
    // Grace period bắt đầu check-in sớm: Giờ đặt - 15 phút đến giờ kết thúc đặt
    const booking = await Booking.findOne({
      licensePlate,
      status: { $in: ['PAID', 'PAUSED'] },
      scheduledStart: { $lte: new Date(now.getTime() + 15 * 60 * 1000) },
      scheduledEnd: { $gte: now }
    }).sort({ scheduledStart: 1 });

    const hasPreBooking = !!booking;

    res.status(200).json({
      success: true,
      data: {
        isActive: false,
        isMonthly: false, // Subs được xử lý riêng
        hasPreBooking,
        booking: booking || null,
        isVIP,
        isRegisteredVehicle,
        membershipType: membershipAccess.membershipType,
        phone: phone,
        isKnownGuest: !!phone || isVIP || isRegisteredVehicle,
        bookingId: preBooking?._id || null,
        assignedSlot: preBooking?.slotCode || membershipAccess.assignedSlot || null,
        assignedFloorId: preBooking?.floorId?._id || membershipAccess.assignedFloorId || null,
        assignedFloorName: preBooking?.floorId?.name || membershipAccess.assignedFloorName || null,
        bookingStartTime: preBooking?.startTime || null,
        bookingEndTime: preBooking?.endTime || null,
        bookingDurationHours:
          preBooking?.paidHours || (membershipAccess.isSubscriptionActive ? 24 : null),
        bookingTicketPackageId:
          preBooking?.ticketPackageId?._id || membershipAccess.ticketPackageId || null,
        bookingMode:
          preBooking?.ticketPackageId?.type === 'daily'
            ? 'daily'
            : membershipAccess.isSubscriptionActive
              ? 'daily'
              : 'hourly',
        pricingPackage: pricing.package,
        pricingSource: pricing.source,
      }
    });

  } catch (error) {
    console.error('verifyPlate error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Check-in xe từ Kiosk
 * POST /api/sessions/kiosk-entry
 */
exports.createKioskSession = async (req, res, next) => {
  try {
    const { licensePlate, phone, vehicleType, parkingSlot, floorId, durationHours, entryImageBase64, entryCamera, entryGate } = req.body;

    if (!normalizedPlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    // Đề phòng xe check-in trùng
    const existingSession = await Session.findOne({ licensePlate, status: 'active' });
    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'Phương tiện này đang có lịch sử đỗ xe hoạt động trong bãi.'
      });
    }

    const now = new Date();

    // 1. Kiểm tra Booking hợp lệ của biển số
    const activeBooking = await Booking.findOne({
      licensePlate,
      status: { $in: ['PAID', 'PAUSED'] },
      scheduledStart: { $lte: new Date(now.getTime() + 15 * 60 * 1000) },
      scheduledEnd: { $gte: now }
    }).sort({ scheduledStart: 1 });

    // 2. Kiểm tra bãi đầy (TC7)
    const floors = await ParkingFloor.find();
    let totalSlots = 0;
    for (const f of floors) {
      if (f.layoutData && f.layoutData.elements) {
        const slots = f.layoutData.elements.filter(el => ['slot', 'slot-ev', 'slot-handicap', 'slot-moto'].includes(el.type));
        totalSlots += slots.length;
      }
    }
    const activeSessionsCount = await Session.countDocuments({ status: 'active' });
    if (activeSessionsCount >= totalSlots && !activeBooking) {
      return res.status(400).json({ success: false, message: 'Bãi xe hiện đã đầy. Vui lòng quay lại sau.' });
    }

    // Tải ảnh biển số lên Cloudinary nếu có
    let entryImage_url = null;
    if (entryImageBase64) {
      try {
        const result = await cloudinary.uploader.upload(entryImageBase64, {
          folder: 'valo_parking/sessions/entry',
        });
        entryImage_url = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
      }
    }

    // Xác định User
    let userId = null;
    let userEmail = null;
    let finalPhone = phone;

    if (finalPhone) {
      const detail = await UserDetail.findOne({ phone: finalPhone }).sort({ createdAt: -1 });
      if (detail) {
        const user = await User.findById(detail.userId);
        if (user) {
          userId = user._id;
          userEmail = user.email;
        }
      }
    }

    const regVehicle = await Vehicle.findOne({ licensePlate: { $regex: new RegExp(`^${licensePlate}$`, 'i') }, status: 'approved' });
    if (regVehicle && !userId) {
      userId = regVehicle.owner;
      const user = await User.findById(userId);
      if (user) userEmail = user.email;
      const detail = await UserDetail.findOne({ userId });
      if (detail) finalPhone = detail.phone;
    }

    // Xử lý các luồng Check-in
    let sessionType = 'WALK_IN';
    let bookingId = null;
    let finalSlot = parkingSlot;
    let finalFloorId = floorId;
    let finalExpectedDuration = durationHours ? Number(durationHours) : 1;

    if (activeBooking) {
      // TC8: Khách đến sớm
      if (activeBooking.scheduledStart > now) {
        // Kiểm tra xem ô đỗ có đang bị xe khác chiếm không
        const slotOccupied = await Session.findOne({
          floorId: activeBooking.floorId,
          parkingSlot: activeBooking.parkingSlot,
          status: 'active'
        });
        if (slotOccupied) {
          return res.status(400).json({
            success: false,
            code: 'EARLY_OCCUPIED',
            message: 'Ô đỗ đặt trước của bạn hiện chưa trống. Vui lòng đợi hoặc liên hệ nhân viên để đổi ô tương đương.'
          });
        }
      }

      bookingId = activeBooking._id;
      sessionType = 'BOOKING';
      finalSlot = activeBooking.parkingSlot;
      finalFloorId = activeBooking.floorId;
      finalExpectedDuration = activeBooking.durationHours;

      // Cập nhật trạng thái Booking
      activeBooking.status = 'ACTIVE';
      await activeBooking.save();
    }

    // Tạo phiên đỗ xe Session
    const newSession = await Session.create({
      licensePlate: normalizedPlate,
      userId,
      bookingId,
      type: sessionType,
      phone: finalPhone || null,
      vehicleType: vehicleType || 'car',
      parkingSlot: finalSlot || null,
      floorId: finalFloorId || null,
      expectedDurationHours: finalExpectedDuration,
      entryImage_url,
      checkInTime: now,
      status: 'active',
      entryCamera: entryCamera || null,
      entryGate: entryGate || null,
      paymentStatus: 'unpaid'
    });

    // Gửi email check-in thành công
    if (userEmail) {
      const formattedTime = new Date(newSession.checkInTime).toLocaleString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const expectedCheckoutDate = new Date(newSession.checkInTime);
      expectedCheckoutDate.setHours(expectedCheckoutDate.getHours() + newSession.expectedDurationHours);
      const formattedCheckoutTime = expectedCheckoutDate.toLocaleString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      sendKioskCheckInEmail(userEmail, {
        sessionId: newSession._id.toString().slice(-6).toUpperCase(),
        checkInTime: formattedTime,
        expectedCheckoutTime: formattedCheckoutTime,
        duration: newSession.expectedDurationHours,
        parkingSlot: newSession.parkingSlot || 'Assigned by Kiosk',
        licensePlate: newSession.licensePlate,
        vehicleType: newSession.vehicleType
      }).catch(err => console.error('Failed to send check-in email:', err));
    }

    if (userId) {
      notifTriggers.notifyVehicleEntry(
        req.app, userId, licensePlate, finalSlot || 'N/A'
      ).catch(err => console.error('Failed to send entry notification:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Check-in thành công',
      data: newSession,
    });
  } catch (error) {
    console.error('Error creating kiosk session:', error);
    next(error);
  }
};

/**
 * Kiosk quét quét biển số Check-out (Tính toán phí dự kiến trước khi trả tiền)
 * POST /api/sessions/kiosk-exit-scan
 */
exports.kioskExitScan = async (req, res, next) => {
  try {
    const { licensePlate } = req.body;

    if (!licensePlate) {
      return res.status(400).json({ success: false, message: 'License plate is required' });
    }

    const session = await Session.findOne({ licensePlate, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên đỗ xe hoạt động của biển số này' });
    }

    const now = new Date();
    const pricing = await pricingEngine.calculatePrice(session.checkInTime, now);

    let walletBalance = 0;
    let isEarlyExit = false;
    let remainingHours = 0;
    let bookingEnd = null;

    if (session.userId) {
      const wallet = await walletService.getOrCreateWallet(session.userId);
      walletBalance = wallet.balance;
    }

    // Kiểm tra Booking trả sớm
    if (session.type === 'BOOKING' && session.bookingId) {
      const booking = await Booking.findById(session.bookingId);
      if (booking && booking.scheduledEnd > now) {
        isEarlyExit = true;
        bookingEnd = booking.scheduledEnd;
        remainingHours = Math.ceil((booking.scheduledEnd - now) / (1000 * 60 * 60));
      }
    }

    const canAutoPay = walletBalance >= pricing.finalTotal;

    res.status(200).json({
      success: true,
      data: {
        session,
        checkOutTime: now,
        durationHours: pricing.durationHours,
        totalPrice: pricing.finalTotal,
        pricingBreakdown: pricing,
        walletBalance,
        canAutoPay,
        isEarlyExit,
        remainingHours,
        bookingEnd,
      }
    });

  } catch (error) {
    console.error('Error in kioskExitScan:', error);
    next(error);
  }
};

/**
 * Xử lý Checkout và thanh toán thực tế tại Kiosk
 * POST /api/sessions/kiosk-checkout
 */
exports.kioskCheckout = async (req, res, next) => {
  try {
    const { sessionId, exitImageBase64, paymentMethod, keepPaused, exitCamera, exitGate } = req.body;

    const session = await Session.findById(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên đỗ xe hoạt động' });
    }

    const now = new Date();
    const pricing = await pricingEngine.calculatePrice(session.checkInTime, now);

    // Xử lý upload ảnh exit
    let exitImage_url = null;
    if (exitImageBase64) {
      try {
        const result = await cloudinary.uploader.upload(exitImageBase64, {
          folder: 'valo_parking/sessions/exit',
        });
        exitImage_url = result.secure_url;
      } catch (err) {
        console.error('Cloudinary upload error on exit:', err);
      }
    }

    // 1. Kiểm tra tài khoản & trừ tiền Wallet
    if (paymentMethod === 'wallet') {
      if (!session.userId) {
        return res.status(400).json({ success: false, message: 'Khách vãng lai không có ví Wallet' });
      }

      const wallet = await walletService.getOrCreateWallet(session.userId);
      if (wallet.balance < pricing.finalTotal) {
        return res.status(400).json({ success: false, message: 'Số dư ví không đủ để thanh toán' });
      }

      await walletService.debitWallet(
        session.userId,
        pricing.finalTotal,
        `Thanh toán Check-out Kiosk - Biển số ${session.licensePlate}`,
        { refSource: 'parking', refSourceId: session._id }
      );
      session.paymentStatus = 'paid';
    } else if (paymentMethod === 'vietqr') {
      // Thanh toán qua VietQR tại Kiosk
      // Tạo PayOS Payment Link cho Kiosk checkout
      const orderCode = Number(
        `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`
      );

      const paymentData = {
        orderCode,
        amount: pricing.finalTotal,
        description: `VALO Checkout`,
        returnUrl: process.env.CLIENT_URL || 'http://localhost:5173/kiosk/checkout-success',
        cancelUrl: process.env.CLIENT_URL || 'http://localhost:5173/kiosk/checkout-cancel',
        items: [
          {
            name: `Thanh toán gửi xe biển số ${session.licensePlate}`,
            quantity: 1,
            price: pricing.finalTotal,
          },
        ],
      };

      const paymentLink = await payos.paymentRequests.create(paymentData);

      // Kiosk sẽ hiển thị QR này để khách quét và thanh toán ngay
      return res.status(200).json({
        success: true,
        message: 'Vui lòng thanh toán qua VietQR để mở cổng',
        requiresPayment: true,
        data: {
          orderCode,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: paymentLink.qrCode,
        }
      });
    } else {
      // Mặc định hoặc miễn phí (ví dụ subscription)
      session.paymentStatus = 'paid';
    }

    // 2. Xử lý trả sớm Booking
    if (session.type === 'BOOKING' && session.bookingId) {
      const booking = await Booking.findById(session.bookingId);
      if (booking) {
        if (keepPaused === true) {
          // Tạm dừng: Giữ ô đỗ, đổi trạng thái Booking sang PAUSED
          booking.status = 'PAUSED';
          await booking.save();
          console.log(`Booking ${booking._id} set to PAUSED. Slot ${booking.parkingSlot} is retained.`);
        } else {
          // Kết thúc sớm hoàn toàn: Giải phóng ô đỗ, tính tiền thực tế tất cả session và hoàn tiền dư
          booking.status = 'COMPLETED';
          await booking.save();

          // Tính tổng tiền các Session đã Checkout thuộc booking này
          const prevSessions = await Session.find({ bookingId: booking._id, _id: { $ne: session._id } });
          let totalSpent = pricing.finalTotal;
          for (const s of prevSessions) {
            totalSpent += s.totalPrice;
          }

          const refundAmount = booking.prepaidAmount - totalSpent;
          if (refundAmount > 0 && booking.userId) {
            await walletService.creditWallet(
              booking.userId,
              refundAmount,
              'REFUND',
              `Hoàn tiền trả sớm Đặt chỗ ô ${booking.parkingSlot} - Xe ${booking.licensePlate}`,
              { refSource: 'booking', refSourceId: booking._id }
            );
          }
        }
      }
    }

    // 3. Hoàn tất Session đỗ xe
    session.status = 'completed';
    session.checkOutTime = now;
    session.totalPrice = pricing.finalTotal;
    session.pricingBreakdown = pricing;
    if (exitImage_url) session.exitImage_url = exitImage_url;
    if (exitCamera) session.exitCamera = exitCamera;
    if (exitGate) session.exitGate = exitGate;
    await session.save();

    // Gửi email checkout thành công
    if (session.userId) {
      try {
        const user = await User.findById(session.userId);
        if (user && user.email) {
          const formattedCheckIn = new Date(session.checkInTime).toLocaleString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short'
          });
          const formattedCheckOut = new Date(session.checkOutTime).toLocaleString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short'
          });

          sendCheckoutEmail(user.email, {
            sessionId: session._id.toString().slice(-6).toUpperCase(),
            checkInTime: formattedCheckIn,
            checkOutTime: formattedCheckOut,
            duration: `${pricing.durationHours} giờ`,
            parkingSlot: session.parkingSlot || 'Assigned by Kiosk',
            licensePlate: session.licensePlate,
            vehicleType: session.vehicleType,
            totalPrice: session.totalPrice.toLocaleString('vi-VN') + ' VND'
          }).catch(err => console.error('Failed to send Checkout email:', err));
        }
      } catch (err) {
        console.error('Error fetching user for checkout email:', err);
      }

      // Gửi thông báo đẩy về App
      const uid = session.userId._id || session.userId;
      notifTriggers.notifyVehicleExit(
        req.app, uid, session.licensePlate, pricing.finalTotal
      ).catch(err => console.error('Failed to send exit notification:', err));

      if (paymentMethod === 'wallet') {
        notifTriggers.notifyPaymentSuccess(
          req.app, uid, pricing.finalTotal, session._id.toString()
        ).catch(err => console.error('Failed to send payment notification:', err));
      }
    }

    res.status(200).json({
      success: true,
      message: 'Checkout hoàn tất thành công, Barrier đã mở',
      data: session
    });

  } catch (error) {
    console.error('Error in kioskCheckout:', error);
    next(error);
  }
};

/**
 * Lấy lịch sử tất cả các Session (Staff/Admin)
 * GET /api/sessions
 */
exports.getAllSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find().sort({ checkInTime: -1 });
    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    next(error);
  }
};

/**
 * Lấy lịch sử đỗ xe của cá nhân User
 * GET /api/sessions/my-history
 */
exports.getMyHistory = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ checkInTime: -1 });
    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error getting my history:', error);
    next(error);
  }
};

/**
 * Trạng thái bãi đỗ xe trực tiếp (Active)
 * GET /api/sessions/active-status
 */
exports.getActiveParkingStatus = async (req, res, next) => {
  try {
    const activeSessions = await Session.find({ status: 'active', parkingSlot: { $ne: null } })
      .select('licensePlate parkingSlot floorId vehicleType checkInTime expectedDurationHours phone userId')
      .populate('userId', 'email username');

    res.status(200).json({
      success: true,
      data: activeSessions,
    });
  } catch (error) {
    console.error('Error getting active parking status:', error);
    next(error);
  }
};
