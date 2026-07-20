import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Loader2, AlertCircle } from 'lucide-react';


export default function TicketPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'hourly',
    price: '',
    description: '',
    isActive: true,
  });

  let isAdmin = false;
  try {
    const user = JSON.parse(sessionStorage.getItem('valo_user'));
    if (user && user.role === 'admin') isAdmin = true;
  } catch(e) {}

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ticket-packages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await res.json();
      if (data.success) {
        setPackages(data.data);
      } else {
        setPackages([]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load ticket packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      fetchPackages();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const openModal = (pkg = null) => {
    setError('');
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        type: pkg.type,
        price: pkg.price,
        description: pkg.description || '',
        isActive: pkg.isActive,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: '',
        type: 'hourly',
        price: '',
        description: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...formData, price: Number(formData.price) };
      const config = { 
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
        } 
      };
      
      if (editingPackage) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/ticket-packages/${editingPackage._id}`, {
          method: 'PUT',
          ...config,
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/ticket-packages`, {
          method: 'POST',
          ...config,
          body: JSON.stringify(payload)
        });
      }
      
      setShowModal(false);
      fetchPackages();
    } catch (err) {
      console.error(err);
      setError('Failed to save ticket package');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/ticket-packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      fetchPackages();
    } catch (err) {
      console.error(err);
      setError('Failed to delete package');
    }
  };

  if (loading && packages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full min-h-[calc(100vh-70px)] bg-[#080808]">
        <Loader2 className="animate-spin text-gold w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 mx-auto min-h-[calc(100vh-70px)] overflow-auto bg-[#080808]">
      <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">
            <Tag size={12} /> Packages
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Ticket Packages</h1>
          <p className="text-gray-400 text-sm mt-1">Manage parking rates and ticket packages.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="bg-gold text-[#0B0E17] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gold/90 transition shadow-lg shadow-gold/20"
          >
            <Plus size={18} /> Add Package
          </button>
        )}
      </div>

      {error && !showModal && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map(pkg => (
          <div key={pkg._id} className={`bg-[#171717] rounded-3xl p-6 border shadow-sm relative overflow-hidden transition-all ${pkg.isActive ? 'border-white/10 hover:border-gold/50' : 'border-white/5 opacity-60'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center">
                <Tag size={24} />
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => openModal(pkg)} className="w-8 h-8 rounded-full bg-white/5 text-gray-400 flex items-center justify-center hover:bg-gold hover:text-[#0B0E17] transition">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(pkg._id)} className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="mb-2">
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest 
                ${pkg.type === 'monthly' ? 'bg-yellow-500/20 text-yellow-500'
                : pkg.type === 'yearly' ? 'bg-purple-500/20 text-purple-400'
                : 'bg-cyan-500/20 text-cyan-400'}`}>
                {pkg.type}
              </span>
              {!pkg.isActive && <span className="ml-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-white/10 text-gray-400">Inactive</span>}
            </div>
            
            <h3 className="text-xl font-black text-white mb-1">{pkg.name}</h3>
            <p className="text-3xl font-black text-gold mb-3">{(pkg.price || 0).toLocaleString('vi-VN')} <span className="text-base text-gray-500 font-bold">VND</span></p>
            
            <p className="text-gray-400 text-sm font-medium line-clamp-2">{pkg.description || 'No description'}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#171717] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-6">{editingPackage ? 'Edit Package' : 'Create Package'}</h2>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm font-semibold">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Package Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  placeholder="e.g. Standard Hourly"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Price (VND)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                    placeholder="e.g. 10000"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold min-h-[80px]"
                  placeholder="Optional description"
                />
              </div>
              
              <div className="flex items-center gap-3 py-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                  <span className="ml-3 text-sm font-bold text-white">Active Package</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-[#0B0E17] bg-gold hover:bg-gold/90 transition shadow-lg shadow-gold/20"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
