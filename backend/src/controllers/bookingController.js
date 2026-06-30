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

    if (booking.status !== 'PAID') {
      return res.status(400).json({ success: false, message: 'Chỉ được phép sửa đặt chỗ ở trạng thái PAID' });
    }

    if (booking.modificationCount >= 3) {
      return res.status(400).json({ success: false, message: 'Bạn đã đạt giới hạn 3 lần chỉnh sửa cho đặt chỗ này' });
    }

    const now = new Date();
    // Phải sửa trước giờ bắt đầu cũ ít nhất 30 phút
    const timeBeforeStartOld = booking.scheduledStart.getTime() - now.getTime();
    if (timeBeforeStartOld < 30 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Chỉ được chỉnh sửa thông tin đặt chỗ trước ít nhất 30 phút so với giờ bắt đầu ban đầu' });
    }

    const start = new Date(newStart);
    const end = new Date(newEnd);

    if (start <= now) {
      return res.status(400).json({ success: false, message: 'Thời gian mới phải ở tương lai' });
    }

    const durationMs = end - start;
    if (durationMs <= 0) {
      return res.status(400).json({ success: false, message: 'Thời gian kết thúc mới phải sau thời gian bắt đầu' });
    }

    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours < 1 || durationHours > 24) {
      return res.status(400).json({ success: false, message: 'Thời lượng mới phải từ 1 đến 24 giờ' });
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
