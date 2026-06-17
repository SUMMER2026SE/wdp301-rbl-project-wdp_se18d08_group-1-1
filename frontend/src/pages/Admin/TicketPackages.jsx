import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  Edit3,
  Gauge,
  Layers,
  PackagePlus,
  ParkingCircle,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Ticket,
  Trash2,
  WalletCards,
  CreditCard as PaymentIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { apiFetch } from "../../services/api";

function cx(...inputs) {
  return twMerge(clsx(inputs));
}

const seedPackages = [
  {
    id: "pkg-001",
    code: "PKG-001",
    name: "Guest Hourly Ticket",
    type: "Guest",
    appliesTo: "Guest",
    basePrice: 20000,
    firstBlockDuration: 120,
    nextBlockPrice: 10000,
    nextBlockDuration: 60,
    monthlyPrice: 0,
    durationDays: 0,
    overtimeFee: 0,
    noShowFee: 0,
    tailgatingFee: 150000,
    qrFraudFee: 250000,
    gracePeriod: 10,
    vehicleLimit: 1,
    penaltyAmount: 0,
    feeType: "",
    description: "Walk-in parking ticket issued at the kiosk.",
    status: "Active",
    updatedAt: "2026-06-02",
    fixedSlot: false,
    unlimitedEntry: false,
  },
  {
    id: "pkg-002",
    code: "PKG-002",
    name: "Customer Hourly Booking",
    type: "Hourly",
    appliesTo: "Customer",
    basePrice: 15000,
    firstBlockDuration: 60,
    nextBlockPrice: 15000,
    nextBlockDuration: 60,
    monthlyPrice: 0,
    durationDays: 0,
    overtimeFee: 25000,
    noShowFee: 30000,
    tailgatingFee: 150000,
    qrFraudFee: 250000,
    gracePeriod: 15,
    vehicleLimit: 1,
    penaltyAmount: 0,
    feeType: "",
    description: "Booking-based hourly package for registered customers.",
    status: "Active",
    updatedAt: "2026-05-30",
    fixedSlot: false,
    unlimitedEntry: false,
  },
  {
    id: "pkg-003",
    code: "PKG-003",
    name: "VIP Monthly Pass",
    type: "Monthly",
    appliesTo: "Customer",
    basePrice: 0,
    firstBlockDuration: 0,
    nextBlockPrice: 0,
    nextBlockDuration: 0,
    monthlyPrice: 1500000,
    durationDays: 30,
    overtimeFee: 0,
    noShowFee: 0,
    tailgatingFee: 250000,
    qrFraudFee: 300000,
    gracePeriod: 0,
    vehicleLimit: 1,
    penaltyAmount: 0,
    feeType: "",
    description: "Monthly parking access with fixed slot support.",
    status: "Active",
    updatedAt: "2026-05-28",
    fixedSlot: true,
    unlimitedEntry: true,
  },
  {
    id: "pkg-004",
    code: "PKG-004",
    name: "Penalty Fee Package",
    type: "Penalty",
    appliesTo: "Customer",
    basePrice: 0,
    firstBlockDuration: 0,
    nextBlockPrice: 0,
    nextBlockDuration: 0,
    monthlyPrice: 0,
    durationDays: 0,
    overtimeFee: 35000,
    penaltyAmount: 35000,
    feeType: "Tailgating",
    noShowFee: 50000,
    tailgatingFee: 300000,
    qrFraudFee: 500000,
    gracePeriod: 0,
    vehicleLimit: 1,
    description: "Fee rule for parking violations and exception handling.",
    status: "Active",
    updatedAt: "2026-05-20",
    fixedSlot: false,
    unlimitedEntry: false,
  },
];

const emptyPackage = {
  code: "",
  name: "",
  type: "Hourly",
  appliesTo: "Customer",
  basePrice: "",
  firstBlockDuration: "",
  nextBlockPrice: "",
  nextBlockDuration: "",
  monthlyPrice: "",
  durationDays: "30",
  overtimeFee: "",
  noShowFee: "",
  tailgatingFee: "",
  qrFraudFee: "",
  gracePeriod: "",
  vehicleLimit: "",
  penaltyAmount: "",
  feeType: "",
  description: "",
  status: "Active",
  fixedSlot: false,
  unlimitedEntry: false,
};

function formatMoney(value) {
  const number = Number(value) || 0;
  return `${number.toLocaleString("vi-VN")} VND`;
}

function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function numberValue(value) {
  return Number(value);
}

function isPositive(value) {
  return Number.isFinite(numberValue(value)) && numberValue(value) > 0;
}

function isNonNegative(value) {
  return Number.isFinite(numberValue(value)) && numberValue(value) >= 0;
}

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function customTypeFor(type, customTypes = []) {
  return customTypes.find((item) => item.value === type || item.name === type);
}

function typePricingMode(type, customTypes = []) {
  if (type === "Guest") return "Hourly";
  if (type === "Hourly") return "Hourly";
  if (type === "Monthly") return "Monthly";
  if (type === "Penalty") return "Fixed Fee";
  const custom = customTypeFor(type, customTypes);
  if (custom) return custom.pricingMode;
  return "Hourly";
}

function hasValidPricing(pkg, customTypes = []) {
  const mode = typePricingMode(pkg.type, customTypes);
  if (pkg.type === "Guest") {
    return (
      isPositive(pkg.basePrice) &&
      isPositiveInteger(pkg.firstBlockDuration) &&
      isPositive(pkg.nextBlockPrice) &&
      isPositiveInteger(pkg.nextBlockDuration)
    );
  }
  if (mode === "Hourly") {
    return (
      isPositive(pkg.basePrice) &&
      isPositiveInteger(pkg.firstBlockDuration) &&
      isNonNegative(pkg.overtimeFee) &&
      isNonNegative(pkg.noShowFee)
    );
  }
  if (mode === "Monthly") {
    return (
      isPositive(pkg.monthlyPrice) &&
      isPositiveInteger(pkg.durationDays) &&
      (!pkg.vehicleLimit || Number(pkg.vehicleLimit) >= 1)
    );
  }
  if (mode === "Fixed Fee") {
    return (
      isPositive(pkg.penaltyAmount) &&
      Boolean(String(pkg.feeType || "").trim()) &&
      String(pkg.description || "").trim().length >= 5
    );
  }
  return false;
}

function validateTicketPackage(pkg, customTypes = []) {
  const errors = {};
  const name = String(pkg.name || "");
  const type = pkg.type;
  const appliesTo = pkg.appliesTo;
  const status = pkg.status;
  const customType = customTypeFor(type, customTypes);
  const mode = typePricingMode(type, customTypes);
  const validTypes = ["Guest", "Hourly", "Monthly", "Penalty"];

  if (!name.trim()) errors.name = "Package name is required.";
  else if (name.trim().length < 3) errors.name = "Package name must be at least 3 characters.";
  else if (name.length > 80) errors.name = "Package name must be 80 characters or less.";

  if (!/^PKG-\d{3}$/.test(String(pkg.code || ""))) {
    errors.code = "Package code must use PKG-XXX format.";
  }
  if (!validTypes.includes(type) && !customType) errors.type = "Package type is required.";
  if (!["Active", "Inactive"].includes(status)) errors.status = "Status is required.";
  if (!appliesTo) errors.appliesTo = "Applies to is required.";
  if (type === "Guest" && appliesTo !== "Guest") errors.appliesTo = "Guest Hourly must apply to Guest.";
  if ((type === "Hourly" || type === "Monthly") && appliesTo !== "Customer") {
    errors.appliesTo = `${displayPackageType(type)} must apply to Customer.`;
  }
  if (type === "Penalty" && !["Customer", "All"].includes(appliesTo)) {
    errors.appliesTo = "Fee Rule can apply to Customer or All.";
  }

  if (type === "Guest") {
    if (!isPositive(pkg.basePrice)) errors.basePrice = "First block price must be greater than 0.";
    if (!isPositiveInteger(pkg.firstBlockDuration)) errors.firstBlockDuration = "First block duration must be greater than 0 minutes.";
    if (!isPositive(pkg.nextBlockPrice)) errors.nextBlockPrice = "Next block price must be greater than 0.";
    if (!isPositiveInteger(pkg.nextBlockDuration)) errors.nextBlockDuration = "Next block duration must be greater than 0 minutes.";
  }
  if (mode === "Hourly" && type !== "Guest") {
    if (!isPositive(pkg.basePrice)) errors.basePrice = "Base price must be greater than 0.";
    if (!isPositiveInteger(pkg.firstBlockDuration)) errors.firstBlockDuration = "Duration must be greater than 0 minutes.";
    if (!isNonNegative(pkg.overtimeFee)) errors.overtimeFee = "Overtime fee must be 0 or greater.";
    if (!isNonNegative(pkg.noShowFee)) errors.noShowFee = "No-show fee must be 0 or greater.";
  }
  if (mode === "Monthly") {
    if (!isPositive(pkg.monthlyPrice)) errors.monthlyPrice = "Monthly price must be greater than 0.";
    if (!isPositiveInteger(pkg.durationDays)) errors.durationDays = "Duration in days must be greater than 0.";
    if (pkg.vehicleLimit && Number(pkg.vehicleLimit) < 1) errors.vehicleLimit = "Vehicle limit must be at least 1.";
  }
  if (mode === "Fixed Fee") {
    if (!String(pkg.feeType || "").trim()) errors.feeType = "Fee type is required.";
    if (!isPositive(pkg.penaltyAmount)) errors.penaltyAmount = "Fee amount must be greater than 0.";
    if (String(pkg.description || "").trim().length < 5) errors.description = "Description must be at least 5 characters.";
  }

  return errors;
}

function primaryPrice(pkg, customTypes = []) {
  const mode = typePricingMode(pkg.type, customTypes);
  if (!hasValidPricing(pkg, customTypes)) return "Pricing pending";
  if (mode === "Monthly") return `${formatMoney(pkg.monthlyPrice)} / mo`;
  if (mode === "Fixed Fee")
    return pkg.penaltyAmount
      ? `${formatMoney(pkg.penaltyAmount)} fee`
      : "Fixed fee";
  return `${formatMoney(pkg.basePrice)} / ${pkg.firstBlockDuration || 60}m`;
}

function displayPackageType(type, customTypes = []) {
  if (type === "Guest") return "Guest Hourly";
  if (type === "Hourly") return "Customer Hourly";
  if (type === "Monthly") return "Monthly Pass";
  if (type === "Penalty") return "Fee Rule";
  const custom = customTypeFor(type, customTypes);
  if (custom) return custom.name;
  return type;
}

function sortablePrice(pkg, customTypes = []) {
  const mode = typePricingMode(pkg.type, customTypes);
  if (mode === "Monthly") return Number(pkg.monthlyPrice) || 0;
  if (mode === "Fixed Fee") return Number(pkg.penaltyAmount) || 0;
  return Number(pkg.basePrice) || 0;
}

function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / 800, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{count}</span>;
}

function SummaryCard({ icon: Icon, label, value, subtitle, gradient, glow }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.018 }}
      className="relative rounded-2xl px-4 py-3 overflow-hidden cursor-default group transition-all duration-300 hover:scale-[1.025]"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.34)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 40px ${glow}, 0 0 0 1px rgba(255,255,255,0.12)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.3)";
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100"
      />
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-xl`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1.5">
            {label}
          </p>
          <p className="text-2xl font-bold text-white leading-none">
            <AnimatedCounter value={value} />
          </p>
          <p className="mt-1 text-xs font-medium text-[#94A3B8]">{subtitle}</p>
        </div>
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon size={18} className="text-white" strokeWidth={2.5} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }) {
  const active = status === "Active";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase transition-colors duration-300",
        active
          ? "border-[#00D084]/20 bg-[#00D084]/10 text-[#00D084] shadow-[0_0_15px_-3px_rgba(0,208,132,0.3)]"
          : "border-white/10 bg-white/5 text-[#94A3B8]",
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full animate-pulse",
          active ? "bg-[#00D084]" : "bg-[#94A3B8]",
        )}
      />
      {status}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D9DEE7] backdrop-blur-md">
      {displayPackageType(type)}
    </span>
  );
}

function CustomDropdown({ value, options, onChange, className, compact = false, large = false, error = false, placeholder = "Select option" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const SelectedIcon = selected?.icon;

  return (
    <div ref={containerRef} className={cx("relative select-none", open && "z-[90]", className)}>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className={cx(
          "relative z-10 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010]/90 text-left text-[#F8FAFC] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl transition-all focus:outline-none focus:ring-4 focus:border-[#F5C542] focus:ring-[#F5C542]/20",
          large ? "h-12 px-3.5 text-sm" : compact ? "h-9 px-3 text-xs" : "h-[42px] px-3.5 text-sm",
          error
            ? "border-[#EF4444]/70 focus:border-[#EF4444] focus:ring-[#EF4444]/20"
            : open
              ? "border-[#F5C542]/35 shadow-[0_12px_35px_rgba(0,0,0,0.3)]"
              : "hover:border-[#F5C542]/30 hover:bg-[#151515]",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selected?.dot ? (
            <span className={cx("h-2 w-2 shrink-0 rounded-full", selected.dot)} />
          ) : SelectedIcon ? (
            <SelectedIcon size={compact ? 14 : 16} className="shrink-0 text-[#F5C542]" />
          ) : null}
          <span className={cx("truncate font-semibold", !selected && "text-[#94A3B8]")}>
            {selected?.label || placeholder}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {typeof selected?.count === "number" && (
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-black text-[#F5C542]">
              {selected.count}
            </span>
          )}
          <ChevronDown
            size={15}
            className={cx("text-[#94A3B8] transition-transform duration-200", open && "rotate-180 text-[#F5C542]")}
          />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 top-[calc(100%+8px)] z-[999] w-full min-w-[220px] rounded-xl border border-[#F5C542]/25 bg-[#101010] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl"
          >
            {options.map((option) => {
              const Icon = option.icon;
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cx(
                    "flex h-[42px] w-full items-center justify-between rounded-lg px-3 text-sm transition-all",
                    active
                      ? "bg-[#F5C542]/[0.18] text-[#F5C542]"
                      : "text-[#F8FAFC] hover:bg-[#F5C542]/[0.12]",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {option.dot ? (
                      <span className={cx("h-2 w-2 shrink-0 rounded-full", option.dot)} />
                    ) : Icon ? (
                      <Icon size={16} className={cx("shrink-0", active ? "text-[#F5C542]" : "text-[#94A3B8]")} />
                    ) : null}
                    <span className="truncate font-semibold">{option.label}</span>
                  </span>
                  {typeof option.count === "number" && (
                    <span className={cx("rounded-md px-1.5 py-0.5 text-[10px] font-black", active ? "bg-[#F5C542]/20 text-[#F5C542]" : "bg-white/10 text-[#94A3B8]")}>
                      {option.count}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlowPills({ type }) {
  const steps =
    type === "Monthly"
      ? ["Register Pass", "Fixed Slot", "AI Plate Check", "Unlimited Entry"]
      : type === "Guest"
        ? ["Kiosk Entry", "QR Ticket", "Parking", "Checkout Payment"]
      : type === "Penalty"
        ? ["Fee Rule", "Detection", "Charge", "Review"]
        : ["Booking", "AI Plate Check", "Parking", "Overtime Check", "Wallet Payment"];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          <span className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[#F8FAFC]/80 shadow-inner">
            {step}
          </span>
          {index < steps.length - 1 && (
            <ArrowRight size={14} className="text-[#F5C542]/50" />
          )}
        </div>
      ))}
    </div>
  );
}

const customTypeIcons = {
  Ticket,
  Clock: Clock3,
  Calendar: CalendarDays,
  Car,
  Shield: ShieldCheck,
  AlertTriangle,
  QrCode,
  ParkingCircle,
  CreditCard,
};

function typeVisual(type, customTypes = []) {
  if (type === "Guest") {
    return {
      icon: QrCode,
      label: "QR Ticket",
      gradient: "from-cyan-400/25 to-[#F5C542]/20",
    };
  }
  if (type === "Monthly") {
    return {
      icon: ParkingCircle,
      label: "Fixed Slot",
      gradient: "from-emerald-400/25 to-[#F5C542]/20",
    };
  }
  if (type === "Penalty") {
    return {
      icon: AlertTriangle,
      label: "Fee Rule",
      gradient: "from-red-400/25 to-[#F5C542]/20",
    };
  }
  if (type === "Hourly") {
    return {
      icon: Clock3,
      label: "Hourly Clock",
      gradient: "from-violet-400/25 to-[#F5C542]/20",
    };
  }
  const custom = customTypeFor(type, customTypes);
  if (custom) {
    return {
      icon: customTypeIcons[custom.icon] || Ticket,
      label: custom.name,
      gradient:
        custom.pricingMode === "Monthly"
          ? "from-emerald-400/25 to-[#F5C542]/20"
          : custom.pricingMode === "Fixed Fee"
            ? "from-red-400/25 to-[#F5C542]/20"
            : "from-violet-400/25 to-[#F5C542]/20",
    };
  }
  return {
    icon: Clock3,
    label: "Hourly Clock",
    gradient: "from-violet-400/25 to-[#F5C542]/20",
  };
}

function calculateSimulation(pkg, hours = 4, customTypes = []) {
  const mode = typePricingMode(pkg.type, customTypes);
  if (!hasValidPricing(pkg, customTypes)) return null;
  if (mode === "Monthly") return Number(pkg.monthlyPrice) || 0;
  if (mode === "Fixed Fee") return Number(pkg.penaltyAmount) || 0;

  const firstMinutes = Number(pkg.firstBlockDuration) || 60;
  const nextMinutes = Number(pkg.nextBlockDuration) || 60;
  const totalMinutes = hours * 60;
  const base = Number(pkg.basePrice) || 0;
  const nextPrice = Number(pkg.nextBlockPrice) || 0;
  const extraMinutes = Math.max(0, totalMinutes - firstMinutes);
  const extraBlocks = Math.ceil(extraMinutes / nextMinutes);

  return base + extraBlocks * nextPrice;
}

function ParkingPackageVisual({ pkg, compact = false }) {
  const visual = typeVisual(pkg.type);
  const Icon = visual.icon;

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/40 backdrop-blur-xl",
        compact ? "p-4" : "p-6",
      )}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${visual.gradient} opacity-70`} />
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#F5C542]/20 blur-3xl" />
      <div className="absolute bottom-5 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#F5C542]/40 to-transparent" />
      <div className="absolute bottom-8 left-10 right-10 grid grid-cols-3 gap-3 opacity-35">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="h-10 rounded-lg border border-white/20 bg-black/20" />
        ))}
      </div>
      <motion.div
        animate={{ x: compact ? [0, 4, 0] : [0, 10, 0], y: [0, -2, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        className={cx(
          "relative z-10 mx-auto flex items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-[#F5C542] to-[#E5A522] text-black shadow-[0_0_35px_rgba(245,197,66,0.35)]",
          compact ? "h-14 w-14" : "h-20 w-20",
        )}
      >
        <Icon size={compact ? 26 : 38} strokeWidth={2.4} />
      </motion.div>
      <p className="relative z-10 mt-4 text-center text-xs font-black uppercase tracking-[0.18em] text-[#F5C542]">
        {visual.label}
      </p>
    </div>
  );
}

function compactFlowChips(type) {
  if (type === "Guest") return ["Kiosk", "QR", "Checkout"];
  if (type === "Monthly") return ["Fixed Slot", "AI Access", "Unlimited"];
  if (type === "Penalty") return ["Detect", "Charge", "Block"];
  return ["Booking", "AI Plate", "Wallet"];
}

function PackageListItem({ pkg, onView, onEdit, index = 0 }) {
  const visual = typeVisual(pkg.type);
  const Icon = visual.icon;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.045, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      onClick={() => onView(pkg)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onView(pkg);
      }}
      role="button"
      tabIndex={0}
      className="group relative flex min-h-[235px] cursor-pointer flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0B0B0B]/80 p-5 text-left outline-none backdrop-blur-xl transition-all duration-300 hover:border-[#F5C542]/35 hover:bg-[#11100B] hover:shadow-[0_22px_70px_-35px_rgba(245,197,66,0.75)] focus-visible:border-[#F5C542]/60 focus-visible:ring-2 focus-visible:ring-[#F5C542]/25"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${visual.gradient} opacity-35 transition-opacity duration-500 group-hover:opacity-60`} />
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#F5C542]/15 blur-3xl transition-opacity group-hover:opacity-90" />
      <div className="absolute -bottom-20 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C542]/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <motion.div
          animate={{ y: [0, -4, 0], rotate: [0, 1.5, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-[#F5C542] to-[#E5A522] text-black shadow-[0_0_30px_-8px_rgba(245,197,66,0.9)]"
        >
          <Icon size={27} strokeWidth={2.5} />
        </motion.div>

        <div className="flex min-w-0 flex-1 flex-col items-end gap-2">
          <StatusBadge status={pkg.status} />
          <span className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-black tracking-[0.18em] text-[#F5C542]">
            {pkg.code}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-5 min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <TypeBadge type={pkg.type} />
        </div>
        <h3 className="truncate text-xl font-black tracking-tight text-white">
          {pkg.name}
        </h3>
        <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl border border-[#F5C542]/20 bg-[#F5C542]/10 px-3 py-2 text-sm font-black text-[#F5C542] shadow-[0_0_22px_-14px_rgba(245,197,66,0.9)]">
          <Tag size={15} />
          <span className="truncate">{primaryPrice(pkg)}</span>
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {compactFlowChips(pkg.type).map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-[#CBD5E1]"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onView(pkg);
            }}
            className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-black text-white transition-all hover:border-[#F5C542]/35 hover:bg-[#F5C542]/10 hover:text-[#F5C542]"
          >
            View Package
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(pkg);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#F5C542]/25 bg-[#F5C542]/10 text-[#F5C542] transition-all hover:bg-[#F5C542] hover:text-black hover:shadow-[0_0_24px_-8px_rgba(245,197,66,0.9)] active:scale-95"
            title="Edit Package"
          >
            <Edit3 size={17} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div className="group flex items-center justify-between gap-4 border-b border-white/[0.04] py-3.5 transition-colors hover:bg-white/[0.01] last:border-b-0 px-2 rounded-lg">
      <span className="text-sm font-medium text-[#94A3B8]">{label}</span>
      <span
        className={cx(
          "text-right text-sm font-bold",
          highlight ? "text-[#F5C542]" : "text-[#F8FAFC]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RuleChip({ enabled, label }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
        enabled
          ? "border border-[#F5C542]/30 bg-[#F5C542]/10 text-[#F5C542] shadow-[0_0_15px_-3px_rgba(245,197,66,0.15)]"
          : "border border-white/5 bg-white/[0.02] text-[#94A3B8]",
      )}
    >
      <Check
        size={14}
        className={enabled ? "opacity-100" : "opacity-35"}
        strokeWidth={enabled ? 3 : 2}
      />
      {label}
    </span>
  );
}

function PreviewTypeBadge({ type, customTypes = [] }) {
  const visual = typeVisual(type, customTypes);
  const Icon = visual.icon;

  return (
    <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#F5C542]/25 bg-[#F5C542]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#F5C542] shadow-[0_0_20px_-12px_rgba(245,197,66,0.95)] backdrop-blur-xl">
      <Icon size={14} strokeWidth={2.6} />
      {displayPackageType(type, customTypes)}
    </span>
  );
}

function Field({ label, children, required, error, name }) {
  return (
    <label className="block" data-ticket-field={name}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
        {label}
        {required && <span className="ml-1 text-[#EF4444]">*</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#EF4444]">
          <AlertTriangle size={12} /> {error}
        </span>
      )}
    </label>
  );
}

function inputClass(error = false) {
  return cx(
    "w-full rounded-xl border bg-[#050505] px-3.5 py-2.5 text-sm text-[#F8FAFC] shadow-inner outline-none transition-all placeholder:text-[#94A3B8]/40 focus:bg-black",
    error
      ? "border-[#EF4444]/70 focus:border-[#EF4444] focus:ring-4 focus:ring-[#EF4444]/10"
      : "border-white/10 focus:border-[#F5C542]/50 focus:ring-4 focus:ring-[#F5C542]/10",
  );
}

function compactInputClass(error = false) {
  return cx(
    "h-9 w-full rounded-lg border bg-[#050505]/90 px-3 text-xs font-semibold text-[#F8FAFC] shadow-inner outline-none transition-all placeholder:text-[#94A3B8]/35 focus:bg-black",
    error
      ? "border-[#EF4444]/70 focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/10"
      : "border-white/10 focus:border-[#F5C542]/50 focus:ring-2 focus:ring-[#F5C542]/10",
  );
}

function CompactField({ label, children, className, required, error, name }) {
  return (
    <label className={cx("min-w-0", className)} data-ticket-field={name}>
      <span className="mb-1.5 block truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#94A3B8]">
        {label}
        {required && <span className="ml-1 text-[#EF4444]">*</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#EF4444]">
          <AlertTriangle size={11} /> {error}
        </span>
      )}
    </label>
  );
}

function NumberInput({ value, onValueChange, onTouched, unit, error, placeholder }) {
  return (
    <div className="relative">
      <input
        className={cx(inputClass(Boolean(error)), unit && "pr-14")}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onValueChange(event.target.value.replace(/[^\d]/g, ""))}
        onBlur={onTouched}
        placeholder={placeholder}
      />
      {unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black uppercase tracking-wide text-[#94A3B8]/70">
          {unit}
        </span>
      )}
    </div>
  );
}

function CustomPackageTypeCreator({ open, existingNames, onCreate, onCancel, showToast }) {
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    icon: "Ticket",
    pricingMode: "Hourly",
  });
  const [touched, setTouched] = useState({});
  const iconOptions = [
    { value: "Ticket", label: "Ticket", icon: Ticket },
    { value: "Clock", label: "Clock", icon: Clock3 },
    { value: "Calendar", label: "Calendar", icon: CalendarDays },
    { value: "Car", label: "Car", icon: Car },
    { value: "Shield", label: "Shield", icon: ShieldCheck },
    { value: "AlertTriangle", label: "Alert", icon: AlertTriangle },
  ];
  const pricingModeOptions = [
    { value: "Hourly", label: "Hourly", icon: Clock3 },
    { value: "Monthly", label: "Monthly", icon: CalendarDays },
    { value: "Fixed Fee", label: "Fixed Fee", icon: Ticket },
  ];
  const normalized = draft.name.trim().toLowerCase();
  
  const validate = () => {
    const errs = {};
    if (!draft.name.trim()) errs.name = "Type name is required.";
    else if (draft.name.trim().length < 3) errs.name = "Minimum 3 characters.";
    else if (draft.name.trim().length > 50) errs.name = "Maximum 50 characters.";
    else if (existingNames.some((name) => name.toLowerCase() === normalized)) errs.name = "Type name must be unique.";
    
    if (!draft.pricingMode) errs.pricingMode = "Pricing mode is required.";
    if (!draft.icon) errs.icon = "Icon is required.";
    return errs;
  };
  
  const errors = validate();
  const canSave = Object.keys(errors).length === 0;

  const save = () => {
    if (!canSave) {
      setTouched({ name: true, pricingMode: true, icon: true });
      if (showToast) showToast("Please complete required fields.");
      return;
    }
    onCreate({
      name: draft.name.trim(),
      description: draft.description.trim(),
      icon: draft.icon,
      pricingMode: draft.pricingMode,
    });
    setDraft({ name: "", description: "", icon: "Ticket", pricingMode: "Hourly" });
    setTouched({});
  };

  const inputClass = (hasErr) => cx(
    "h-12 w-full rounded-xl border bg-[#101010]/90 px-3.5 text-sm text-[#F8FAFC] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl transition-all focus:outline-none focus:ring-4",
    hasErr
      ? "border-[#EF4444]/70 focus:border-[#EF4444] focus:ring-[#EF4444]/20"
      : "border-white/10 hover:border-[#F5C542]/30 focus:border-[#F5C542] focus:ring-[#F5C542]/20"
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onMouseDown={(event) => event.stopPropagation()}
            className="relative w-full max-w-[640px] overflow-visible rounded-[24px] border border-[#F5C542]/30 bg-[#0A0A0A]/90 p-6 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#F5C542]/10 blur-[80px]" />
            <div className="relative z-20 mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">New Package Type</h2>
                <p className="mt-1 text-sm font-medium text-[#94A3B8]">
                  Create a reusable package type for ticket packages.
                </p>
              </div>
            </div>
            
            <div className="relative z-20 grid gap-x-5 gap-y-4 md:grid-cols-2">
              <Field label="Type Name" required error={touched.name ? errors.name : ""}>
                <input
                  className={inputClass(Boolean(touched.name && errors.name))}
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  placeholder="Weekend Pass"
                />
              </Field>
              <Field label="Pricing Mode" required error={touched.pricingMode ? errors.pricingMode : ""}>
                <CustomDropdown
                  value={draft.pricingMode}
                  options={pricingModeOptions}
                  onChange={(value) => {
                    setDraft((prev) => ({ ...prev, pricingMode: value }));
                    setTouched((prev) => ({ ...prev, pricingMode: true }));
                  }}
                  error={Boolean(touched.pricingMode && errors.pricingMode)}
                  large
                />
              </Field>
              <Field label="Icon" required error={touched.icon ? errors.icon : ""}>
                <CustomDropdown
                  value={draft.icon}
                  options={iconOptions}
                  onChange={(value) => {
                    setDraft((prev) => ({ ...prev, icon: value }));
                    setTouched((prev) => ({ ...prev, icon: true }));
                  }}
                  error={Boolean(touched.icon && errors.icon)}
                  large
                />
              </Field>
              <Field label="Description">
                <input
                  className={inputClass(false)}
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Special rate for night parking"
                />
              </Field>
            </div>

            <div className="relative z-10 mt-8 flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-white/10 bg-[#1A1A1A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2A2A2A] hover:border-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!canSave}
                className={cx(
                  "rounded-xl px-5 py-3 text-sm font-black transition-all",
                  canSave
                    ? "bg-[#F5C542] text-black shadow-[0_0_20px_-5px_rgba(245,197,66,0.5)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_-8px_rgba(245,197,66,0.8)]"
                    : "bg-[#F5C542]/50 text-black/50 cursor-not-allowed opacity-50 shadow-none",
                )}
              >
                Create Type
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "group flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-300",
        checked
          ? "border-[#F5C542]/40 bg-[#F5C542]/10 text-white shadow-[0_0_24px_-12px_rgba(245,197,66,0.9)]"
          : "border-white/10 bg-black/25 text-[#94A3B8] hover:-translate-y-0.5 hover:border-[#F5C542]/25 hover:bg-[#F5C542]/[0.04]",
      )}
    >
      <span className="min-w-0 text-sm font-bold leading-snug">{label}</span>
      <div
        className={cx(
          "relative flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-300",
          checked ? "bg-[#F5C542]" : "bg-white/10 group-hover:bg-white/20",
        )}
      >
        <motion.div
          layout
          className="h-4 w-4 rounded-full bg-white shadow-md mx-1"
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}

function PackageLivePreview({ pkg }) {
  const simulationTotal = calculateSimulation(pkg, 4);
  const validPricing = simulationTotal !== null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#F5C542]/20 bg-gradient-to-br from-[#101010] to-[#0A0A0A] p-6 shadow-2xl">
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#F5C542]/10 blur-3xl" />
      <div className="mb-6 flex items-start justify-between gap-4 relative z-10">
        <div className="min-w-0">
          <p className="inline-block rounded-lg bg-[#F5C542]/10 px-2 py-1 text-[10px] font-black tracking-[0.2em] text-[#F5C542]">
            {pkg.code || "PKG-NEW"}
          </p>
          <h3 className="mt-3 truncate text-2xl font-black text-white">
            {String(pkg.name || "").trim() || "New Ticket Package"}
          </h3>
          <p className="mt-1 text-sm font-medium text-[#94A3B8]">
            {displayPackageType(pkg.type)} for {pkg.appliesTo}
          </p>
        </div>
        <StatusBadge status={pkg.status} />
      </div>
      <div className="relative z-10 mb-5">
        <ParkingPackageVisual pkg={pkg} compact />
      </div>
      <div className="rounded-xl border border-white/5 bg-black/40 p-1 relative z-10 backdrop-blur-md">
        <DetailRow label="Primary Price" value={primaryPrice(pkg)} highlight />
        <DetailRow
          label={pkg.type === "Penalty" ? "Penalty Amount" : "Overtime"}
          value={
            pkg.type === "Penalty"
              ? pkg.penaltyAmount
                ? formatMoney(pkg.penaltyAmount)
                : "Not set"
              : pkg.overtimeFee
              ? `${formatMoney(pkg.overtimeFee)} / hr`
              : "Not applied"
          }
        />
        <DetailRow
          label="Rules Active"
          value={
            pkg.fixedSlot || pkg.unlimitedEntry ? "Customized" : "Standard"
          }
        />
      </div>
      <div className="relative z-10 mt-4 rounded-xl border border-[#F5C542]/15 bg-[#F5C542]/[0.06] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5C542]">
              Pricing simulation
            </p>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Duration: 4 hours
            </p>
          </div>
          <p className="text-lg font-black text-white">
            {validPricing ? formatMoney(simulationTotal) : "Waiting for valid pricing input"}
          </p>
        </div>
      </div>
      <div className="mt-6 relative z-10">
        <FlowPills type={pkg.type} />
      </div>
    </div>
  );
}

function FormSection({ title, icon: Icon, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
    >
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#F5C542]/[0.06] blur-3xl" />
      <div className="relative z-10 mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F5C542]/20 bg-[#F5C542]/10 text-[#F5C542]">
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-black tracking-tight text-white">
          {title}
        </h2>
      </div>
      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}

function PackageFlowPreview({ type }) {
  return (
    <div className="rounded-[1.25rem] border border-[#F5C542]/15 bg-black/35 p-5">
      <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#F5C542]">
        Package Flow Preview
      </p>
      <FlowPills type={type} />
    </div>
  );
}

function formSectionTitle(title, Icon, subtitle) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#F5C542]/20 bg-[#F5C542]/10 text-[#F5C542]">
        <Icon size={17} strokeWidth={2.5} />
      </div>
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs font-medium text-[#94A3B8]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function parkingJourneySteps(type) {
  if (type === "Guest") {
    return [
      { label: "Kiosk", icon: QrCode },
      { label: "QR Ticket", icon: Tag },
      { label: "Parking", icon: ParkingCircle },
      { label: "Payment", icon: PaymentIcon },
    ];
  }
  if (type === "Monthly") {
    return [
      { label: "Register", icon: CreditCard },
      { label: "Fixed Slot", icon: ParkingCircle },
      { label: "AI Access", icon: ShieldCheck },
      { label: "Unlimited", icon: Gauge },
    ];
  }
  if (type === "Penalty") {
    return [
      { label: "Detect", icon: AlertTriangle },
      { label: "Charge", icon: WalletCards },
      { label: "Review", icon: ShieldCheck },
      { label: "Block", icon: AlertTriangle },
    ];
  }
  return [
    { label: "Booking", icon: CalendarDays },
    { label: "AI Plate", icon: ShieldCheck },
    { label: "Parking", icon: ParkingCircle },
    { label: "Wallet", icon: WalletCards },
  ];
}

function ParkingJourney({ type }) {
  return (
    <div className="relative">
      <div className="grid gap-3 sm:grid-cols-4">
        {parkingJourneySteps(type).map(({ label, icon: Icon }, index, steps) => (
          <div key={label} className="relative">
            {index < steps.length - 1 && (
              <div className="absolute left-[calc(50%+18px)] right-[-50%] top-[18px] hidden h-px bg-gradient-to-r from-[#F5C542]/45 to-transparent sm:block" />
            )}
            <div className="relative flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all hover:bg-[#F5C542]/[0.06]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#F5C542]/20 bg-[#F5C542]/10 text-[#F5C542] shadow-[0_0_18px_-12px_rgba(245,197,66,0.9)]">
                <Icon size={16} strokeWidth={2.5} />
              </div>
              <span className="min-w-0 truncate text-[11px] font-black uppercase tracking-[0.08em] text-[#E2E8F0]">
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageFormPage({
  mode,
  form,
  setForm,
  customTypes = [],
  onBack,
  onSave,
  onInvalid,
}) {
  const formRef = useRef(null);
  const [touched, setTouched] = useState({});
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const errors = useMemo(() => validateTicketPackage(form, customTypes), [customTypes, form]);
  const errorKeys = Object.keys(errors);
  const isValid = errorKeys.length === 0;
  const preview = {
    ...emptyPackage,
    ...form,
    id: form.id || "preview",
    updatedAt: new Date().toISOString(),
  };
  const packageTypeOptions = customTypes.map((type) => ({
    value: type.value,
    label: type.name,
    icon: customTypeIcons[type.icon] || Ticket,
  }));
  const selectedCustomType = customTypeFor(form.type, customTypes);
  const pricingMode = typePricingMode(form.type, customTypes);
  const appliesToOptions =
    form.type === "Guest"
      ? [{ value: "Guest", label: "Guest", icon: QrCode }]
      : form.type === "Penalty" || selectedCustomType
        ? [
            { value: "Guest", label: "Guest", icon: QrCode },
            { value: "Customer", label: "Customer", icon: ShieldCheck },
            { value: "All", label: "All", icon: Layers },
          ]
        : [{ value: "Customer", label: "Customer", icon: ShieldCheck }];
  const formStatusOptions = [
    { value: "Active", label: "Active", dot: "bg-[#00D084]" },
    { value: "Inactive", label: "Inactive", dot: "bg-[#94A3B8]" },
  ];
  const feeTypeOptions = [
    { value: "Tailgating", label: "Tailgating", icon: AlertTriangle },
    { value: "QR Fraud", label: "QR Fraud", icon: QrCode },
    { value: "Overtime", label: "Overtime", icon: Clock3 },
    { value: "Other", label: "Other", icon: Tag },
  ];
  const isMonthly = pricingMode === "Monthly";
  const isGuest = form.type === "Guest";
  const isHourly = pricingMode === "Hourly" && !isGuest;
  const isFixedFee = pricingMode === "Fixed Fee";
  const showError = (field) => (touched[field] ? errors[field] : "");
  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const updateNumber = (field, value) => update(field, value.replace(/[^\d]/g, ""));
  const updatePackageType = (value) => {
    const nextMode = typePricingMode(value, customTypes);
    setForm((prev) => ({
      ...prev,
      type: value,
      appliesTo: value === "Guest" ? "Guest" : "Customer",
      durationDays: nextMode === "Monthly" ? prev.durationDays || "30" : prev.durationDays,
    }));
    touch("type");
    touch("appliesTo");
  };
  const markAllInvalid = () => {
    const nextTouched = errorKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched((prev) => ({ ...prev, ...nextTouched }));
    requestAnimationFrame(() => {
      const first = formRef.current?.querySelector(`[data-ticket-field="${errorKeys[0]}"]`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    onInvalid?.();
  };
  const handleSave = () => {
    if (!isValid) {
      markAllInvalid();
      return;
    }
    onSave();
  };
  return (
    <div className="relative h-[calc(100vh-70px)] overflow-auto bg-[#030303] text-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[18%] -left-[8%] h-[55%] w-[45%] rounded-full bg-[#F5C542]/[0.05] blur-[120px]" />
        <div className="absolute top-[48%] -right-[12%] h-[45%] w-[38%] rounded-full bg-[#E5A522]/[0.04] blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:56px_56px] opacity-35" />
      </div>

      <div className="relative z-10 px-8 py-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-[#94A3B8] transition-all hover:border-[#F5C542]/35 hover:bg-[#F5C542]/10 hover:text-[#F5C542]"
            >
              <ArrowLeft size={16} /> Back to Ticket Packages
            </button>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {mode === "edit" ? "Edit Ticket Package" : "Add Ticket Package"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#94A3B8]">
              Configure ticket package information, pricing, and parking journey behavior.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/[0.08]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              aria-disabled={!isValid}
              className={cx(
                "rounded-2xl px-6 py-3 text-sm font-black shadow-[0_15px_40px_-18px_rgba(245,197,66,0.85)] transition-all",
                isValid
                  ? "bg-gradient-to-r from-[#F5C542] to-[#E5A522] text-black hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-18px_rgba(245,197,66,1)]"
                  : "cursor-not-allowed border border-white/10 bg-white/[0.05] text-[#94A3B8]",
              )}
            >
              {mode === "edit" ? "Save Changes" : "Create Package"}
            </button>
          </div>
        </header>

        {errorKeys.length > 0 && Object.keys(touched).length > 0 && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#EF4444]/25 bg-[#EF4444]/10 px-4 py-2 text-sm font-bold text-[#FCA5A5]">
            <AlertTriangle size={15} />
            {errorKeys.length} field{errorKeys.length > 1 ? "s" : ""} need attention
          </div>
        )}

        <div ref={formRef} className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative space-y-4"
          >
            <div className="relative z-10 space-y-5">
              <section className="border-b border-white/10 pb-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#F5C542]/15 bg-[#F5C542]/10 text-[#F5C542]">
                      <Tag size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
                        Package Metadata
                      </h2>
                    </div>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.35fr)_130px_180px_130px_120px]">
                  <CompactField label="Package Name" name="name" required error={showError("name")}>
                    <input
                      className={compactInputClass(Boolean(showError("name")))}
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      onBlur={() => touch("name")}
                      placeholder="Guest Hourly Ticket"
                    />
                  </CompactField>
                  <CompactField label="Package Code" name="code" required error={showError("code")}>
                    <input
                      className="h-9 w-full rounded-lg border border-[#F5C542]/20 bg-[#F5C542]/10 px-3 font-mono text-xs font-black tracking-[0.14em] text-[#F5C542] outline-none transition-all focus:border-[#F5C542]/45 focus:ring-2 focus:ring-[#F5C542]/10"
                      value={form.code}
                      placeholder="PKG-001"
                      readOnly
                    />
                  </CompactField>
                  <CompactField label="Package Type" name="type" required error={showError("type")}>
                    <CustomDropdown
                      value={form.type}
                      options={packageTypeOptions}
                      onChange={updatePackageType}
                      error={Boolean(showError("type"))}
                      compact
                    />
                  </CompactField>
                  <CompactField label="Applies To" name="appliesTo" required error={showError("appliesTo")}>
                    <CustomDropdown
                      value={form.appliesTo}
                      options={appliesToOptions}
                      onChange={(value) => {
                        update("appliesTo", value);
                        touch("appliesTo");
                      }}
                      error={Boolean(showError("appliesTo"))}
                      compact
                    />
                  </CompactField>
                  <CompactField label="Status" name="status" required error={showError("status")}>
                    <CustomDropdown
                      value={form.status}
                      options={formStatusOptions}
                      onChange={(value) => {
                        update("status", value);
                        touch("status");
                      }}
                      error={Boolean(showError("status"))}
                      compact
                    />
                  </CompactField>
                  </div>
              </section>

              <section>
                {formSectionTitle(
                  "Pricing",
                  CreditCard,
                  isMonthly
                    ? "Set the subscription price for recurring parking access."
                    : isHourly
                      ? "Set booking rate, parking duration, overtime, and no-show charge."
                      : form.type === "Penalty"
                        ? "Set the penalty charge and a clear admin-facing description."
                        : "Set first block, next block, and overtime charges.",
                )}
                {isMonthly ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Monthly price" name="monthlyPrice" required error={showError("monthlyPrice")}>
                      <NumberInput value={form.monthlyPrice} onValueChange={(value) => updateNumber("monthlyPrice", value)} onTouched={() => touch("monthlyPrice")} unit="VND" error={showError("monthlyPrice")} />
                    </Field>
                    <Field label="Duration days" name="durationDays" required error={showError("durationDays")}>
                      <NumberInput value={form.durationDays} onValueChange={(value) => updateNumber("durationDays", value)} onTouched={() => touch("durationDays")} unit="days" error={showError("durationDays")} />
                    </Field>
                    <Field label="Vehicle limit" name="vehicleLimit" error={showError("vehicleLimit")}>
                      <NumberInput value={form.vehicleLimit} onValueChange={(value) => updateNumber("vehicleLimit", value)} onTouched={() => touch("vehicleLimit")} error={showError("vehicleLimit")} />
                    </Field>
                    <Toggle
                      label="Fixed parking slot"
                      checked={form.fixedSlot}
                      onChange={(value) => update("fixedSlot", value)}
                    />
                    <Toggle
                      label="Unlimited entry"
                      checked={form.unlimitedEntry}
                      onChange={(value) => update("unlimitedEntry", value)}
                    />
                    <p className="md:col-span-2 text-xs font-medium text-[#94A3B8]">
                      Default monthly duration is 30 days. Vehicle limit should be at least 1 when used.
                    </p>
                  </div>
                ) : isHourly ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Base price" name="basePrice" required error={showError("basePrice")}>
                      <NumberInput value={form.basePrice} onValueChange={(value) => updateNumber("basePrice", value)} onTouched={() => touch("basePrice")} unit="VND" error={showError("basePrice")} />
                    </Field>
                    <Field label="Duration" name="firstBlockDuration" required error={showError("firstBlockDuration")}>
                      <NumberInput value={form.firstBlockDuration} onValueChange={(value) => updateNumber("firstBlockDuration", value)} onTouched={() => touch("firstBlockDuration")} unit="mins" error={showError("firstBlockDuration")} />
                    </Field>
                    <Field label="Overtime fee" name="overtimeFee" required error={showError("overtimeFee")}>
                      <NumberInput value={form.overtimeFee} onValueChange={(value) => updateNumber("overtimeFee", value)} onTouched={() => touch("overtimeFee")} unit="VND" error={showError("overtimeFee")} />
                    </Field>
                    <Field label="No-show fee" name="noShowFee" required error={showError("noShowFee")}>
                      <NumberInput value={form.noShowFee} onValueChange={(value) => updateNumber("noShowFee", value)} onTouched={() => touch("noShowFee")} unit="VND" error={showError("noShowFee")} />
                    </Field>
                    <p className="md:col-span-4 text-xs font-medium text-[#94A3B8]">
                      Example: 15,000 VND / 60 mins, overtime 25,000 VND/hour
                    </p>
                  </div>
                ) : isFixedFee ? (
                  <div className="grid gap-4 md:grid-cols-[220px_220px_1fr]">
                    <Field label="Fee type" name="feeType" required error={showError("feeType")}>
                      <CustomDropdown
                        value={form.feeType}
                        options={feeTypeOptions}
                        onChange={(value) => {
                          update("feeType", value);
                          touch("feeType");
                        }}
                        error={Boolean(showError("feeType"))}
                        placeholder="Select fee type"
                      />
                    </Field>
                    <Field label="Fee amount" name="penaltyAmount" required error={showError("penaltyAmount")}>
                      <NumberInput value={form.penaltyAmount} onValueChange={(value) => updateNumber("penaltyAmount", value)} onTouched={() => touch("penaltyAmount")} unit="VND" error={showError("penaltyAmount")} />
                    </Field>
                    <Field label="Description" name="description" required error={showError("description")}>
                      <textarea
                        className={cx(inputClass(Boolean(showError("description"))), "min-h-[46px] resize-none py-3")}
                        value={form.description}
                        onChange={(e) => update("description", e.target.value)}
                        onBlur={() => touch("description")}
                        placeholder="Describe when this fee rule is applied"
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-5">
                    <Field label="First block price" name="basePrice" required error={showError("basePrice")}>
                      <NumberInput value={form.basePrice} onValueChange={(value) => updateNumber("basePrice", value)} onTouched={() => touch("basePrice")} unit="VND" error={showError("basePrice")} />
                    </Field>
                    <Field label="First mins" name="firstBlockDuration" required error={showError("firstBlockDuration")}>
                      <NumberInput value={form.firstBlockDuration} onValueChange={(value) => updateNumber("firstBlockDuration", value)} onTouched={() => touch("firstBlockDuration")} unit="mins" error={showError("firstBlockDuration")} />
                    </Field>
                    <Field label="Next price" name="nextBlockPrice" required error={showError("nextBlockPrice")}>
                      <NumberInput value={form.nextBlockPrice} onValueChange={(value) => updateNumber("nextBlockPrice", value)} onTouched={() => touch("nextBlockPrice")} unit="VND" error={showError("nextBlockPrice")} />
                    </Field>
                    <Field label="Next mins" name="nextBlockDuration" required error={showError("nextBlockDuration")}>
                      <NumberInput value={form.nextBlockDuration} onValueChange={(value) => updateNumber("nextBlockDuration", value)} onTouched={() => touch("nextBlockDuration")} unit="mins" error={showError("nextBlockDuration")} />
                    </Field>
                    <p className="md:col-span-5 text-xs font-medium text-[#94A3B8]">
                      Example: 20,000 VND / 120 mins, then 10,000 VND / 60 mins
                    </p>
                  </div>
                )}
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <section>
                {formSectionTitle(
                  "Parking journey",
                  ParkingCircle,
                  "A quick visual check of how this package behaves at the gate.",
                )}
                <ParkingJourney type={form.type} />
              </section>
            </div>
          </motion.div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <PackageLivePreview pkg={preview} customTypes={customTypes} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function PackageDetailsPage({ pkg, customTypes = [], onBack, onEdit, onDelete }) {
  if (!pkg) {
    return (
      <div className="flex h-[calc(100vh-70px)] items-center justify-center bg-[#030303] text-white">
        <button
          onClick={onBack}
          className="rounded-2xl bg-[#F5C542] px-6 py-3 font-black text-black"
        >
          Back to Ticket Packages
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-70px)] overflow-auto bg-[#030303] text-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[18%] -left-[8%] h-[55%] w-[45%] rounded-full bg-[#F5C542]/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[45%] w-[40%] rounded-full bg-[#E5A522]/[0.04] blur-[110px]" />
      </div>
      <div className="relative z-10 px-8 py-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-[#94A3B8] transition-all hover:border-[#F5C542]/35 hover:bg-[#F5C542]/10 hover:text-[#F5C542]"
            >
              <ArrowLeft size={16} /> Back to Ticket Packages
            </button>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Ticket Package Details
            </h1>
            <p className="mt-2 text-sm text-[#94A3B8]">
              Review pricing, package-specific rules, and parking journey behavior.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(pkg)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F5C542] to-[#E5A522] px-5 py-3 text-sm font-black text-black shadow-[0_15px_40px_-18px_rgba(245,197,66,0.85)] transition-all hover:-translate-y-0.5"
            >
              <Edit3 size={16} /> Edit
            </button>
            <button
              onClick={() => onDelete(pkg.id)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#FF5A5A]/30 bg-[#FF5A5A]/10 px-5 py-3 text-sm font-black text-[#FF5A5A] transition-all hover:bg-[#FF5A5A]/20"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </header>

        <main className="grid gap-6">
          <section className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden rounded-[1.5rem] border border-[#F5C542]/20 bg-gradient-to-r from-[#151515] to-[#0A0A0A] p-6 shadow-[0_20px_60px_-20px_rgba(245,197,66,0.3)]">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#F5C542]/10 blur-3xl" />
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-[#E5A522]/5 blur-3xl" />
            
            <div className="relative z-10 flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F5C542]/10 text-[#F5C542] ring-1 ring-[#F5C542]/30">
                {(() => {
                  const Icon = customTypeIcons[pkg.icon] || Ticket;
                  return <Icon size={32} />;
                })()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                  <h2 className="text-2xl font-black tracking-tight text-white">{pkg.name}</h2>
                  <span className="rounded-lg bg-black/50 px-2.5 py-1 text-[10px] font-black tracking-wider text-[#F5C542] ring-1 ring-[#F5C542]/30">
                    {pkg.code}
                  </span>
                  <StatusBadge status={pkg.status} />
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-[#94A3B8]">
                  <TypeBadge type={pkg.type} />
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Car size={14} className="text-[#F5C542]" />
                    <strong className="text-white">{pkg.appliesTo}</strong>
                  </span>
                </div>
              </div>
            </div>
            
            <div className="relative z-10 md:text-right shrink-0">
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Primary Price</p>
              <p className="text-4xl font-black text-[#F5C542] drop-shadow-[0_2px_10px_rgba(245,197,66,0.5)]">
                {primaryPrice(pkg)}
              </p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2 items-start">
            {/* Left Column: Pricing Details */}
            <div className="grid gap-6">
              <FormSection title="Pricing Structure" icon={PaymentIcon}>
                <div className="rounded-2xl border border-white/5 bg-[#0A0A0A]/50 p-2 shadow-inner">
                  {pkg.type === "Guest" && (
                    <>
                      <DetailRow label="First block price" value={pkg.basePrice ? formatMoney(pkg.basePrice) : "Not configured"} highlight />
                      <DetailRow label="First block duration" value={pkg.duration ? `${pkg.duration} mins` : "Not configured"} />
                      <DetailRow label="Next block price" value={pkg.nextBlockPrice ? formatMoney(pkg.nextBlockPrice) : "Not configured"} />
                      <DetailRow label="Next block duration" value={pkg.nextBlockDuration ? `${pkg.nextBlockDuration} mins` : "Not configured"} />
                    </>
                  )}
                  {pkg.type === "Hourly" && (
                    <>
                      <DetailRow label="Base price" value={pkg.basePrice ? formatMoney(pkg.basePrice) : "Not configured"} highlight />
                      <DetailRow label="Duration" value={pkg.duration ? `${pkg.duration} mins` : "Not configured"} />
                      <DetailRow label="Overtime fee" value={pkg.overtimeFee ? formatMoney(pkg.overtimeFee) : "Not configured"} />
                      <DetailRow label="No-show fee" value={pkg.noShowFee ? formatMoney(pkg.noShowFee) : "Not configured"} />
                    </>
                  )}
                  {pkg.type === "Monthly" && (
                    <>
                      <DetailRow label="Monthly price" value={pkg.monthlyPrice ? formatMoney(pkg.monthlyPrice) : "Not configured"} highlight />
                      <DetailRow label="Vehicle limit" value={pkg.vehicleLimit ? `${pkg.vehicleLimit} vehicle(s)` : "Not configured"} />
                      <DetailRow label="Fixed slot" value={pkg.fixedSlotEnabled ? "Enabled" : "Disabled"} />
                      <DetailRow label="Unlimited entry" value={pkg.unlimitedEntryEnabled ? "Enabled" : "Disabled"} />
                    </>
                  )}
                  {pkg.type === "Penalty" && (
                    <>
                      <DetailRow label="Fee amount" value={pkg.feeAmount ? formatMoney(pkg.feeAmount) : "Not configured"} highlight />
                      <DetailRow label="Description" value={pkg.feeDescription || "Not configured"} />
                    </>
                  )}
                  {!["Guest", "Hourly", "Monthly", "Penalty"].includes(pkg.type) && (
                    <>
                      <DetailRow label="Base price" value={pkg.basePrice ? formatMoney(pkg.basePrice) : "Not configured"} highlight />
                      <DetailRow label="Duration" value={pkg.duration ? `${pkg.duration} mins` : "Not configured"} />
                    </>
                  )}
                </div>
              </FormSection>

              {["Guest", "Hourly"].includes(pkg.type) && (
                <FormSection title="Pricing Simulation" icon={Gauge}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[1, 2, 3, 4].map((hours) => (
                      <div key={hours} className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-[#111] p-3 text-center">
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{hours} Hour{hours > 1 && "s"}</span>
                        <span className="mt-1 text-sm font-black text-[#F5C542]">
                          {formatMoney(calculateSimulation(pkg, hours, customTypes))}
                        </span>
                      </div>
                    ))}
                  </div>
                </FormSection>
              )}
            </div>

            {/* Right Column: Package Metadata */}
            <div className="grid gap-6">
              <FormSection title="Package Metadata" icon={Layers}>
                <div className="rounded-2xl border border-white/5 bg-[#0A0A0A]/50 p-2 shadow-inner">
                  <DetailRow label="Status" value={pkg.status || "Not configured"} />
                  <DetailRow label="Type" value={pkg.type || "Not configured"} />
                  <DetailRow label="Applies to" value={pkg.appliesTo || "Not configured"} />
                  <DetailRow label="Pricing mode" value={pkg.packageTypeId?.pricingMode || "Not configured"} />
                  <DetailRow label="Created date" value={pkg.createdAt ? formatDate(pkg.createdAt) : "Not configured"} />
                  <DetailRow label="Updated date" value={pkg.updatedAt ? formatDate(pkg.updatedAt) : "Not configured"} />
                </div>
              </FormSection>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function TicketPackages() {
  const [packages, setPackages] = useState([]);
  const [customPackageTypes, setCustomPackageTypes] = useState([]);
  const [packageTypeFilter, setPackageTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [loading, setLoading] = useState(true);
  const [pageMode, setPageMode] = useState("list");
  const [showPackageTypeModal, setShowPackageTypeModal] = useState(false);
  const [form, setForm] = useState(emptyPackage);
  const [toast, setToast] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState(null);

  const makeApiCall = async (method, endpoint, body) => {
    const token = localStorage.getItem("accessToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    console.log(`[makeApiCall] Request: ${method} ${endpoint}`);
    const res = await apiFetch(endpoint, options);
    console.log(`[makeApiCall] Response ${res.status}:`, res.data);
    if (!res.ok) {
      const error = new Error(res.data?.message || "API error");
      error.response = { data: res.data };
      throw error;
    }
    return res;
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const [typeRes, pkgRes] = await Promise.all([
        makeApiCall("GET", "/admin/package-types"),
        makeApiCall("GET", "/admin/ticket-packages")
      ]);

      console.log("packageTypes response", typeRes);
      console.log("ticketPackages response", pkgRes);

      const typesArray = typeRes.data?.data || typeRes.data?.packageTypes || (Array.isArray(typeRes.data) ? typeRes.data : []);
      setCustomPackageTypes(typesArray.map(t => {
        let shortType = t.name;
        if (t.name === "Guest Hourly") shortType = "Guest";
        if (t.name === "Customer Hourly") shortType = "Hourly";
        if (t.name === "Monthly Pass") shortType = "Monthly";
        if (t.name === "Fee Rule") shortType = "Penalty";
        return {
          ...t,
          value: shortType,
        };
      }));

      const pkgsArray = pkgRes.data?.data || pkgRes.data?.packages || (Array.isArray(pkgRes.data) ? pkgRes.data : []);
      setPackages(pkgsArray.map(p => ({
        ...p,
        id: p._id,
        type: p.packageTypeName === "Guest Hourly" ? "Guest" :
              p.packageTypeName === "Customer Hourly" ? "Hourly" :
              p.packageTypeName === "Monthly Pass" ? "Monthly" :
              p.packageTypeName === "Fee Rule" ? "Penalty" : p.packageTypeName
      })));
    } catch (err) {
      console.error("TicketPackages load error", err);
      const msg = err.message && err.message !== "API error" ? err.message : "Failed to load data from backend.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const packageTypeOptions = useMemo(() => {
    const countByType = (type) => packages.filter((pkg) => pkg.type === type).length;
    return [
      { value: "All", label: "All Packages", count: packages.length, icon: Layers },
      ...customPackageTypes.map((type) => ({
        value: type.value,
        label: type.name,
        count: countByType(type.value),
        icon: customTypeIcons[type.icon] || Ticket,
      })),
    ];
  }, [customPackageTypes, packages]);

  const sortOptions = useMemo(
    () => [
      { value: "Newest", label: "Newest", icon: CalendarDays },
      { value: "Oldest", label: "Oldest", icon: CalendarDays },
      { value: "PriceDesc", label: "Price: High to Low", icon: WalletCards },
      { value: "PriceAsc", label: "Price: Low to High", icon: WalletCards },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "All", label: "Any Status", dot: "bg-[#94A3B8]" },
      { value: "Active", label: "Active", dot: "bg-[#00D084]" },
      { value: "Inactive", label: "Inactive", dot: "bg-[#FF5A5A]" },
    ],
    [],
  );

  const filteredPackages = useMemo(() => {
    const term = search.toLowerCase().trim();
    return packages
      .filter((pkg) => packageTypeFilter === "All" || pkg.type === packageTypeFilter)
      .filter((pkg) => statusFilter === "All" || pkg.status === statusFilter)
      .filter(
        (pkg) =>
          !term ||
          pkg.name.toLowerCase().includes(term) ||
          pkg.code.toLowerCase().includes(term),
      )
      .sort((a, b) => {
        if (sortOrder === "PriceDesc") return sortablePrice(b) - sortablePrice(a);
        if (sortOrder === "PriceAsc") return sortablePrice(a) - sortablePrice(b);

        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        const diff = (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        return sortOrder === "Newest" ? diff : -diff;
      });
  }, [packageTypeFilter, packages, search, sortOrder, statusFilter]);

  useEffect(() => {
    if (!filteredPackages.length) {
      setSelectedPackageId(null);
      return;
    }
    if (!filteredPackages.some((pkg) => pkg.id === selectedPackageId)) {
      setSelectedPackageId(filteredPackages[0].id);
    }
  }, [filteredPackages, selectedPackageId]);

  const selectedPackage =
    packages.find((pkg) => pkg.id === selectedPackageId) ||
    filteredPackages[0] ||
    null;

  const summary = useMemo(
    () => ({
      total: packages.length,
      hourly: packages.filter(
        (pkg) => pkg.type === "Hourly" || pkg.type === "Guest",
      ).length,
      monthly: packages.filter((pkg) => pkg.type === "Monthly").length,
      active: packages.filter((pkg) => pkg.status === "Active").length,
    }),
    [packages],
  );

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const refresh = () => {
    fetchPackages();
  };

  const openAdd = () => {
    setForm({
      ...emptyPackage,
      code: `PKG-${String(packages.length + 1).padStart(3, "0")}`,
    });
    setPageMode("add");
  };

  const openEdit = (pkg) => {
    setForm(pkg);
    setSelectedPackageId(pkg.id);
    setPageMode("edit");
  };

  const createPackageType = async (newType) => {
    const name = newType.name.trim();
    const exists = [
      "Guest Hourly",
      "Customer Hourly",
      "Monthly Pass",
      "Fee Rule",
      ...customPackageTypes.map((type) => type.name),
    ].some((typeName) => typeName.toLowerCase() === name.toLowerCase());

    if (!name || exists || !newType.pricingMode) return null;

    try {
      const res = await makeApiCall("POST", "/admin/package-types", {
        name,
        description: newType.description || "",
        icon: newType.icon || "Ticket",
        pricingMode: newType.pricingMode
      });
      if (res.data?.success) {
        const created = {
          ...res.data.data,
          value: res.data.data.name,
        };
        setCustomPackageTypes((prev) => [...prev, created]);
        setShowPackageTypeModal(false);
        showToast("Package type created successfully.");
        return created;
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create package type.");
    }
    return null;
  };

  const openDetail = (pkg) => {
    setSelectedPackageId(pkg.id);
    setPageMode("detail");
  };

  const backToList = () => {
    setPageMode("list");
  };

  const savePackage = async () => {
    const validationErrors = validateTicketPackage(form, customPackageTypes);
    if (Object.keys(validationErrors).length) {
      showToast("Please complete required fields before saving.");
      return;
    }

    let packageTypeName = form.type;
    if (form.type === "Guest") packageTypeName = "Guest Hourly";
    if (form.type === "Hourly") packageTypeName = "Customer Hourly";
    if (form.type === "Monthly") packageTypeName = "Monthly Pass";
    if (form.type === "Penalty") packageTypeName = "Fee Rule";

    const payload = {
      ...form,
      packageTypeName
    };

    try {
      let res;
      if (pageMode === "edit" && form.id) {
        res = await makeApiCall("PUT", `/admin/ticket-packages/${form.id}`, payload);
      } else {
        res = await makeApiCall("POST", "/admin/ticket-packages", payload);
      }
      if (res.data?.success) {
        await fetchPackages();
        setSelectedPackageId(res.data.data._id);
        setPageMode("list");
        showToast(pageMode === "edit" ? "Ticket package updated." : "Ticket package created.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save package.";
      if (err.response?.data?.errors) {
        showToast(err.response.data.errors[0]?.message || msg);
      } else {
        showToast(msg);
      }
    }
  };

  const deletePackage = async (id) => {
    try {
      const res = await makeApiCall("DELETE", `/admin/ticket-packages/${id}`);
      if (res.data?.success) {
        const index = packages.findIndex((pkg) => pkg.id === id);
        const fallback = packages[index + 1] || packages[index - 1] || null;
        await fetchPackages();
        setSelectedPackageId(fallback?.id || null);
        setPageMode("list");
        showToast("Ticket package deleted.");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete package.");
    }
  };

  if (pageMode === "add" || pageMode === "edit") {
    return (
      <PackageFormPage
        mode={pageMode}
        form={form}
        setForm={setForm}
        customTypes={customPackageTypes}
        onBack={backToList}
        onSave={savePackage}
        onInvalid={() => showToast("Please complete required fields before saving.")}
      />
    );
  }

  if (pageMode === "detail") {
    return (
      <PackageDetailsPage
        pkg={selectedPackage}
        customTypes={customPackageTypes}
        onBack={backToList}
        onEdit={openEdit}
        onDelete={deletePackage}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-70px)] bg-[#030303] text-[#F8FAFC] relative overflow-hidden">
      {/* Background Lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] h-[60%] w-[50%] rounded-full bg-[#F5C542]/[0.05] blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[50%] w-[40%] rounded-full bg-[#E5A522]/[0.03] blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300">
        <header className="bg-[#080808]/80 px-8 pt-2 pb-2.5 border-b border-white/[0.06] flex-shrink-0 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Ticket Packages
              </h1>
              <p className="text-sm text-white/40 mt-0.5 max-w-xl leading-snug">
                Configure tickets, pricing rules, and monthly passes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                disabled={loading}
              >
                <RefreshCw
                  size={20}
                  className={cx(
                    "transition-transform",
                    loading && "animate-spin",
                  )}
                />
              </button>

              <button
                onClick={() => setShowPackageTypeModal(true)}
                className="flex items-center gap-2 rounded-xl border border-[#F5C542]/30 bg-[#F5C542]/10 px-4 py-2.5 text-sm font-black text-[#F5C542] transition-all hover:-translate-y-0.5 hover:bg-[#F5C542] hover:text-black hover:shadow-[0_0_24px_rgba(245,197,66,0.22)]"
              >
                <Layers size={16} />
                <span>+ Add Package Type</span>
              </button>

              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-semibold hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all hover:-translate-y-0.5"
              >
                <PackagePlus size={18} />
                <span>+ Add Ticket Package</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-3">
          <SummaryCard
            icon={WalletCards}
            label="Total Packages"
            value={summary.total}
            subtitle="Configured tickets"
            gradient="from-cyan-400 to-blue-500"
            glow="rgba(34,211,238,0.4)"
          />
          <SummaryCard
            icon={Clock3}
            label="Hourly Packages"
            value={summary.hourly}
            subtitle="Guest and booking"
            gradient="from-indigo-400 to-purple-500"
            glow="rgba(129,140,248,0.4)"
          />
          <SummaryCard
            icon={CreditCard}
            label="Monthly Passes"
            value={summary.monthly}
            subtitle="Subscriptions"
            gradient="from-emerald-400 to-teal-500"
            glow="rgba(52,211,153,0.4)"
          />
          <SummaryCard
            icon={Gauge}
            label="Active Packages"
            value={summary.active}
            subtitle="Ready at gates"
            gradient="from-amber-400 to-orange-500"
            glow="rgba(251,191,36,0.4)"
          />
          </div>
        </header>

        <section className="relative z-40 flex flex-wrap items-center gap-3 overflow-visible px-8 py-2 flex-shrink-0 bg-[#080808]/80 backdrop-blur-xl">
            <div className="relative group w-full flex-1 min-w-[260px] lg:max-w-[450px]">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition-colors group-focus-within:text-[#F5C542]"
              />
              <input
                className="h-[42px] w-full rounded-xl border border-white/10 bg-[#101010]/90 py-2.5 pl-10 pr-4 text-sm text-[#F8FAFC] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all placeholder:text-[#94A3B8]/40 focus:border-[#F5C542]/50 focus:ring-1 focus:ring-[#F5C542]/30"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search packages by name or code..."
              />
            </div>

            <CustomDropdown
              value={packageTypeFilter}
              options={packageTypeOptions}
              onChange={setPackageTypeFilter}
              className="w-full sm:w-[230px]"
            />

            <CustomDropdown
              value={sortOrder}
              options={sortOptions}
              onChange={setSortOrder}
              className="w-full sm:w-[190px]"
            />

            <CustomDropdown
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
              className="w-full sm:w-[165px]"
            />
        </section>

        <main className="flex-1 overflow-auto min-h-0 px-8 py-6">
          <section className="relative min-h-[600px]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                Packages
              </p>
              <p className="text-sm font-medium text-white/40">
                Showing {filteredPackages.length} packages
              </p>
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-[1.5rem] bg-white/[0.03] border border-white/5"
                  />
                ))}
              </div>
            ) : filteredPackages.length ? (
              <motion.div
                layout
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                <AnimatePresence>
                  {filteredPackages.map((pkg, index) => (
                    <PackageListItem
                      key={pkg.id}
                      pkg={pkg}
                      index={index}
                      onView={openDetail}
                      onEdit={openEdit}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/[0.01]">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                  <AlertTriangle size={32} className="text-[#F5C542]" />
                </div>
                <p className="text-xl font-black text-white">
                  No ticket packages found
                </p>
                <p className="mt-2 text-[#94A3B8]">
                  Your package filters yielded zero results.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>

      <CustomPackageTypeCreator
        open={showPackageTypeModal}
        existingNames={[
          "Guest Hourly",
          "Customer Hourly",
          "Monthly Pass",
          "Fee Rule",
          ...customPackageTypes.map((type) => type.name),
        ]}
        onCreate={createPackageType}
        onCancel={() => setShowPackageTypeModal(false)}
        showToast={showToast}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#F5C542]/30 bg-[#1A1A1A]/90 px-6 py-3.5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5C542] opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#F5C542]"></span>
            </span>
            <span className="text-sm font-bold tracking-wide text-white">
              {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
