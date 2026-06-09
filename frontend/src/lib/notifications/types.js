export const PRIORITY = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
  SYSTEM: "SYSTEM",
};

export const PRIORITY_META = {
  INFO: {
    label: "Thông tin",
    badge: "bg-sky-500/10 text-sky-300",
    ring: "ring-sky-500/20",
  },
  SUCCESS: {
    label: "Thành công",
    badge: "bg-emerald-500/10 text-emerald-300",
    ring: "ring-emerald-500/20",
  },
  WARNING: {
    label: "Cảnh báo",
    badge: "bg-amber-500/10 text-amber-300",
    ring: "ring-amber-500/20",
  },
  ERROR: {
    label: "Lỗi",
    badge: "bg-red-500/10 text-red-300",
    ring: "ring-red-500/20",
  },
  SYSTEM: {
    label: "Hệ thống",
    badge: "bg-violet-500/10 text-violet-300",
    ring: "ring-violet-500/20",
  },
};

export const TARGET_OPTIONS = [
  { value: "all", label: "Toàn bộ hệ thống" },
  { value: "single", label: "Một Khách Hàng" },
  { value: "multi", label: "Nhiều Khách Hàng" },
];

export const DEFAULT_TEMPLATES = [
  {
    id: "tmpl_welcome",
    name: "Chào mừng",
    title: "Chào mừng bạn đến Valo Parking",
    message:
      "Cảm ơn bạn đã đăng ký. Chúng tôi sẽ hỗ trợ bạn tối ưu trải nghiệm đỗ xe ngay lập tức.",
    priority: PRIORITY.INFO,
  },
  {
    id: "tmpl_overflow",
    name: "Cảnh báo dư dự",
    title: "Cảnh báo: Bãi đậu xe sắp đầy",
    message:
      "Thông báo đến toàn bộ người dùng: số lượng chỗ trống hiện tại đang ở mức thấp. Vui lòng cân nhắc chọn vị trí khác.",
    priority: PRIORITY.WARNING,
  },
  {
    id: "tmpl_system",
    name: "Bảo trì hệ thống",
    title: "Thông báo bảo trì hệ thống",
    message:
      "Hệ thống sẽ tạm ngưng trong 30 phút để nâng cấp. Mọi thao tác sẽ được phục hồi ngay khi bảo trì xong.",
    priority: PRIORITY.SYSTEM,
  },
];

export const AUTO_RULES = [
  { eventKey: "account_signup", group: "Tài khoản", name: "Đăng ký thành công", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 30, lastTriggeredAt: null },
  { eventKey: "account_email_verified", group: "Tài khoản", name: "Email đã xác minh", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 45, lastTriggeredAt: null },
  { eventKey: "account_password_changed", group: "Tài khoản", name: "Mật khẩu đã thay đổi", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 60, lastTriggeredAt: null },
  { eventKey: "account_locked", group: "Tài khoản", name: "Tài khoản bị khóa", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "account_unlocked", group: "Tài khoản", name: "Tài khoản đã mở khóa", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },

  { eventKey: "wallet_topup_success", group: "Ví", name: "Nạp tiền thành công", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "wallet_topup_failed", group: "Ví", name: "Nạp tiền thất bại", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "wallet_refund", group: "Ví", name: "Hoàn tiền", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 30, lastTriggeredAt: null },
  { eventKey: "wallet_payment_success", group: "Ví", name: "Thanh toán thành công", enabled: true, channels: ["In-app"], throttleMinutes: 15, lastTriggeredAt: null },
  { eventKey: "wallet_payment_failed", group: "Ví", name: "Thanh toán thất bại", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 15, lastTriggeredAt: null },
  { eventKey: "wallet_low_balance", group: "Ví", name: "Số dư thấp", enabled: true, channels: ["In-app"], throttleMinutes: 60, lastTriggeredAt: null },

  { eventKey: "booking_created", group: "Đặt chỗ", name: "Booking created", enabled: true, channels: ["In-app"], throttleMinutes: 20, lastTriggeredAt: null }
  { eventKey: "booking_confirmed", group: "Đặt chỗ", name: "Booking confirmed", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "booking_cancelled", group: "Đặt chỗ", name: "Booking cancelled", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "checkin", group: "Đặt chỗ", name: "Checkin", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "checkout", group: "Đặt chỗ", name: "Checkout", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "booking_reminder", group: "Đặt chỗ", name: "Booking reminder", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 30, lastTriggeredAt: null },

  { eventKey: "parking_spot_reserved", group: "Đỗ xe", name: "Vị trí đã chỉ dụng", enabled: true, channels: ["In-app"], throttleMinutes: 15, lastTriggeredAt: null },
  { eventKey: "parking_almost_expired", group: "Đỗ xe", name: "Sắp hết hạn đỗ xe", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null }
  { eventKey: "parking_overdue", group: "Đỗ xe", name: "Quá hạn đỗ xe", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "parking_vehicle_detected", group: "Đỗ xe", name: "Phát hiện xe", enabled: true, channels: ["In-app"], throttleMinutes: 20, lastTriggeredAt: null }

  { eventKey: "system_maintenance", group: "Hệ thống", name: "Bảo trì", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 60, lastTriggeredAt: null },
  { eventKey: "system_feature_release", group: "Hệ thống", name: "Tính năng mới", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 120, lastTriggeredAt: null },
  { eventKey: "system_security_alert", group: "Hệ thống", name: "Cảnh báo bảo mật", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 30, lastTriggeredAt: null },
  { eventKey: "system_broadcast", group: "Hệ thống", name: "Phát sóng", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null }
];
