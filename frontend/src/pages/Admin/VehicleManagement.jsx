import { useState, useEffect, useRef } from 'react';
import {
  Upload, Trash2, RefreshCw, CheckCircle2, AlertCircle,
  Car, Loader2, FileBox, X, Eye, Palette, Check, Zap, Image,
  Clock, Box,
} from 'lucide-react';
import { apiFetch, API_BASE } from '../../services/api';
import CarViewer from '../../components/CarViewer';
import { formatLicensePlateDisplay } from '../../utils/licensePlate';

// ── helpers ────────────────────────────────────────────────────────────────
const authHeader = () => {
  const t = localStorage.getItem('accessToken');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const normalizeSlug = (s = '') =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const previewPublicId = (brand, model) =>
  `vehicles/${normalizeSlug(brand) || '…'}/${normalizeSlug(model || 'default') || '…'}`;

/** Find the 3D model that matches vehicle brand+model. Prefer exact match and fallback to default. */
const findMatchingModel = (models, brand, vehicleModel) => {
  const brandSlug = normalizeSlug(brand);
  const modelSlug = normalizeSlug(vehicleModel);
  const exactKey = `vehicles/${brandSlug}/${modelSlug}`;
  const defaultKey = `vehicles/${brandSlug}/default`;
  return (
    models.find((m) => m.publicId === exactKey) ||
    models.find((m) => m.publicId === defaultKey) ||
    null
  );
};

// ── API helpers ────────────────────────────────────────────────────────────
const fetchModelsAPI = () =>
  apiFetch('/admin/vehicles/models', { headers: authHeader() });

const uploadModelAPI = async (brand, vehicleModel, file) => {
  const fd = new FormData();
  fd.append('brand', brand);
  fd.append('model', vehicleModel || 'default');
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/admin/vehicles/upload-model`, {
    method: 'POST',
    headers: authHeader(),
    body: fd,
  });
  const data = await res.json();
  return { ok: res.ok, data };
};

const deleteModelAPI = (brand, vehicleModel) =>
  apiFetch('/admin/vehicles/upload-model', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ brand, model: vehicleModel }),
  });

const syncModelsAPI = () =>
  apiFetch('/admin/vehicles/sync-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
  });

// ── 3D Preview Modal ───────────────────────────────────────────────────────
function PreviewModal({ model, onClose }) {
  const [color, setColor] = useState('#c0392b');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gray-950">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="font-bold text-white text-sm">{model.publicId}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {(model.bytes / 1024).toFixed(0)} KB &nbsp;·&nbsp;
              {new Date(model.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition">
            <X size={18} />
          </button>
        </div>
        <div className="relative h-72 sm:h-80 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
          <CarViewer modelUrl={model.url} carColor={color} height={320} />
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10 bg-gray-950">
          <Palette size={15} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 shrink-0">Paint color test:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#ecf0f1', '#1a1a1a'].map((c) => (
              <button key={c} onClick={() => setColor(c)} title={c}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color === c ? 'border-white scale-110' : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded-full cursor-pointer border border-white/20 bg-transparent p-0"
              title="Color options"
            />
          </div>
          <span className="ml-auto font-mono text-xs text-gray-500">{color}</span>
        </div>
      </div>
    </div>
  );
}

// ── Pending vehicle card ───────────────────────────────────────────────────
function PendingCard({ vehicle, models, processing, onApprove, onReject, onPreviewImage, onPreview3D }) {
  const matched = findMatchingModel(models, vehicle.brand, vehicle.model);
  const [localFile, setLocalFile] = useState(null);
  const fileRef = useRef();
  const typeLabel = { car: 'Car', electric_car: 'Electric car' }[vehicle.vehicleType] || vehicle.vehicleType;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#171717] shadow-sm flex flex-col sm:flex-row gap-4 p-5">

      {/* Registration card image */}
      <div
        className="shrink-0 w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-black/30
          border border-white/10 flex items-center justify-center cursor-pointer group relative"
        onClick={() => vehicle.registrationCardImage && onPreviewImage(vehicle.registrationCardImage)}
      >
        {vehicle.registrationCardImage ? (
          <>
            <img src={vehicle.registrationCardImage} alt="Vehicle registration card" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <Image size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Image size={24} />
            <span className="text-[10px]">No image</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-black text-base text-white">
            {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'No name yet'}
          </h3>
          <span className="text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5">
            ⏳ Pending approval
          </span>
        </div>

        <p className="text-lg font-black font-mono text-gray-200 tracking-widest mb-2">
          {formatLicensePlateDisplay(vehicle.licensePlateDisplay || vehicle.licensePlate)}
        </p>

        <div className="flex items-center gap-2 flex-wrap text-sm text-gray-400 mb-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">
            {vehicle.vehicleType === 'electric_car' ? <Zap size={11} /> : <Car size={11} />}
            {typeLabel}
          </span>
          {vehicle.hexColor && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3.5 h-3.5 rounded-full border border-white/20"
                style={{ backgroundColor: vehicle.hexColor }} />
              <span className="font-mono text-xs">{vehicle.hexColor}</span>
            </span>
          )}
          <span>
            Owner:&nbsp;
            <span className="font-semibold text-gray-200">
              {vehicle.owner?.name || vehicle.owner?.email || '—'}
            </span>
          </span>
        </div>

        {/* Model 3D section */}
        {matched ? (
          // ✅ Model exists -> auto attach and show badge
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-400">3D model exists - it will auto attach on approval</span>
            <code className="text-[10px] font-mono text-gray-400 truncate ml-1">{matched.publicId}</code>
            <button
              onClick={() => onPreview3D(matched)}
              className="ml-auto p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition"
              title="Xem 3D"
            >
              <Eye size={13} />
            </button>
          </div>
        ) : (
          // No model yet -> allow inline upload
          <div
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-3 flex items-center gap-3 transition
              ${localFile
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : 'border-white/15 hover:border-yellow-500/40 hover:bg-yellow-500/5'
              }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".glb"
              className="hidden"
              onChange={(e) => setLocalFile(e.target.files[0] ?? null)}
            />
            {localFile ? (
              <>
                <FileBox size={18} className="text-yellow-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-yellow-500 truncate">{localFile.name}</p>
                  <p className="text-[10px] text-gray-400">{(localFile.size / 1024 / 1024).toFixed(2)} MB · will upload on approval</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setLocalFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="p-1 rounded text-gray-400 hover:text-red-400 transition"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <Upload size={16} className="text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">
                  No 3D model yet —&nbsp;
                  <span className="text-yellow-500 font-semibold">click to attach .glb</span>
                  &nbsp;(optional)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Approve / Reject */}
      <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0">
        <button
          onClick={() => onApprove(vehicle, matched?.url ?? null, localFile)}
          disabled={processing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
            bg-green-500 hover:bg-green-400 text-white transition-colors disabled:opacity-50
            shadow-md shadow-green-500/20"
        >
          {processing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Approve
        </button>
        <button
          onClick={() => onReject(vehicle._id)}
          disabled={processing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
            border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <X size={14} />
          Reject
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-white/10 bg-black ' +
  'px-3.5 py-2.5 text-sm text-white placeholder-gray-500 ' +
  'focus:outline-none focus:ring-1 focus:ring-yellow-500/50 transition shadow-inner';

export default function VehicleManagement() {
  const [tab, setTab] = useState('pending');

  // ── Shared state ──
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [preview3D, setPreview3D] = useState(null);

  // ── Pending tab state ──
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [previewImg, setPreviewImg] = useState(null);

  // ── Models tab state ──
  const [brand, setBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadModels = async () => {
    setModelsLoading(true);
    const { ok, data } = await fetchModelsAPI();
    if (ok) setModels(data.data || []);
    setModelsLoading(false);
  };

  const loadPending = async () => {
    setPendingLoading(true);
    const res = await apiFetch('/admin/vehicles/pending', { headers: authHeader() });
    setPendingLoading(false);
    if (res.ok) setPending(res.data?.data || []);
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadModels();
      loadPending();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  // ── Approve handler ────────────────────────────────────────────────────────
  const handleApprove = async (vehicle, existingModelUrl, localFile) => {
    setProcessing((p) => ({ ...p, [vehicle._id]: true }));

    let finalModelUrl = existingModelUrl;

    // If admin attaches a new file -> upload first
    if (localFile) {
      const { ok, data } = await uploadModelAPI(vehicle.brand, vehicle.model, localFile);
      if (ok) {
        finalModelUrl = data.data?.url ?? existingModelUrl;
        showToast(`Upload model: ${data.data?.publicId}`);
        await loadModels(); // refresh the model list
      } else {
        showToast(data.message || 'Model upload failed', 'error');
        setProcessing((p) => ({ ...p, [vehicle._id]: false }));
        return;
      }
    }

    const res = await apiFetch(`/admin/vehicles/${vehicle._id}/approve`, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify({ modelUrl: finalModelUrl || undefined }),
    });
    setProcessing((p) => ({ ...p, [vehicle._id]: false }));
    if (res.ok) {
      showToast('Vehicle approved ✓');
      setPending((v) => v.filter((x) => x._id !== vehicle._id));
    } else {
      showToast(res.data?.message || 'Approval failed', 'error');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Confirm rejection and delete this vehicle?')) return;
    setProcessing((p) => ({ ...p, [id]: true }));
    const res = await apiFetch(`/admin/vehicles/${id}/reject`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    setProcessing((p) => ({ ...p, [id]: false }));
    if (res.ok) {
      showToast('Vehicle rejected');
      setPending((v) => v.filter((x) => x._id !== id));
    } else {
      showToast(res.data?.message || 'Action failed', 'error');
    }
  };

  // ── Upload model handler ───────────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!brand.trim()) return showToast('Enter Brand first', 'error');
    if (!uploadFile) return showToast('Choose a .glb file first', 'error');
    setUploading(true);
    const { ok, data } = await uploadModelAPI(brand, vehicleModel, uploadFile);
    setUploading(false);
    if (ok) {
      const synced = data.data?.vehiclesSynced ?? 0;
      showToast(`Uploaded: ${data.data?.publicId}${synced ? ` · updated ${synced} vehicles` : ''}`);
      setBrand(''); setVehicleModel(''); setUploadFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadModels();
    } else {
      showToast(data.message || 'Upload failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const parts = deleteTarget.split('/');
    const { ok, data } = await deleteModelAPI(parts[1] ?? '', parts[2] ?? 'default');
    setDeleteTarget(null);
    if (ok) {
      const synced = data?.data?.vehiclesSynced ?? 0;
      showToast(`Model deleted${synced ? ` · removed 3D from ${synced} vehicles` : ''}`);
      await loadModels();
    } else {
      showToast(data?.message || 'Delete failed', 'error');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const { ok, data } = await syncModelsAPI();
    setSyncing(false);
    if (ok) showToast(`Sync complete · ${data.data?.updated ?? 0} vehicles updated`);
    else showToast(data?.message || 'Sync failed', 'error');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 mx-auto min-h-[calc(100vh-70px)] overflow-auto bg-[#080808]">
      <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">
            <Car size={12} /> Vehicles
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Vehicles &amp; 3D Models</h1>
          <p className="text-gray-400 text-sm mt-1">Approve vehicles, upload 3D models, and sync everything on one page.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl bg-[#171717] border border-white/10 mb-8 w-fit shadow-sm">
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'pending'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Clock size={15} />
          Pending vehicles
          {pending.length > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('models')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'models'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Box size={15} />
          Models 3D
          <span className="text-[10px] font-semibold text-gray-400">({models.length})</span>
        </button>
      </div>

      {/* ══════════════ TAB: PENDING VEHICLES ══════════════ */}
      {tab === 'pending' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pending.length > 0
                ? `${pending.length} vehicles pending approval`
                : 'No vehicles pending approval'}
            </p>
            <button
              onClick={loadPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10
                text-xs font-semibold text-gray-300
                hover:border-yellow-500/40 hover:text-yellow-500 transition-all"
            >
              <RefreshCw size={13} className={pendingLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {pendingLoading && (
            <div className="flex justify-center py-24">
              <Loader2 size={28} className="animate-spin text-yellow-500" />
            </div>
          )}

          {!pendingLoading && pending.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10
              bg-white/[0.02] flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 size={32} className="text-green-400 mb-3" />
              <p className="font-bold text-gray-300">All vehicles have been approved</p>
              <p className="text-sm text-gray-400 mt-1">No vehicles are pending approval</p>
            </div>
          )}

          {!pendingLoading && pending.length > 0 && (
            <div className="flex flex-col gap-4">
              {pending.map((v) => (
                <PendingCard
                  key={v._id}
                  vehicle={v}
                  models={models}
                  processing={!!processing[v._id]}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onPreviewImage={setPreviewImg}
                  onPreview3D={setPreview3D}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB: MODELS 3D ══════════════ */}
      {tab === 'models' && (
        <div>
          {/* Top actions */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload .glb for each vehicle brand. The backend automatically matches when the user registers a vehicle.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-yellow-500/40
                  bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400
                  text-xs font-bold transition disabled:opacity-50"
                title="Sync modelUrl for all existing vehicles"
              >
                {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Sync vehicles
              </button>
              <button
                onClick={loadModels}
                className="p-2.5 rounded-xl border border-white/10
                  hover:bg-white/10 transition"
                title="Refresh list"
              >
                <RefreshCw size={15} className={modelsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Convention note */}
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/8 px-5 py-4 mb-6 text-sm">
            <p className="font-bold text-yellow-600 dark:text-yellow-400 mb-1">Cloudinary naming rules</p>
            <p className="text-gray-700 dark:text-gray-300">
              Public ID:&nbsp;
              <code className="font-mono bg-white/50 dark:bg-white/10 px-1.5 py-0.5 rounded">
                vehicles/&#123;brand&#125;/&#123;model&#125;
              </code>
            </p>
            <ul className="mt-2 space-y-0.5 text-gray-600 dark:text-gray-400 list-disc list-inside text-xs">
              <li>Automatically convert to lowercase-slug (spaces to hyphens)</li>
              <li>VD: <strong>Toyota</strong> + <strong>Land Cruiser</strong> → <code className="font-mono">vehicles/toyota/land-cruiser</code></li>
              <li>Leave Model blank to use <code className="font-mono">default</code> (fallback for the whole brand)</li>
            </ul>
          </div>

          {/* Upload form */}
          <form
            onSubmit={handleUpload}
            className="rounded-3xl border border-white/10 bg-[#171717] p-6 mb-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-white mb-5">Upload new model</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold mb-1 block">
                  Brand <span className="text-red-500">*</span>
                </label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold mb-1 block">
                  Model <span className="text-gray-400">(blank = default)</span>
                </label>
                <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Land Cruiser" className={inputCls} />
              </div>
            </div>

            {brand && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Cloudinary path:&nbsp;
                <code className="font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-yellow-600 dark:text-yellow-400">
                  {previewPublicId(brand, vehicleModel)}
                </code>
              </p>
            )}

            <div
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 flex flex-col items-center gap-2 transition mb-5
                ${uploadFile
                  ? 'border-yellow-500/50 bg-yellow-500/5'
                  : 'border-white/15 hover:border-yellow-500/40 hover:bg-yellow-500/5'
                }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".glb"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files[0] ?? null)}
              />
              {uploadFile ? (
                <>
                  <FileBox size={28} className="text-yellow-500" />
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{uploadFile.name}</p>
                  <p className="text-xs text-gray-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <Upload size={28} className="text-gray-400" />
                  <p className="text-sm text-gray-500">Click to choose a file <strong>.glb</strong></p>
                  <p className="text-xs text-gray-400">Maximum 50 MB</p>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading || !brand || !uploadFile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400
                disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-bold transition-colors"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {uploading ? 'Uploading...' : 'Upload Model'}
            </button>
          </form>

          {/* Models list */}
          <div className="rounded-3xl border border-white/10 bg-[#171717] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                Model list ({models.length})
              </h2>
            </div>

            {modelsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-yellow-500" />
              </div>
            ) : models.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Car size={28} className="text-gray-300 dark:text-white/20" />
                <p className="text-sm text-gray-500">No models yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {models.map((m) => (
                  <li key={m.publicId}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] group transition">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <Car size={16} className="text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white font-mono truncate">{m.publicId}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {(m.bytes / 1024).toFixed(0)} KB &nbsp;·&nbsp; {new Date(m.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <a href={m.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline hidden sm:block shrink-0">
                      URL
                    </a>
                    <button onClick={() => setPreview3D(m)}
                      className="p-2 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 transition opacity-0 group-hover:opacity-100"
                      title="Xem 3D">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => setDeleteTarget(m.publicId)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                      title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Shared modals ── */}

      {/* 3D Preview Modal */}
      {preview3D && <PreviewModal model={preview3D} onClose={() => setPreview3D(null)} />}

      {/* Image lightbox */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={previewImg} alt="Vehicle registration card" className="w-full rounded-2xl shadow-2xl" />
            <button onClick={() => setPreviewImg(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#171717] rounded-3xl border border-white/10 shadow-2xl p-7 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-500" />
              </div>
              <p className="font-bold text-white">Delete this model?</p>
            </div>
            <p className="text-sm text-gray-400 mb-6 font-mono bg-white/5 rounded-lg px-3 py-2">
              {deleteTarget}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-semibold hover:bg-white/5 transition">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-bold transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5
          px-5 py-2.5 rounded-full text-sm font-semibold shadow-2xl backdrop-blur-md border transition-all
          ${toast.type === 'success'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30'
          }`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}
      </div>
    </div>
  );
}
