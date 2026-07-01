const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const ParkingFloor = require('../models/ParkingFloor');
const payos = require('../config/payos');
const walletService = require('../services/walletService');
const pricingEngine = require('../services/pricingEngine');
const notifTriggers = require('../services/notificationTriggers');

/**
 * @desc    Tạo mới đặt chỗ (Booking)
 * @route   POST /api/bookings
 * @access  Private (Customer)
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { vehicleId, floorId, parkingSlot, scheduledStart, scheduledEnd, paymentMethod } = req.body;
    const userId = req.user._id;

    if (!vehicleId || !floorId || !parkingSlot || !scheduledStart || !scheduledEnd || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // 1. Kiểm tra xe đăng ký
    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: userId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy xe hợp lệ của bạn' });
    }

    // 2. Validate thời gian
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    const now = new Date();

    if (start <= now) {
      return res.status(400).json({ success: false, message: 'Giờ bắt đầu phải ở tương lai' });
    }

    const durationMs = end - start;
    if (durationMs <= 0) {
      return res.status(400).json({ success: false, message: 'Giờ kết thúc phải lớn hơn giờ bắt đầu' });
    }

    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours < 1) {
      return res.status(400).json({ success: false, message: 'Thời lượng tối thiểu là 1 giờ' });
    }
    if (durationHours > 24) {
      return res.status(400).json({ success: false, message: 'Thời lượng tối đa cho mỗi đặt chỗ là 24 giờ' });
    }

    // 3. Kiểm tra chồng lấn Booking của chính chiếc xe này
    const overlappingBooking = await Booking.findOne({
      vehicleId,
      status: { $in: ['PAID', 'ACTIVE', 'PAUSED'] },
      scheduledStart: { $lt: end },
      scheduledEnd: { $gt: start },
    });

    if (overlappingBooking) {
      return res.status(400).json({ success: false, message: 'Phương tiện này đã có lịch đặt chỗ khác trùng thời gian' });
    }

    // 3.5. Kiểm tra ô đỗ có thuộc Subscription (Gói tháng/năm) không
    const Subscription = require('../models/Subscription');
    const isSubscriptionSlot = await Subscription.findOne({
      'slots.slotCode': parkingSlot,
      status: 'active',
      expireAt: { $gt: start }
    });
    if (isSubscriptionSlot) {
      return res.status(400).json({ success: false, message: 'Ô đỗ này đã được đăng ký gói thuê bao cố định và không thể đặt chỗ.' });
    }

    // 3.6. Kiểm tra ô đỗ có bị người khác Booking trùng giờ không
    const slotOverlapBooking = await Booking.findOne({
      floorId,
      parkingSlot,
      status: { $in: ['PAID', 'ACTIVE', 'PAUSED'] },
      scheduledStart: { $lt: end },
      scheduledEnd: { $gt: start }
    });
    if (slotOverlapBooking) {
      return res.status(400).json({ success: false, message: 'Ô đỗ này đã có người đặt trong khung giờ bạn chọn.' });
    }

    // 4. Tính toán phí trước dựa trên pricingEngine
    const pricing = await pricingEngine.calculatePrice(start, end);
    const prepaidAmount = pricing.finalTotal;

    // 5. Khởi tạo đặt chỗ
    const newBooking = new Booking({
      userId,
      vehicleId,
      licensePlate: vehicle.licensePlate,
      floorId,
      parkingSlot,
      scheduledStart: start,
      scheduledEnd: end,
      durationHours: pricing.durationHours,
      prepaidAmount,
      paymentMethod,
      status: 'PENDING',
    });

    if (paymentMethod === 'wallet') {
      // Thanh toán qua Ví
      const wallet = await walletService.getOrCreateWallet(userId);
      if (wallet.balance < prepaidAmount) {
        return res.status(400).json({ success: false, message: 'Số dư ví không đủ, vui lòng nạp thêm tiền hoặc chọn thanh toán VietQR' });
      }

      // Trừ tiền
      await walletService.debitWallet(
        userId,
        prepaidAmount,
        `Thanh toán Đặt chỗ ô đỗ ${parkingSlot} - Xe ${vehicle.licensePlate}`,
        { refSource: 'booking', refSourceId: newBooking._id }
      );

      newBooking.status = 'PAID';
      await newBooking.save();

      // Gửi thông báo
      notifTriggers.notifyBookingSuccess(req.app, userId, {
        bookingId: newBooking._id.toString(),
        slotInfo: `${parkingSlot}`
      }).catch(err => console.error('Error sending notifyBookingSuccess:', err));

      return res.status(201).json({
        success: true,
        message: 'Đặt chỗ thành công',
        data: newBooking,
      });

    } else if (paymentMethod === 'vietqr') {
      // Thanh toán qua VietQR (payOS)
      const orderCode = Number(
        `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`
      );

      const paymentData = {
        orderCode,
        amount: prepaidAmount,
        description: `VALO Booking`,
        returnUrl: process.env.CLIENT_URL || 'http://localhost:5173/customer/bookings',
        cancelUrl: process.env.CLIENT_URL || 'http://localhost:5173/customer/bookings?cancel=true',
        items: [
          {
            name: `Đặt chỗ ô ${parkingSlot} xe ${vehicle.licensePlate}`,
            quantity: 1,
            price: prepaidAmount,
          },
        ],
      };

      const paymentLink = await payos.paymentRequests.create(paymentData);

      newBooking.vietqrOrderCode = orderCode;
      newBooking.vietqrPaymentLinkId = paymentLink.paymentLinkId;
      await newBooking.save();

      return res.status(201).json({
        success: true,
        message: 'Yêu cầu thanh toán VietQR đã được tạo',
        data: {
          bookingId: newBooking._id,
          orderCode,
          amount: prepaidAmount,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: paymentLink.qrCode,
        },
      });
    }

    return res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });

  } catch (error) {
    console.error('Error in createBooking:', error);
    next(error);
  }
};

/**
 * @desc    Xác thực trạng thái thanh toán VietQR
 * @route   GET /api/bookings/status/:orderCode
 * @access  Private
 */
exports.checkVietQRStatus = async (req, res, next) => {
  try {
    const { orderCode } = req.params;
    const booking = await Booking.findOne({ vietqrOrderCode: Number(orderCode), userId: req.user._id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đặt chỗ tương ứng' });
    }

    if (booking.status === 'PAID') {
      return res.status(200).json({ success: true, status: 'PAID', data: booking });
    }

    if (booking.status === 'PENDING') {
      try {
        const payosInfo = await payos.paymentRequests.get(Number(orderCode));
        if (payosInfo.status === 'PAID') {
          booking.status = 'PAID';
          await booking.save();

          // Gửi thông báo
          notifTriggers.notifyBookingSuccess(req.app, booking.userId, {
            bookingId: booking._id.toString(),
            slotInfo: `${booking.parkingSlot}`
          }).catch(err => console.error('Error sending notifyBookingSuccess:', err));

          return res.status(200).json({ success: true, status: 'PAID', data: booking });
        } else if (['CANCELLED', 'EXPIRED'].includes(payosInfo.status)) {
          booking.status = 'CANCELLED';
          await booking.save();
          return res.status(200).json({ success: true, status: 'CANCELLED', data: booking });
        }
      } catch (payosError) {
        console.error('Error checking PayOS status:', payosError.message);
      }
    }

    res.status(200).json({ success: true, status: booking.status, data: booking });
  } catch (error) {
    console.error('Error checkVietQRStatus:', error);
    next(error);
  }
};

/**
 * @desc    Webhook nhận callback từ payOS
 * @route   POST /api/bookings/webhook
 * @access  Public
 */
exports.handleBookingWebhook = async (req, res, next) => {
  try {
    let webhookData;
    try {
      webhookData = await payos.webhooks.verify(req.body);
    } catch (verifyError) {
      console.error('❌ Webhook signature verification failed:', verifyError.message);
      return res.status(400).json({ message: 'Invalid signature' });
    }

    if (['Ma giao dich thu nghiem', 'VQRIO123'].includes(webhookData.description)) {
      return res.status(200).json({ message: 'OK - Test webhook' });
    }

    const { orderCode, code } = webhookData;

    if (code === '00') {
      const booking = await Booking.findOne({ vietqrOrderCode: orderCode, status: 'PENDING' });
      if (booking) {
        booking.status = 'PAID';
        await booking.save();

        // Gửi thông báo đặt chỗ thành công
        notifTriggers.notifyBookingSuccess(req.app, booking.userId, {
          bookingId: booking._id.toString(),
          slotInfo: `${booking.parkingSlot}`
        }).catch(err => console.error('Failed to notify success:', err));

        console.log(`✅ Webhook: Booking ${booking._id} paid successfully.`);
      }
    }

    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(200).json({ message: 'OK' }); // Always acknowledge to prevent retries
  }
};

/**
 * @desc    Hủy Đặt chỗ trước giờ Check-in
 * @route   POST /api/bookings/:id/cancel
 * @access  Private (Customer)
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đặt chỗ' });
    }

    if (booking.status !== 'PAID') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đặt chỗ khi trạng thái là PAID' });
    }

    const now = new Date();
    if (booking.scheduledStart <= now) {
      return res.status(400).json({ success: false, message: 'Không thể hủy sau giờ bắt đầu đặt chỗ' });
    }

    // Hoàn tiền đặt chỗ vào Wallet (kể cả thanh toán trước đó bằng VietQR)
    if (booking.prepaidAmount > 0) {
      await walletService.creditWallet(
        req.user._id,
        booking.prepaidAmount,
        'REFUND',
        `Hoàn tiền hủy đặt chỗ ô ${booking.parkingSlot} - Xe ${booking.licensePlate}`,
        { refSource: 'booking', refSourceId: booking._id }
      );
    }

    booking.status = 'CANCELLED';
    await booking.save();

    // Gửi thông báo hủy thành công
    notifTriggers.notifyBookingCancelled(req.app, req.user._id, {
      bookingId: booking._id.toString(),
      slotInfo: booking.parkingSlot,
      reason: 'Khách yêu cầu hủy đặt chỗ'
    }).catch(err => console.error('Failed to notify cancel:', err));

    res.status(200).json({
      success: true,
      message: 'Hủy đặt chỗ thành công, tiền đặt trước đã được hoàn vào ví của bạn',
      data: booking,
    });
  } catch (error) {
    console.error('Error cancelBooking:', error);
    next(error);
  }
};

/**
 * @desc    Chỉnh sửa thời gian đặt chỗ trước khi Check-in
 * @route   PUT /api/bookings/:id/time
 * @access  Private (Customer)
 */
exports.modifyBookingTime = async (req, res, next) => {
  try {
    const { newStart, newEnd } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đặt chỗ' });
    }

    if (!['PAID', 'ACTIVE', 'PAUSED'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Chỉ được phép sửa đặt chỗ ở trạng thái PAID, ACTIVE hoặc PAUSED' });
    }

    if (booking.modificationCount >= 3) {
      return res.status(400).json({ success: false, message: 'Bạn đã đạt giới hạn 3 lần chỉnh sửa cho đặt chỗ này' });
    }

    const now = new Date();
    
    // Nếu chưa Check-in (PAID), cho phép sửa cả Start (nhưng phải sửa trước giờ bắt đầu 30 phút)
    if (booking.status === 'PAID') {
      const timeBeforeStartOld = booking.scheduledStart.getTime() - now.getTime();
      if (timeBeforeStartOld < 30 * 60 * 1000) {
        return res.status(400).json({ success: false, message: 'Chỉ được chỉnh sửa thông tin đặt chỗ trước ít nhất 30 phút so với giờ bắt đầu ban đầu' });
      }
    }

    // Nếu đang trong bãi (ACTIVE / PAUSED), không được đổi Start
    const start = booking.status === 'PAID' ? new Date(newStart) : booking.scheduledStart;
    const end = new Date(newEnd);

    if (booking.status === 'PAID' && start <= now) {
      return res.status(400).json({ success: false, message: 'Thời gian mới phải ở tương lai' });
    }

    const durationMs = end.getTime() - start.getTime();
    if (durationMs <= 0 || end <= now) {
      return res.status(400).json({ success: false, message: 'Thời gian kết thúc mới không hợp lệ' });
    }

    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours < 1 || durationHours > 24) {
      return res.status(400).json({ success: false, message: 'Thời lượng tổng cộng phải từ 1 đến 24 giờ' });
    }

    // Kiểm tra ô đỗ có thuộc Subscription (Gói tháng/năm) không
    const Subscription = require('../models/Subscription');
    const isSubscriptionSlot = await Subscription.findOne({
      'slots.slotCode': booking.parkingSlot,
      status: 'active',
      expireAt: { $gt: start }
    });
    if (isSubscriptionSlot) {
      return res.status(400).json({ success: false, message: 'Ô đỗ này đã được đăng ký gói thuê bao cố định, không thể đổi sang giờ này.' });
    }

    // Kiểm tra chồng lấn Slot ô đỗ mới/cũ trong khoảng thời gian mới (trừ chính booking hiện tại)
    const slotOverlap = await Booking.findOne({
      _id: { $ne: booking._id },
      floorId: booking.floorId,
      parkingSlot: booking.parkingSlot,
      status: { $in: ['PAID', 'ACTIVE', 'PAUSED'] },
      scheduledStart: { $lt: end },
      scheduledEnd: { $gt: start }
    });

    if (slotOverlap) {
      return res.status(400).json({ success: false, message: 'Ô đỗ đã có lịch đặt chỗ khác trong khung giờ mới này' });
    }

    // Tính phí lại
    const pricing = await pricingEngine.calculatePrice(start, end);
    const newPrice = pricing.finalTotal;
    const diff = newPrice - booking.prepaidAmount;

    if (diff > 0) {
      // Cần đóng thêm tiền -> chỉ hỗ trợ trừ tiền Wallet (phải nạp trước)
      const wallet = await walletService.getOrCreateWallet(req.user._id);
      if (wallet.balance < diff) {
        return res.status(400).json({ success: false, message: `Thời gian mới phát sinh thêm phí ${diff.toLocaleString()}đ, số dư ví không đủ. Vui lòng nạp thêm tiền vào ví trước.` });
      }

      await walletService.debitWallet(
        req.user._id,
        diff,
        `Thu phí bổ sung sửa giờ đặt chỗ ô ${booking.parkingSlot} - Xe ${booking.licensePlate}`,
        { refSource: 'booking', refSourceId: booking._id }
      );
    } else if (diff < 0) {
      // Hoàn lại tiền thừa
      const refundAmount = Math.abs(diff);
      await walletService.creditWallet(
        req.user._id,
        refundAmount,
        'REFUND',
        `Hoàn tiền dư sửa giờ đặt chỗ ô ${booking.parkingSlot} - Xe ${booking.licensePlate}`,
        { refSource: 'booking', refSourceId: booking._id }
      );
    }

    booking.scheduledStart = start;
    booking.scheduledEnd = end;
    booking.durationHours = pricing.durationHours;
    booking.prepaidAmount = newPrice;
    booking.modificationCount += 1;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật thời gian đặt chỗ thành công',
      data: booking,
    });
  } catch (error) {
    console.error('Error modifyBookingTime:', error);
    next(error);
  }
};

/**
 * @desc    Lấy danh sách đặt chỗ của User
 * @route   GET /api/bookings/my-history
 * @access  Private (Customer)
 */
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error getMyBookings:', error);
    next(error);
  }
};

/**
 * @desc    Thay đổi phương tiện (Biển số xe) cho Đặt chỗ trước giờ Check-in
 * @route   PUT /api/bookings/:id/vehicle
 * @access  Private (Customer)
 */
exports.updateBookingVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đặt chỗ' });
    }

    if (booking.status !== 'PAID') {
      return res.status(400).json({ success: false, message: 'Chỉ được phép đổi xe ở trạng thái PAID (chưa check-in)' });
    }

    const now = new Date();
    if (booking.scheduledStart <= now) {
      return res.status(400).json({ success: false, message: 'Không thể đổi xe sau khi thời gian đặt chỗ đã bắt đầu' });
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: req.user._id, status: 'approved' });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy xe hợp lệ của bạn' });
    }

    // Kiểm tra xe mới đã có booking trùng lặp không
    const overlappingBooking = await Booking.findOne({
      _id: { $ne: booking._id },
      vehicleId,
      status: { $in: ['PAID', 'ACTIVE', 'PAUSED'] },
      scheduledStart: { $lt: booking.scheduledEnd },
      scheduledEnd: { $gt: booking.scheduledStart },
    });

    if (overlappingBooking) {
      return res.status(400).json({ success: false, message: 'Xe mới đã có lịch đặt chỗ khác trùng thời gian' });
    }

    booking.vehicleId = vehicle._id;
    booking.licensePlate = vehicle.licensePlate;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Đổi phương tiện cho đặt chỗ thành công',
      data: booking,
    });
  } catch (error) {
    console.error('Error updateBookingVehicle:', error);
    next(error);
  }
};

/**
 * @desc    Gợi ý ô đỗ thông minh cho Kiosk / App
 * @route   GET /api/bookings/suggest-slot
 * @access  Public
 */
exports.suggestSmartSlot = async (req, res, next) => {
  try {
    const { vehicleType } = req.query; // 'car', 'electric_car', 'motorcycle'
    
    // Thuật toán: Lấy tất cả Slot, loại bỏ những slot đang Occupied, Reserved, Maintenance hoặc có Booking trong 2h tới.
    const Session = require('../models/Session');
    const ParkingFloor = require('../models/ParkingFloor');
    
    const activeSessions = await Session.find({ status: 'active', parkingSlot: { $ne: null } });
    const activeSlots = activeSessions.map(s => s.parkingSlot);
    
    const now = new Date();
    const next2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const bookings = await Booking.find({
      status: { $in: ['PAID', 'PAUSED'] },
      scheduledStart: { $lt: next2Hours },
      scheduledEnd: { $gt: now }
    });
    const bookedSlots = bookings.map(b => b.parkingSlot);
    
    const unavailableSlots = new Set([...activeSlots, ...bookedSlots]);
    
    const floors = await ParkingFloor.find();
    let suggestedSlot = null;
    let fallbackSlot = null;
    
    for (const f of floors) {
      if (f.layoutData && f.layoutData.elements) {
        const slots = f.layoutData.elements.filter(el => {
           if (unavailableSlots.has(el.id)) return false;
           if (vehicleType === 'electric_car' && el.type !== 'slot-ev' && el.type !== 'slot') return false;
           if (vehicleType === 'motorcycle' && el.type !== 'slot-moto') return false;
           if (vehicleType === 'car' && el.type !== 'slot' && el.type !== 'slot-vip') return false;
           return ['slot', 'slot-ev', 'slot-vip', 'slot-moto'].includes(el.type);
        });
        
        if (slots.length > 0) {
          // Ưu tiên slot-vip nếu là VIP, hoặc ưu tiên gần cổng (có thể mô phỏng bằng cách lấy slot đầu tiên)
          const evSlot = slots.find(s => s.type === 'slot-ev');
          if (vehicleType === 'electric_car' && evSlot) {
            suggestedSlot = evSlot;
          } else {
            suggestedSlot = slots[0];
          }
          
          if (suggestedSlot) {
            suggestedSlot.floorId = f._id;
            suggestedSlot.floorName = f.name;
            break;
          }
        }
      }
    }
    
    if (!suggestedSlot) {
       return res.status(404).json({ success: false, message: 'Bãi xe hiện tại đã đầy hoặc không có ô phù hợp' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Gợi ý ô đỗ thành công',
      data: suggestedSlot,
    });
  } catch (error) {
    console.error('Error suggestSmartSlot:', error);
    next(error);
  }
};

/**
 * @desc    Tạo BookingHold (Khóa ô đỗ tạm thời trong 5 phút)
 * @route   POST /api/bookings/hold
 * @access  Private (Customer)
 */
exports.createBookingHold = async (req, res, next) => {
  try {
    const { floorId, slotCode, licensePlate } = req.body;
    
    if (!floorId || !slotCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp floorId và slotCode' });
    }

    const BookingHold = require('../models/BookingHold');
    const Session = require('../models/Session');
    const now = new Date();

    // Kiểm tra xem ô có đang bị ai đó hold không
    const existingHold = await BookingHold.findOne({
      floorId,
      slotCode,
      status: 'active',
      expiresAt: { $gt: now }
    });

    if (existingHold) {
      const isOwner = req.user && existingHold.userId && existingHold.userId.toString() === req.user._id.toString();
      if (!isOwner) {
        return res.status(400).json({ success: false, message: 'Ô đỗ này đang được người khác giữ chỗ tạm thời. Vui lòng chọn ô khác.' });
      }
    }

    // Kiểm tra xem ô đỗ có đang có xe đỗ không
    const slotOccupied = await Session.findOne({
      floorId,
      parkingSlot: slotCode,
      status: 'active'
    });

    if (slotOccupied) {
      return res.status(400).json({ success: false, message: 'Ô đỗ này hiện đã có xe đỗ' });
    }

    // Kiểm tra xem ô đỗ có booking nào sắp diễn ra không
    const next2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const overlappingBooking = await Booking.findOne({
      floorId,
      parkingSlot: slotCode,
      status: { $in: ['PAID', 'PAUSED'] },
      scheduledStart: { $lt: next2Hours },
      scheduledEnd: { $gt: now }
    });

    if (overlappingBooking) {
      return res.status(400).json({ success: false, message: 'Ô đỗ này đã có lịch đặt trước. Vui lòng chọn ô khác.' });
    }

    // Xóa các Hold cũ của user này để tránh spam hold nhiều ô (nếu có tài khoản)
    if (req.user) {
      await BookingHold.updateMany(
        { userId: req.user._id, status: 'active' },
        { status: 'released' }
      );
    } else if (licensePlate) {
      // Nếu là khách vãng lai nhưng có biển số, xóa hold cũ theo biển số
      await BookingHold.updateMany(
        { licensePlate, status: 'active' },
        { status: 'released' }
      );
    }

    // Tạo hold mới
    const holdDurationMs = 5 * 60 * 1000; // 5 phút
    const newHold = await BookingHold.create({
      userId: req.user ? req.user._id : undefined,
      floorId,
      slotCode,
      licensePlate: licensePlate || '',
      startTime: now,
      endTime: new Date(now.getTime() + holdDurationMs),
      expiresAt: new Date(now.getTime() + holdDurationMs),
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Khóa ô đỗ tạm thời thành công (5 phút)',
      data: newHold
    });

  } catch (error) {
    console.error('Error createBookingHold:', error);
    next(error);
  }
};
