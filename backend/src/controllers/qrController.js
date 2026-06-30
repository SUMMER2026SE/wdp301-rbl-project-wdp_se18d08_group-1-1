const crypto = require('crypto');
const QrToken = require('../models/QrToken');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Session = require('../models/Session');
const Wallet = require('../models/Wallet');

// Signature helper
function generateSignature(userId, token, expireTime) {
  const secret = process.env.JWT_SECRET || 'valo_secret_key';
  return crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${token}:${expireTime}`)
    .digest('hex');
}

/**
 * @desc    Tạo mới mã QR check-in/out bảo mật
 * @route   POST /api/qr/generate
 * @access  Private (Customer)
 */
exports.generateQrToken = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const token = crypto.randomBytes(16).toString('hex');
    const expireTime = Date.now() + 5 * 60 * 1000; // 5 phút hiệu lực

    const signature = generateSignature(userId, token, expireTime);

    // Lưu vào database để kiểm tra sử dụng 1 lần
    await QrToken.create({
      userId,
      token,
      expiresAt: new Date(expireTime),
    });

    res.status(200).json({
      success: true,
      data: {
        userId,
        token,
        expireTime,
        signature,
      },
    });
  } catch (error) {
    console.error('Error generateQrToken:', error);
    next(error);
  }
};

/**
 * @desc    Xác thực mã QR từ Kiosk
 * @route   POST /api/qr/verify
 * @access  Public (Kiosk)
 */
exports.verifyQrToken = async (req, res, next) => {
  try {
    const { userId, token, expireTime, signature } = req.body;

    if (!userId || !token || !expireTime || !signature) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu xác thực QR' });
    }

    // 1. Kiểm tra thời gian hết hạn
    if (Date.now() > Number(expireTime)) {
      return res.status(400).json({ success: false, message: 'Mã QR đã hết hạn hiệu lực (5 phút)' });
    }

    // 2. Kiểm tra chữ ký bảo mật
    const expectedSignature = generateSignature(userId, token, expireTime);
    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Chữ ký QR không hợp lệ, phát hiện giả mạo' });
    }

    // 3. Kiểm tra sử dụng 1 lần trong DB
    const qrRecord = await QrToken.findOne({ userId, token });
    if (!qrRecord) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin mã QR này' });
    }
    if (qrRecord.used) {
      return res.status(400).json({ success: false, message: 'Mã QR này đã được sử dụng trước đó' });
    }

    // Đánh dấu đã sử dụng
    qrRecord.used = true;
    await qrRecord.save();

    // 4. Tìm nạp thông tin người dùng và phương tiện
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const vehicles = await Vehicle.find({ owner: userId, status: 'approved' });
    const vehiclePlates = vehicles.map(v => v.licensePlate);

    // 5. Kiểm tra Booking PAID/ACTIVE/PAUSED
    const bookings = await Booking.find({
      userId,
      status: { $in: ['PAID', 'ACTIVE', 'PAUSED'] }
    });

    // 6. Kiểm tra các Session ACTIVE
    const activeSessions = await Session.find({
      userId,
      status: 'active'
    });

    // 7. Kiểm tra ví
    const wallet = await Wallet.findOne({ userId });

    res.status(200).json({
      success: true,
      message: 'Mã QR hợp lệ',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        vehicles,
        bookings,
        activeSessions,
        walletBalance: wallet ? wallet.balance : 0,
      }
    });

  } catch (error) {
    console.error('Error verifyQrToken:', error);
    next(error);
  }
};
