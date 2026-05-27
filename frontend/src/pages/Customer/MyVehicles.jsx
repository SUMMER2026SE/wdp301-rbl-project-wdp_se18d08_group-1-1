import { useState, useEffect, useRef } from 'react';
import {
  Car, Zap, Plus, Trash2, Star, ScanLine,
  Upload, X, Check, Pencil, AlertCircle, Loader2,
} from 'lucide-react';
import {
  getMyVehicles, addVehicle, updateVehicle,
  deleteVehicle, setDefaultVehicle, scanRegistrationCard,
} from '../../services/vehicleService';

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = [
  { value: 'car', label: 'Ô tô', icon: <Car size={15} /> },
  { value: 'electric_car', label: 'Ô tô điện', icon: <Zap size={15} /> },
];

const EMPTY_FORM = {
  licensePlate: '',
  vehicleType: 'car',
  brand: '',
  model: '',
  color: '',
  nickname: '',
};

// ─── Vehicle Card ─────────────────────────────────────────────────────────────
function VehicleCard({ vehicle, onDelete, onSetDefault, onEdit }) {
  const [loading, setLoading] = useState(false);
  const typeObj = VEHICLE_TYPES.find((t) => t.value === vehicle.vehicleType);

  const handleDelete = async () => {
    if (!window.confirm(`Xóa xe "${vehicle.licensePlate}"?`)) return;
    setLoading(true);
    await onDelete(vehicle._id);
    setLoading(false);
  };

  const handleDefault = async () => {
    if (vehicle.isDefault) return;
    setLoading(true);
    await onSetDefault(vehicle._id);
    setLoading(false);
  };

  return (
    <div
      className={`relative rounded-2xl p-5 border transition-all duration-300
        bg-white dark:bg-white/[0.04] backdrop-blur-md
        ${vehicle.isDefault
          ? 'border-yellow-500/40 shadow-[0_0_24px_rgba(234,179,8,0.12)]'
          : 'border-gray-200 dark:border-white/10 hover:border-yellow-500/30 hover:shadow-[0_0_24px_rgba(234,179,8,0.08)]'
        }`}
    >
      {/* Default badge */}
      {vehicle.isDefault && (
        <span className="absolute top-3 right-3 text-[10px] font-bold
          bg-yellow-500/15 text-yellow-500 dark:text-yellow-400
          border border-yellow-500/30 rounded-full px-2 py-0.5 select-none">
          Mặc định
        </span>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20
          flex items-center justify-center text-yellow-500 dark:text-yellow-400 shrink-0">
          {typeObj?.icon ?? <Car size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-gray-900 dark:text-white tracking-wide">
            {vehicle.licensePlate}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {[vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Nickname */}
      {vehicle.nickname && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 italic">
          "{vehicle.nickname}"
        </p>
      )}

      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold
          bg-yellow-500/10 text-yellow-600 dark:text-yellow-400
          border border-yellow-500/20 rounded-full px-2.5 py-0.5">
          {typeObj?.icon}
          {typeObj?.label ?? vehicle.vehicleType}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!vehicle.isDefault && (
          <button
            onClick={handleDefault}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] font-semibold
              text-gray-500 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400
              transition-colors disabled:opacity-50"
            title="Đặt làm xe mặc định"
          >
            <Star size={13} />
            Mặc định
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onEdit(vehicle)}
          disabled={loading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400
            hover:bg-yellow-500/10 transition-all disabled:opacity-50"
          title="Chỉnh sửa"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500
            hover:bg-red-500/10 transition-all disabled:opacity-50"
          title="Xóa xe"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

// ─── Vehicle Modal (Add / Edit) ───────────────────────────────────────────────
function VehicleModal({ editVehicle, onClose, onSaved }) {
  const [form, setForm] = useState(editVehicle
    ? {
        licensePlate: editVehicle.licensePlate,
        vehicleType: editVehicle.vehicleType,
        brand: editVehicle.brand || '',
        model: editVehicle.model || '',
        color: editVehicle.color || '',
        nickname: editVehicle.nickname || '',
      }
    : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const isEdit = !!editVehicle;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // ── Image compression ──
  const compressImage = (file, maxPx = 1024, quality = 0.85) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

  // ── AI scan ──
  const handleScanFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setError('');
    try {
      const base64 = await compressImage(file);
      setScanPreview(base64);
      const res = await scanRegistrationCard(base64);
      if (res.ok && res.data?.data) {
        const { nickname, brand, model, licensePlate } = res.data.data;
        setForm((f) => ({
          ...f,
          nickname: nickname || f.nickname,
          brand: brand || f.brand,
          model: model || f.model,
          licensePlate: licensePlate || f.licensePlate,
        }));
      } else {
        setError(res.data?.message || 'Không đọc được thông tin. Vui lòng nhập tay.');
      }
    } catch {
      setError('Lỗi xử lý ảnh.');
    }
    setScanning(false);
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = isEdit
      ? await updateVehicle(editVehicle._id, form)
      : await addVehicle(form);
    setSaving(false);
    if (res.ok) {
      onSaved(res.data.data, isEdit ? 'updated' : 'added');
    } else {
      const msg = res.data?.errors?.[0]?.message || res.data?.message || 'Đã có lỗi xảy ra.';
      setError(msg);
    }
  };

  const inputCls = `w-full rounded-lg px-3 py-2 text-sm font-medium outline-none
    border transition-all duration-200
    bg-gray-50 border-gray-300 text-gray-900
    focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30
    dark:bg-black/40 dark:border-white/15 dark:text-white
    dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20
    placeholder:text-gray-400 dark:placeholder:text-gray-500`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#111111]
        border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
          border-b border-gray-200 dark:border-white/10">
          <h2 className="font-bold text-base text-gray-900 dark:text-white">
            {isEdit ? 'Chỉnh sửa xe' : 'Thêm xe mới'}
          </h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-160px)]">
          {/* AI Scan Section */}
          {!isEdit && (
            <div className="mb-5 rounded-xl border border-dashed
              border-yellow-500/30 dark:border-yellow-500/20
              bg-yellow-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ScanLine size={15} className="text-yellow-500 dark:text-yellow-400" />
                <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
                  Quét cà vẹt xe bằng AI
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Tải ảnh đăng ký xe để tự động điền thông tin
              </p>

              {scanPreview && (
                <img src={scanPreview} alt="preview"
                  className="w-full h-32 object-cover rounded-lg border
                    border-gray-200 dark:border-white/10 mb-3" />
              )}

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={scanning}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold
                  bg-yellow-500 hover:bg-yellow-400 text-black
                  transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {scanning
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Upload size={13} />}
                {scanning ? 'Đang quét...' : 'Tải ảnh cà vẹt xe'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={handleScanFile} />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-500 dark:text-red-400
                bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* License plate */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1 block">
                Biển số xe *
              </label>
              <input name="licensePlate" value={form.licensePlate}
                onChange={handleChange} required
                placeholder="VD: 51A-123.45"
                className={inputCls} />
            </div>

            {/* Vehicle type */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1.5 block">
                Loại xe *
              </label>
              <div className="flex gap-2">
                {VEHICLE_TYPES.map((t) => (
                  <button key={t.value} type="button"
                    onClick={() => setForm((f) => ({ ...f, vehicleType: t.value }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                      border transition-all duration-200
                      ${form.vehicleType === t.value
                        ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-600 dark:text-yellow-400'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-yellow-500/30'
                      }`}>
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand + Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1 block">
                  Hãng xe
                </label>
                <input name="brand" value={form.brand} onChange={handleChange}
                  placeholder="Toyota, Honda..."
                  className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1 block">
                  Dòng xe
                </label>
                <input name="model" value={form.model} onChange={handleChange}
                  placeholder="Camry, Civic..."
                  className={inputCls} />
              </div>
            </div>

            {/* Color + Nickname */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1 block">
                  Màu sắc
                </label>
                <input name="color" value={form.color} onChange={handleChange}
                  placeholder="Trắng, Đen..."
                  className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1 block">
                  Tên gợi nhớ
                </label>
                <input name="nickname" value={form.nickname} onChange={handleChange}
                  placeholder="Xe gia đình..."
                  className={inputCls} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                  border border-gray-200 dark:border-white/10
                  text-gray-600 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold
                  bg-yellow-500 hover:bg-yellow-400 text-black
                  transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2">
                {saving
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Check size={14} />}
                {isEdit ? 'Lưu thay đổi' : 'Thêm xe'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchVehicles = async () => {
    const { ok, data } = await getMyVehicles();
    if (ok) setVehicles(data.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleSaved = (vehicle, action) => {
    setModalOpen(false);
    setEditVehicle(null);
    fetchVehicles();
    showToast(action === 'updated' ? 'Cập nhật xe thành công ✓' : 'Thêm xe thành công ✓');
  };

  const handleDelete = async (id) => {
    const { ok } = await deleteVehicle(id);
    if (ok) {
      fetchVehicles();
      showToast('Đã xóa xe ✓');
    } else {
      showToast('Xóa xe thất bại', 'error');
    }
  };

  const handleSetDefault = async (id) => {
    const { ok } = await setDefaultVehicle(id);
    if (ok) {
      fetchVehicles();
      showToast('Đã đặt xe mặc định ✓');
    } else {
      showToast('Thao tác thất bại', 'error');
    }
  };

  const openAdd = () => { setEditVehicle(null); setModalOpen(true); };
  const openEdit = (v) => { setEditVehicle(v); setModalOpen(true); };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 md:py-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Xe của tôi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý danh sách phương tiện của bạn
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-yellow-500 hover:bg-yellow-400 text-black
            text-sm font-bold transition-colors shadow-lg shadow-yellow-500/20"
        >
          <Plus size={15} />
          Thêm xe
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-yellow-500" />
        </div>
      ) : vehicles.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-dashed
          border-gray-300 dark:border-white/10
          bg-gray-50 dark:bg-white/[0.02]
          flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20
            flex items-center justify-center mb-4">
            <Car size={24} className="text-yellow-500 dark:text-yellow-400" />
          </div>
          <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
            Chưa có xe nào
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Thêm xe để đặt chỗ nhanh hơn
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-yellow-500 hover:bg-yellow-400 text-black
              text-sm font-bold transition-colors"
          >
            <Plus size={14} />
            Thêm xe đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vehicles.map((v) => (
            <VehicleCard
              key={v._id}
              vehicle={v}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <VehicleModal
          editVehicle={editVehicle}
          onClose={() => { setModalOpen(false); setEditVehicle(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`
          fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]
          flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold
          shadow-2xl backdrop-blur-md border transition-all duration-300
          ${toast.type === 'success'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30'
          }
        `}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
