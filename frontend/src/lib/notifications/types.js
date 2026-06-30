export const PRIORITY = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
  SYSTEM: "SYSTEM",
};

export const PRIORITY_META = {
  INFO: {
    label: "Info",
    badge: "bg-sky-500/10 text-sky-300",
    ring: "ring-sky-500/20",
  },
  SUCCESS: {
    label: "Success",
    badge: "bg-emerald-500/10 text-emerald-300",
    ring: "ring-emerald-500/20",
  },
  WARNING: {
    label: "Warning",
    badge: "bg-amber-500/10 text-amber-300",
    ring: "ring-amber-500/20",
  },
  ERROR: {
    label: "Error",
    badge: "bg-red-500/10 text-red-300",
    ring: "ring-red-500/20",
  },
  SYSTEM: {
    label: "System",
    badge: "bg-violet-500/10 text-violet-300",
    ring: "ring-violet-500/20",
  },
};

export const TARGET_OPTIONS = [
  { value: "all", label: "Entire system" },
  { value: "single", label: "One Customer" },
  { value: "multi", label: "Multiple Customers" },
];

export const DEFAULT_TEMPLATES = [
  {
    id: "tmpl_welcome",
    name: "Welcome",
    title: "Welcome to Valo Parking",
    message:
      "Thank you for registering. We will help you optimize your parking experience immediately.",
    priority: PRIORITY.INFO,
  },
  {
    id: "tmpl_overflow",
    name: "Capacity warning",
    title: "Warning: Parking lot is almost full",
    message:
      "Notice to all users: the current number of available spaces is low. Please consider choosing another location.",
    priority: PRIORITY.WARNING,
  },
  {
    id: "tmpl_system",
    name: "System maintenance",
    title: "System maintenance notice",
    message:
      "The system will pause for 30 minutes for an upgrade. All operations will resume after maintenance.",
    priority: PRIORITY.SYSTEM,
  },
];

export const AUTO_RULES = [
  { eventKey: "account_signup", group: "Account", name: "Registration successful", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 30, lastTriggeredAt: null },
  { eventKey: "account_email_verified", group: "Account", name: "Email verified", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 45, lastTriggeredAt: null },
  { eventKey: "account_password_changed", group: "Account", name: "Password changed", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 60, lastTriggeredAt: null },
  { eventKey: "account_locked", group: "Account", name: "Account locked", enabled: true, channels: ["In-app", "Email", "SMS"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "account_unlocked", group: "Account", name: "Account unlocked", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },

  { eventKey: "wallet_topup_success", group: "Wallet", name: "Top-up successful", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "wallet_topup_failed", group: "Wallet", name: "Top-up failed", enabled: true, channels: ["In-app", "Email", "SMS"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "wallet_refund", group: "Wallet", name: "Refund", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 30, lastTriggeredAt: null },
  { eventKey: "wallet_payment_success", group: "Wallet", name: "Payment successful", enabled: true, channels: ["In-app"], throttleMinutes: 15, lastTriggeredAt: null },
  { eventKey: "wallet_payment_failed", group: "Wallet", name: "Payment failed", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 15, lastTriggeredAt: null },
  { eventKey: "wallet_low_balance", group: "Wallet", name: "Low balance", enabled: true, channels: ["In-app", "SMS"], throttleMinutes: 60, lastTriggeredAt: null },

  { eventKey: "booking_created", group: "Booking", name: "Booking created", enabled: true, channels: ["In-app"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "booking_confirmed", group: "Booking", name: "Booking confirmed", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "booking_cancelled", group: "Booking", name: "Booking cancelled", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 20, lastTriggeredAt: null },
  { eventKey: "checkin", group: "Booking", name: "Checkin", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "checkout", group: "Booking", name: "Checkout", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "booking_reminder", group: "Booking", name: "Booking reminder", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 30, lastTriggeredAt: null },

  { eventKey: "parking_spot_reserved", group: "Parking", name: "Spot reserved", enabled: true, channels: ["In-app", "SMS"], throttleMinutes: 15, lastTriggeredAt: null },
  { eventKey: "parking_almost_expired", group: "Parking", name: "Parking almost expired", enabled: true, channels: ["In-app", "Push"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "parking_overdue", group: "Parking", name: "Parking overdue", enabled: true, channels: ["In-app", "SMS"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "parking_vehicle_detected", group: "Parking", name: "Vehicle detected", enabled: true, channels: ["In-app", "Push"], throttleMinutes: 20, lastTriggeredAt: null },

  { eventKey: "system_maintenance", group: "System", name: "Maintenance", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 60, lastTriggeredAt: null },
  { eventKey: "system_feature_release", group: "System", name: "New feature", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 120, lastTriggeredAt: null },
  { eventKey: "system_security_alert", group: "System", name: "Security warning", enabled: true, channels: ["In-app", "Email", "SMS"], throttleMinutes: 30, lastTriggeredAt: null },
  { eventKey: "system_broadcast", group: "System", name: "Broadcast", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null },
];
