import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Image as ImageIcon, X, CheckCircle, XCircle, Package, Clock } from 'lucide-react';
import { getServices, createService, updateService, deleteService } from '../../services/extraServiceApi';

const AdminServiceManager = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    timeCost: '30',
    isActive: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await getServices(false);
      if (res.ok && res.data.success) {
        setServices(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch services');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3500);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        price: service.price,
        timeCost: service.timeCost ?? 30,
        isActive: service.isActive,
      });
      setImagePreview(service.imageUrl);
      setImageFile(null);
    } else {
      setEditingService(null);
      setFormData({ name: '', description: '', price: '', timeCost: '30', isActive: true });
      setImagePreview('');
      setImageFile(null);
    }
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('timeCost', formData.timeCost);
      submitData.append('isActive', formData.isActive);

      if (imageFile) {
        submitData.append('image', imageFile);
      } else if (!editingService) {
        throw new Error('Image is required for new services');
      }

      const res = editingService
        ? await updateService(editingService._id, submitData)
        : await createService(submitData);

      if (res.ok && res.data.success) {
        showToast(`Service ${editingService ? 'updated' : 'created'} successfully`);
        fetchServices();
        closeModal();
      } else {
        throw new Error(res.data.message || 'Action failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (service) => {
    setEditingService(service);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await deleteService(editingService._id);
      if (res.ok && res.data.success) {
        showToast('Service deleted successfully');
        fetchServices();
        setIsDeleteModalOpen(false);
        setEditingService(null);
      } else {
        throw new Error(res.data.message || 'Failed to delete service');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared style tokens ── */
  const gold = '#D4AF37';
  const goldGrad = 'linear-gradient(135deg, #C59A3F, #E5C058)';
  const cardBg = 'rgba(255,255,255,0.04)';
  const cardBorder = '1px solid rgba(212,175,55,0.15)';
  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'Montserrat, sans-serif',
  };
  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(212,175,55,0.8)',
    marginBottom: '6px',
  };

  return (
    <div className="relative min-h-screen p-6 max-w-7xl mx-auto">

      {/* ── Toast ── */}
      {toast.show && (
        <div
          className="fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl transition-all duration-300"
          style={{
            background: toast.type === 'error'
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(212,175,55,0.15)',
            border: toast.type === 'error'
              ? '1px solid rgba(239,68,68,0.4)'
              : '1px solid rgba(212,175,55,0.4)',
            backdropFilter: 'blur(16px)',
            minWidth: '280px',
          }}
        >
          {toast.type === 'error'
            ? <XCircle size={18} className="text-red-400 shrink-0" />
            : <CheckCircle size={18} style={{ color: gold }} className="shrink-0" />
          }
          <p className="text-sm font-semibold" style={{ color: toast.type === 'error' ? '#f87171' : gold }}>
            {toast.message}
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-3"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: gold }}
          >
            <Package size={12} /> Service Manager
          </div>
          <h1
            className="text-2xl font-extrabold text-white"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Manage Extra Services
          </h1>
        </div>
        <button
          onClick={() => openModal()}
          className="group relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 hover:-translate-y-0.5"
          style={{ background: goldGrad, color: '#0f0f0f', boxShadow: '0 4px 20px rgba(212,175,55,0.3)' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 28px rgba(212,175,55,0.5)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,175,55,0.3)'}
        >
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
          <Plus size={18} />
          Add New Service
        </button>
      </div>

      {/* ── Table ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: cardBg, border: cardBorder, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
                {['Image', 'Name & Description', 'Price', 'Time Cost', 'Status', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="p-4 text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'rgba(212,175,55,0.7)', background: 'rgba(212,175,55,0.05)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="p-12 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <Package size={32} className="mx-auto mb-3 opacity-40" />
                    No services found. Click "Add New Service" to create one.
                  </td>
                </tr>
              )}
              {loading && services.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 rounded-full border-3 border-t-transparent animate-spin" style={{ borderColor: gold, borderTopColor: 'transparent', borderWidth: '3px' }} />
                    </div>
                  </td>
                </tr>
              )}
              {services.map((service, idx) => (
                <tr
                  key={service._id}
                  className="group transition-colors duration-200"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  {/* Image */}
                  <td className="p-4">
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-16 h-16 object-cover rounded-xl"
                      style={{ border: '1px solid rgba(212,175,55,0.2)' }}
                    />
                  </td>

                  {/* Name & Description */}
                  <td className="p-4">
                    <p className="font-bold text-white text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {service.name}
                    </p>
                    <p className="text-xs mt-1 truncate max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {service.description}
                    </p>
                  </td>

                  {/* Price */}
                  <td className="p-4">
                    <span className="font-bold text-sm" style={{ color: gold }}>
                      ${service.price.toFixed(2)}
                    </span>
                  </td>

                  {/* Time Cost */}
                  <td className="p-4">
                    <span className="inline-flex items-center gap-2 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <Clock size={14} style={{ color: gold }} />
                      {service.timeCost ?? 30} min
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span
                      className="px-3 py-1.5 rounded-full text-xs font-bold"
                      style={service.isActive
                        ? { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                      }
                    >
                      {service.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(service)}
                        title="Edit"
                        className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                        style={{ background: 'rgba(212,175,55,0.1)', color: gold, border: '1px solid rgba(212,175,55,0.2)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirmDelete(service)}
                        title="Delete"
                        className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: '#111',
              border: '1px solid rgba(212,175,55,0.25)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.05)',
              animation: 'modalSlideIn 0.25s ease-out',
            }}
          >
            {/* Modal header */}
            <div
              className="flex justify-between items-center px-6 py-5"
              style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', background: 'rgba(212,175,55,0.05)' }}
            >
              <h2 className="text-lg font-extrabold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {editingService ? '✏️ Edit Service' : '✨ Add New Service'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div
                  className="p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                >
                  <XCircle size={16} /> {error}
                </div>
              )}

              {/* Service Name */}
              <div>
                <label style={labelStyle}>Service Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={inputStyle}
                  required
                  placeholder="e.g. Premium Car Wash"
                  onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  style={{ ...inputStyle, resize: 'none' }}
                  required
                  placeholder="Describe the service..."
                  onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>

              {/* Price */}
              <div>
                <label style={labelStyle}>Price (USD)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  required
                  placeholder="0.00"
                  onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>

              {/* Time Cost */}
              <div>
                <label style={labelStyle}>Time Cost (minutes)</label>
                <input
                  type="number"
                  name="timeCost"
                  value={formData.timeCost}
                  onChange={handleInputChange}
                  min="1"
                  step="1"
                  style={inputStyle}
                  required
                  placeholder="30"
                  onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label style={labelStyle}>Service Image</label>
                <div className="flex items-center gap-4">
                  <div
                    className="h-24 w-24 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(212,175,55,0.3)' }}
                  >
                    {imagePreview
                      ? <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                      : <ImageIcon size={28} style={{ color: 'rgba(212,175,55,0.4)' }} />
                    }
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={handleImageChange}
                      className="w-full text-sm cursor-pointer"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                      {...(!editingService && { required: true })}
                    />
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>JPEG, PNG or WebP · max 5 MB</p>
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none py-2">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div
                    className="w-11 h-6 rounded-full transition-all duration-300"
                    style={{ background: formData.isActive ? goldGrad : 'rgba(255,255,255,0.1)' }}
                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  >
                    <div
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                      style={{ transform: formData.isActive ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold" style={{ color: formData.isActive ? gold : 'rgba(255,255,255,0.4)' }}>
                  {formData.isActive ? 'Active — visible to customers' : 'Inactive — hidden from customers'}
                </span>
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative overflow-hidden px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: goldGrad, color: '#0f0f0f', boxShadow: '0 4px 16px rgba(212,175,55,0.3)' }}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
                  {loading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full" style={{ borderColor: '#0f0f0f', borderTopColor: 'transparent' }} />
                      Saving...
                    </>
                  ) : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-8 text-center"
            style={{
              background: '#111',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
              animation: 'modalSlideIn 0.25s ease-out',
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <Trash2 size={24} className="text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Confirm Deletion
            </h3>
            <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Are you sure you want to delete{' '}
              <span className="font-bold text-white">"{editingService?.name}"</span>?
              {' '}This action cannot be undone and the image will be removed from Cloudinary.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2"
                style={{ background: 'rgba(239,68,68,0.8)', color: '#fff', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.8)'}
              >
                {loading
                  ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  : <><Trash2 size={15} /> Delete</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal keyframe ── */}
      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(-16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AdminServiceManager;
