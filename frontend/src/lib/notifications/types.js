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
  { eventKey: "account.registered", group: "Account", name: "Registration successful", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 30, lastTriggeredAt: null },
  { eventKey: "account.email_verified", group: "Account", name: "Email verified successfully", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 45, lastTriggeredAt: null },
  { eventKey: "account.password_changed", group: "Account", name: "Password changed", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 60, lastTriggeredAt: null },
  { eventKey: "account.locked", group: "Account", name: "Account locked", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "account.unlocked", group: "Account", name: "Account unlocked", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },

  { eventKey: "wallet.topup_success", group: "Wallet", name: "Top-up successful", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 5, lastTriggeredAt: null },
  { eventKey: "wallet.topup_failed", group: "Wallet", name: "Top-up failed", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 5, lastTriggeredAt: null },
  { eventKey: "wallet.payment_success", group: "Wallet", name: "Payment successful", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 5, lastTriggeredAt: null },
  { eventKey: "wallet.payment_failed", group: "Wallet", name: "Payment failed", enabled: true, channels: ["In-app"], throttleMinutes: 5, lastTriggeredAt: null },
  { eventKey: "wallet.refund_success", group: "Wallet", name: "Refund successful", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "wallet.low_balance", group: "Wallet", name: "Low balance", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 60, lastTriggeredAt: null },

  { eventKey: "parking.entry", group: "Parking", name: "Vehicle entry", enabled: true, channels: ["In-app"], throttleMinutes: 5, lastTriggeredAt: null },
  { eventKey: "parking.exit", group: "Parking", name: "Vehicle exit", enabled: true, channels: ["In-app"], throttleMinutes: 5, lastTriggeredAt: null },
  { eventKey: "parking.remaining_30", group: "Parking", name: "30 minutes left", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "parking.remaining_15", group: "Parking", name: "15 minutes left", enabled: true, channels: ["In-app"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "parking.remaining_5", group: "Parking", name: "5 minutes left", enabled: true, channels: ["In-app"], throttleMinutes: 5, lastTriggeredAt: null },
  { eventKey: "parking.expired", group: "Parking", name: "Parking time expired", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },

  { eventKey: "booking.checkin_overdue", group: "Booking", name: "Check-in overdue", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 15, lastTriggeredAt: null },
  { eventKey: "booking.created", group: "Booking", name: "Booking successful", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },
  { eventKey: "booking.cancelled", group: "Booking", name: "Booking cancelled", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 10, lastTriggeredAt: null },

  { eventKey: "system.maintenance", group: "System", name: "System maintenance", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 60, lastTriggeredAt: null },
  { eventKey: "system.update", group: "System", name: "Version update", enabled: true, channels: ["In-app", "Email"], throttleMinutes: 120, lastTriggeredAt: null },
];
