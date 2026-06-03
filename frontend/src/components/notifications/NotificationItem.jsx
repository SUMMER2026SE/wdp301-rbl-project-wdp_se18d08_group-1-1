import {
  Bell, Wallet, Car, CalendarCheck, CreditCard, Shield, Megaphone,
  Camera, Info, CheckCircle2, AlertTriangle, XCircle, Trash2, Eye
} from 'lucide-react';

// ─── Type → icon/color mapping ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  SYSTEM:    { icon: Shield,        color: 'text-blue-400',    bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  PARKING:   { icon: Car,           color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  BOOKING:   { icon: CalendarCheck, color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
  WALLET:    { icon: Wallet,        color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  PAYMENT:   { icon: CreditCard,    color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  ACCOUNT:   { icon: Shield,        color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20' },
  PROMOTION: { icon: Megaphone,     color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
  CAMERA:    { icon: Camera,        color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
};

const PRIORITY_CONFIG = {
  INFO:    { icon: Info,           color: 'text-blue-400' },
  SUCCESS: { icon: CheckCircle2,   color: 'text-emerald-400' },
  WARNING: { icon: AlertTriangle,  color: 'text-amber-400' },
  ERROR:   { icon: XCircle,        color: 'text-red-400' },
};

// ─── Time ago helper ────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

/**
 * NotificationItem — a single notification card.
 *
 * Props:
 * - notification: object { title, content, type, priority, isRead, createdAt, notificationId/_id }
 * - onRead: (id) => void
 * - onDelete: (id) => void
 * - compact: boolean — true for dropdown, false for full page
 * - onClick: () => void
 */
export default function NotificationItem({ notification, onRead, onDelete, compact = false, onClick }) {
  const n = notification;
  const id = n.notificationId || n._id;
  const typeConf = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
  const priorityConf = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.INFO;
  const TypeIcon = typeConf.icon;

  const handleClick = () => {
    if (!n.isRead && onRead) onRead(id);
    if (onClick) onClick();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(id);
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={`
          flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-200
          border-b border-white/5 last:border-0
          ${n.isRead
            ? 'hover:bg-white/[0.03]'
            : 'bg-yellow-500/[0.03] hover:bg-yellow-500/[0.06]'}
        `}
      >
        {/* Type icon */}
        <div className={`w-8 h-8 rounded-lg ${typeConf.bg} ${typeConf.border} border flex items-center justify-center shrink-0 mt-0.5`}>
          <TypeIcon size={14} className={typeConf.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className={`text-xs font-semibold truncate ${n.isRead ? 'text-gray-400' : 'text-gray-200'}`}>
              {n.title}
            </p>
            {!n.isRead && (
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.content}</p>
          <p className="text-[10px] text-gray-600 mt-1">{timeAgo(n.createdAt)}</p>
        </div>
      </div>
    );
  }

  // ── Full size (for NotificationCenter) ──
  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300
        border
        ${n.isRead
          ? 'bg-[#111111] border-white/5 hover:border-white/10'
          : 'bg-yellow-500/[0.03] border-yellow-500/10 hover:border-yellow-500/20'}
      `}
    >
      {/* Unread dot */}
      {!n.isRead && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      )}

      {/* Type icon */}
      <div className={`w-10 h-10 rounded-xl ${typeConf.bg} ${typeConf.border} border flex items-center justify-center shrink-0`}>
        <TypeIcon size={18} className={typeConf.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-sm font-bold ${n.isRead ? 'text-gray-400' : 'text-gray-100'}`}>
            {n.title}
          </p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${typeConf.bg} ${typeConf.color} uppercase`}>
            {n.type}
          </span>
        </div>
        <p className={`text-xs leading-relaxed ${n.isRead ? 'text-gray-500' : 'text-gray-400'}`}>
          {n.content}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-gray-600">{timeAgo(n.createdAt)}</span>
          <span className={`flex items-center gap-1 text-[10px] ${priorityConf.color}`}>
            {(() => { const PIcon = priorityConf.icon; return <PIcon size={10} />; })()}
            {n.priority}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
        {!n.isRead && onRead && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(id); }}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-emerald-500/20 flex items-center justify-center text-gray-500 hover:text-emerald-400 transition-all"
            title="Đánh dấu đã đọc"
          >
            <Eye size={13} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all"
            title="Xóa"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
