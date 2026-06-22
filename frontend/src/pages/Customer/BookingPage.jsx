import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Wifi,
} from 'lucide-react';
import {
  getMyBookings,
} from '../../services/bookingService';
import { useSocket } from '../../contexts/SocketProvider';

const formatMoney = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const formatDateTime = (value) =>
  new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

const statusClass = (status) => {
  if (status === 'confirmed') return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  if (status === 'completed') return 'bg-white/10 text-white/70 border-white/10';
  if (status === 'cancelled') return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
  return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
};

export default function BookingPage() {
  const socket = useSocket();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastEventRef = useRef(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');

    try {
      const bookingRes = await getMyBookings();
      if (bookingRes.ok) setBookings(bookingRes.data?.data || []);
    } catch {
      setError('Could not load booking data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const handleBookingChanged = (payload) => {
      lastEventRef.current = payload;
      setSuccess('Booking status updated automatically.');
      loadData(true);
    };

    socket.on('booking:changed', handleBookingChanged);
    return () => {
      socket.off('booking:changed', handleBookingChanged);
    };
  }, [socket]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(true);
      }
    }, 15000);

    const handleFocus = () => loadData(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 2500);
    return () => clearTimeout(timer);
  }, [success]);



  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#050505] text-white p-6 md:p-8">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#050505] text-white p-6 md:p-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <CalendarClock size={22} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">My Bookings</h1>
              <p className="text-sm text-white/45">Manage your parking reservations and check-in status.</p>
            </div>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className={`mb-6 rounded-2xl border px-4 py-3 flex items-start gap-3 ${error
            ? 'bg-rose-500/10 border-rose-500/25 text-rose-200'
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
          }`}>
          {error ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          <span className="text-sm font-medium">{error || success}</span>
        </div>
      )}

      <section className="rounded-3xl bg-[#101010] border border-white/10 p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black">All Reservations</h2>
            <p className="text-sm text-white/40">Present your booking QR code at the Kiosk to check in.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 flex items-center gap-2">
              <Wifi size={12} />
              Live sync
            </div>
            <button
              type="button"
              onClick={() => loadData()}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-white/40 flex flex-col items-center">
            <CalendarClock size={48} className="mb-4 text-white/20" />
            <p className="text-lg font-bold text-white/60 mb-2">No bookings yet</p>
            <p className="text-sm max-w-sm">You haven't made any parking reservations. Click "Booking" on the top navigation bar to reserve a spot.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking._id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between transition hover:border-white/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl font-black text-white">{booking.slotCode}</span>
                    <span className={`px-2.5 py-1 rounded-full border text-xs font-bold uppercase ${statusClass(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className="text-sm text-white/45">{booking.floorId?.name || 'Floor'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-6 text-sm text-white/60">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-0.5">License Plate</span>
                      <span className="font-semibold text-white/80">{booking.licensePlate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-0.5">Time</span>
                      <span className="font-semibold text-white/80">{formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-0.5">Paid</span>
                      <span className="font-bold text-yellow-400/90">{formatMoney(booking.finalAmount)}</span>
                    </div>
                  </div>
                  {booking.services?.length > 0 && (
                    <div className="mt-3 text-xs text-yellow-400/70 font-medium">
                      + Services: {booking.services.map((service) => service.serviceName).join(', ')}
                    </div>
                  )}
                  {booking.refundAmount > 0 && (
                    <div className="mt-1 text-xs text-emerald-400/80 font-medium">
                      Refunded: {formatMoney(booking.refundAmount)}
                    </div>
                  )}
                </div>


              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
