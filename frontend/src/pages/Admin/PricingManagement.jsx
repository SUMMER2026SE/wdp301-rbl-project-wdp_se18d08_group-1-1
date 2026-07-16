import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, AlertCircle, Save } from 'lucide-react';

export default function PricingManagement() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [timeBlocks, setTimeBlocks] = useState([]);
  const [caps, setCaps] = useState({ cap12h: 100000, cap24h: 180000 });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/pricing-config`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setTimeBlocks(data.data.timeBlocks || []);
        setCaps({
          cap12h: data.data.cap12h || 100000,
          cap24h: data.data.cap24h || 180000
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load pricing config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleAddTimeBlock = () => {
    setTimeBlocks([...timeBlocks, { startHour: 0, endHour: 0, price: 0 }]);
  };

  const handleRemoveTimeBlock = (index) => {
    const newBlocks = [...timeBlocks];
    newBlocks.splice(index, 1);
    setTimeBlocks(newBlocks);
  };

  const handleTimeBlockChange = (index, field, value) => {
    const newBlocks = [...timeBlocks];
    newBlocks[index][field] = value === '' ? '' : Number(value);
    setTimeBlocks(newBlocks);
  };

  const handleSave = async () => {
    // Validate
    if (timeBlocks.length === 0) {
      setError('Must have at least one time block.');
      return;
    }
    for (let i = 0; i < timeBlocks.length; i++) {
      const b = timeBlocks[i];
      if (b.startHour < 0 || b.startHour > 23 || b.endHour < 0 || b.endHour > 24) {
        setError('Hours must be between 0 and 24.');
        return;
      }
      if (b.price === '' || b.price < 0) {
        setError('Price must be a valid number and cannot be negative.');
        return;
      }
      if (b.startHour === b.endHour) {
        setError('A time block cannot have the same start and end time.');
        return;
      }
    }

    // Validate coverage of 24 hours (no gaps, no overlaps)
    const hours = new Array(24).fill(false);
    for (let i = 0; i < timeBlocks.length; i++) {
      const b = timeBlocks[i];
      const start = b.startHour;
      const end = b.endHour;

      const markHour = (h) => {
        if (hours[h]) {
          throw new Error(`Overlap detected at hour ${h}:00`);
        }
        hours[h] = true;
      };

      try {
        if (start < end) {
          for (let h = start; h < end; h++) markHour(h);
        } else {
          for (let h = start; h < 24; h++) markHour(h);
          for (let h = 0; h < end; h++) markHour(h);
        }
      } catch (e) {
        setError(e.message);
        return;
      }
    }

    const missingHour = hours.findIndex(h => !h);
    if (missingHour !== -1) {
      setError(`Gap detected in schedule. Time block missing for hour ${missingHour}:00`);
      return;
    }

    if (caps.cap12h === '' || caps.cap12h < 0 || caps.cap24h === '' || caps.cap24h < 0) {
      setError('Price caps must be valid positive numbers.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/pricing-config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
        },
        body: JSON.stringify({
          timeBlocks,
          ...caps
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Pricing configuration updated successfully!');
        fetchConfig();
      } else {
        setError(data.message || 'Failed to update configuration.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error while saving config.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-gold w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto h-full overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Pricing Management</h1>
        <p className="text-gray-400 font-medium mt-1">Configure time blocks and price caps for parking sessions.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      <div className="bg-[#181C23] border border-white/5 rounded-3xl p-6 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Time Blocks</h2>
          <button
            onClick={handleAddTimeBlock}
            className="bg-gold/10 text-gold px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gold/20 transition"
          >
            <Plus size={16} /> Add Block
          </button>
        </div>

        <div className="space-y-4">
          {timeBlocks.map((block, index) => (
            <div key={index} className="flex flex-wrap items-end gap-4 p-5 border border-white/10 rounded-2xl bg-[#0B0E17] hover:border-gold/30 transition-colors shadow-sm">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Start Time</label>
                <div className="relative">
                  <select
                    value={block.startHour}
                    onChange={e => handleTimeBlockChange(index, 'startHour', e.target.value)}
                    className="w-full appearance-none bg-[#181C23] border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-shadow cursor-pointer"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={`start-${i}`} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">End Time</label>
                <div className="relative">
                  <select
                    value={block.endHour}
                    onChange={e => handleTimeBlockChange(index, 'endHour', e.target.value)}
                    className="w-full appearance-none bg-[#181C23] border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-shadow cursor-pointer"
                  >
                    {Array.from({ length: 25 }).map((_, i) => (
                      <option key={`end-${i}`} value={i}>
                        {i === 24 ? '24:00 (Midnight)' : `${i.toString().padStart(2, '0')}:00`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Price Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={block.price}
                    onChange={e => handleTimeBlockChange(index, 'price', e.target.value)}
                    className="w-full bg-[#181C23] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm font-bold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-shadow"
                    placeholder="0"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                    VND
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleRemoveTimeBlock(index)}
                className="h-[46px] w-[46px] rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0 shadow-sm"
                title="Remove time block"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {timeBlocks.length === 0 && (
            <div className="text-gray-500 text-sm py-10 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-[#181C23]/50">
              <AlertCircle size={24} className="mb-2 opacity-50" />
              <p>No time blocks configured.</p>
              <p className="text-xs mt-1 opacity-70">Add a time block to set pricing schedules.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#181C23] border border-white/5 rounded-3xl p-6 shadow-sm mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>Price Caps</span>
          <span className="text-xs font-normal text-gray-400 bg-white/5 px-2 py-1 rounded-md">Maximum limits</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-5 border border-white/5 rounded-2xl bg-[#0B0E17]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">12-Hour Maximum Cap</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                value={caps.cap12h}
                onChange={e => setCaps({...caps, cap12h: e.target.value === '' ? '' : Number(e.target.value)})}
                className="w-full bg-[#181C23] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm font-bold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-shadow"
              />
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                VND
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Maximum amount charged for a 12-hour continuous stay.</p>
          </div>
          
          <div className="p-5 border border-white/5 rounded-2xl bg-[#0B0E17]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">24-Hour Maximum Cap</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                value={caps.cap24h}
                onChange={e => setCaps({...caps, cap24h: e.target.value === '' ? '' : Number(e.target.value)})}
                className="w-full bg-[#181C23] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm font-bold text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-shadow"
              />
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 font-bold text-xs">
                VND
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Maximum amount charged for a 24-hour continuous stay.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold text-[#0B0E17] px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gold/90 transition shadow-lg shadow-gold/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

    </div>
  );
}
