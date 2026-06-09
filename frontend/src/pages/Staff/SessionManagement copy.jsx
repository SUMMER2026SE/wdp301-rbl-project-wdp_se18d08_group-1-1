import React, { useState, useEffect } from 'react';
import { Camera, Clock, X, Search, ShieldCheck } from 'lucide-react';

export default function SessionManagement() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
          <p className="text-sm text-gray-500">Monitor vehicle entry/exit and security images.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading sessions...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">License Plate</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Check In</th>
                  <th className="px-6 py-4">Check Out</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map(session => (
                  <tr key={session._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{session.licensePlate}</td>
                    <td className="px-6 py-4 text-gray-600">{session.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        session.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                        session.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(session.checkInTime)}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(session.checkOutTime)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="inline-flex items-center gap-1.5 text-gold hover:text-yellow-600 font-semibold transition-colors"
                      >
                        <ShieldCheck size={16} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">No sessions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Session Details</h3>
                <p className="text-sm text-gray-500">Vehicle {selectedSession.licensePlate}</p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-8">
              {/* Entry Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Camera size={16} />
                  </div>
                  <h4 className="font-bold text-lg">Entry Record</h4>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Check In Time</p>
                  <p className="font-bold text-gray-900">{formatDate(selectedSession.checkInTime)}</p>
                </div>
                <div className="aspect-video bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center relative group">
                  {selectedSession.entryImage_url ? (
                    <img src={selectedSession.entryImage_url} alt="Entry" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <Camera size={32} className="mb-2 opacity-50" />
                      <span className="text-sm font-medium">No Entry Image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Exit Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Camera size={16} />
                  </div>
                  <h4 className="font-bold text-lg">Exit Record</h4>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Check Out Time</p>
                  <p className="font-bold text-gray-900">{formatDate(selectedSession.checkOutTime)}</p>
                </div>
                <div className="aspect-video bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center relative group">
                  {selectedSession.exitImage_url ? (
                    <img src={selectedSession.exitImage_url} alt="Exit" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <Camera size={32} className="mb-2 opacity-50" />
                      <span className="text-sm font-medium">No Exit Image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedSession(null)}
                className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
