import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { getServices } from '../../services/extraServiceApi';
import { getMyVehicles } from '../../services/vehicleService';
import { getWalletInfo } from '../../services/walletService';
import {
  checkInBooking,
  checkOutBooking,
  createBooking,
  getAvailableBookingSlots,
  getMyBookings,
} from '../../services/bookingService';

const formatMoney = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const toDateTimeLocal = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
};

const getInitialTimeRange = () => {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 30);
  start.setSeconds(0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 2);

  return {
    startTime: toDateTimeLocal(start),
    endTime: toDateTimeLocal(end),
  };
};

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
  const [initialRange] = useState(() => getInitialTimeRange());
  const [startTime, setStartTime] = useState(() => initialRange.startTime);
  const [endTime, setEndTime] = useState(() => initialRange.endTime);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [manualPlate, setManualPlate] = useState('');
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [slots, setSlots] = useState([]);
  const [hourlyRate, setHourlyRate] = useState(10000);
  const [selectedSlotKey, setSelectedSlotKey] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const durationHours = useMemo(() => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = end.getTime() - start.getTime();
    if (!Number.isFinite(diff) || diff <= 0) return 0;
    return Math.ceil(diff / 3600000);
  }, [startTime, endTime]);

  const serviceTotal = useMemo(
    () =>
      services
        .filter((service) => selectedServices.includes(service._id))
        .reduce((total, service) => total + Number(service.price || 0), 0),
    [services, selectedServices]
  );

  const parkingTotal = durationHours * hourlyRate;
  const grandTotal = parkingTotal + serviceTotal;

  const selectedSlot = slots.find((slot) => `${slot.floorId}:${slot.slotCode}` === selectedSlotKey);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [vehicleRes, serviceRes, walletRes, bookingRes] = await Promise.all([
        getMyVehicles(),
        getServices(true),
        getWalletInfo(),
        getMyBookings(),
      ]);

      if (vehicleRes.ok) {
        const vehicleList = vehicleRes.data?.data || [];
        setVehicles(vehicleList);
        const defaultVehicle = vehicleList.find((vehicle) => vehicle.isDefault) || vehicleList[0];
        setVehicleId(defaultVehicle?._id || '');
      }

      if (serviceRes.ok) setServices(serviceRes.data?.data || []);
      if (walletRes.ok) setWallet(walletRes.data?.data || null);
      if (bookingRes.ok) setBookings(bookingRes.data?.data || []);
    } catch {
      setError('Could not load booking data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleFindSlots = async () => {
    setCheckingSlots(true);
    setError('');
    setSuccess('');
    setSlots([]);
    setSelectedSlotKey('');

    try {
      const res = await getAvailableBookingSlots({
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      if (!res.ok) {
        setError(res.data?.message || 'Could not check available slots.');
        return;
      }

      const nextSlots = res.data?.data?.slots || [];
      setSlots(nextSlots);
      setHourlyRate(res.data?.data?.hourlyRate || 10000);

      if (nextSlots[0]) {
        setSelectedSlotKey(`${nextSlots[0].floorId}:${nextSlots[0].slotCode}`);
      }

      setSuccess(`${nextSlots.length} slots available for this time range.`);
    } catch {
      setError('Network error while checking slots.');
    } finally {
      setCheckingSlots(false);
    }
  };

  const toggleService = (serviceId) => {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  };

  const handleCreateBooking = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!selectedSlot) {
        setError('Please select an available slot first.');
        return;
      }

      if (!vehicleId && !manualPlate.trim()) {
        setError('Please select a vehicle or enter a license plate.');
        return;
      }

      const res = await createBooking({
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        floorId: selectedSlot.floorId,
        slotCode: selectedSlot.slotCode,
        vehicleId: vehicleId || undefined,
        licensePlate: vehicleId ? undefined : manualPlate,
        serviceIds: selectedServices,
      });

      if (!res.ok) {
        setError(res.data?.message || 'Could not create booking.');
        return;
      }

      setSuccess(`Booking created for slot ${selectedSlot.slotCode}. Wallet charged ${formatMoney(grandTotal)}.`);
      setSelectedServices([]);
      setSlots((current) => current.filter((slot) => `${slot.floorId}:${slot.slotCode}` !== selectedSlotKey));
      setSelectedSlotKey('');
      await loadData();
    } catch {
      setError('Network error while creating booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    setActionId(`${action}:${bookingId}`);
    setError('');
    setSuccess('');

    try {
      const res = action === 'check-in'
        ? await checkInBooking(bookingId)
        : await checkOutBooking(bookingId);

      if (!res.ok) {
        setError(res.data?.message || `Could not ${action} booking.`);
        return;
      }

      if (action === 'check-out') {
        const refundAmount = res.data?.data?.refundAmount || 0;
        setSuccess(refundAmount > 0
          ? `Checked out. Refunded ${formatMoney(refundAmount)} to wallet.`
          : 'Checked out successfully.');
      } else {
        setSuccess('Checked in successfully. Slot is now occupied on the live map.');
      }

      await loadData();
    } catch {
      setError(`Network error while processing ${action}.`);
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#050505] text-white">
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
              <h1 className="text-3xl font-black tracking-tight">Book Parking</h1>
              <p className="text-sm text-white/45">Test hourly booking with JSON slots from ParkingFloor layout.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-5 py-4 min-w-[240px]">
          <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest font-bold mb-1">
            <Wallet size={14} /> Wallet balance
          </div>
          <div className="text-2xl font-black text-yellow-400">{formatMoney(wallet?.balance || 0)}</div>
        </div>
      </div>

      {(error || success) && (
        <div className={`mb-6 rounded-2xl border px-4 py-3 flex items-start gap-3 ${
          error
            ? 'bg-rose-500/10 border-rose-500/25 text-rose-200'
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
        }`}>
          {error ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          <span className="text-sm font-medium">{error || success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-5 rounded-3xl bg-[#101010] border border-white/10 p-5 md:p-6">
          <h2 className="text-lg font-black mb-5">Booking Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-white/45 uppercase tracking-widest font-bold">Start time</span>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-sm outline-none focus:border-yellow-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/45 uppercase tracking-widest font-bold">End time</span>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-sm outline-none focus:border-yellow-500"
              />
            </label>
          </div>

          <div className="mt-4">
            <span className="text-xs text-white/45 uppercase tracking-widest font-bold">Vehicle</span>
            {vehicles.length > 0 ? (
              <select
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-sm outline-none focus:border-yellow-500"
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.licensePlate} - {vehicle.brand || 'Vehicle'} {vehicle.model || ''}
                  </option>
                ))}
                <option value="">Manual plate</option>
              </select>
            ) : (
              <input
                value={manualPlate}
                onChange={(event) => setManualPlate(event.target.value)}
                placeholder="License plate"
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-sm outline-none focus:border-yellow-500"
              />
            )}

            {vehicleId === '' && vehicles.length > 0 && (
              <input
                value={manualPlate}
                onChange={(event) => setManualPlate(event.target.value)}
                placeholder="License plate"
                className="mt-3 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-sm outline-none focus:border-yellow-500"
              />
            )}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/45 uppercase tracking-widest font-bold">Extra services</span>
              <span className="text-xs text-yellow-400">{formatMoney(serviceTotal)}</span>
            </div>
            <div className="space-y-2 max-h-52 overflow-auto pr-1">
              {services.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/45">
                  No active services.
                </div>
              ) : (
                services.map((service) => (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => toggleService(service._id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      selectedServices.includes(service._id)
                        ? 'bg-yellow-500/10 border-yellow-500/40'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm">{service.name}</div>
                        <div className="text-xs text-white/45 mt-0.5">{service.timeCost || 30} minutes</div>
                      </div>
                      <div className="text-sm font-black text-yellow-400">{formatMoney(service.price)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/55 flex items-center gap-2"><Clock size={15} /> Duration</span>
              <span className="font-bold">{durationHours || 0} hour(s)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/55 flex items-center gap-2"><CreditCard size={15} /> Parking</span>
              <span className="font-bold">{formatMoney(parkingTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/55 flex items-center gap-2"><Sparkles size={15} /> Services</span>
              <span className="font-bold">{formatMoney(serviceTotal)}</span>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="font-black">Wallet charge</span>
              <span className="text-2xl font-black text-yellow-400">{formatMoney(grandTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFindSlots}
            disabled={checkingSlots || durationHours <= 0}
            className="mt-5 w-full rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-50 px-4 py-3 font-black transition flex items-center justify-center gap-2"
          >
            {checkingSlots ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Check available slots
          </button>

          <button
            type="button"
            onClick={handleCreateBooking}
            disabled={submitting || !selectedSlot || durationHours <= 0}
            className="mt-3 w-full rounded-2xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black px-4 py-4 font-black transition flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Create booking
          </button>
        </section>

        <section className="xl:col-span-7 rounded-3xl bg-[#101010] border border-white/10 p-5 md:p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-black">Available Slots</h2>
              <p className="text-sm text-white/40">Slots come from ParkingFloor.layoutData JSON.</p>
            </div>
            <div className="text-sm text-white/50">{slots.length} slot(s)</div>
          </div>

          {slots.length === 0 ? (
            <div className="min-h-[360px] rounded-2xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center p-8">
              <MapPin className="w-10 h-10 text-white/20 mb-3" />
              <p className="font-bold text-white/70">No slots loaded yet</p>
              <p className="text-sm text-white/35 mt-1">Pick a time range and press Check available slots.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[580px] overflow-auto pr-1">
              {slots.map((slot) => {
                const key = `${slot.floorId}:${slot.slotCode}`;
                const active = key === selectedSlotKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedSlotKey(key)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/15'
                        : 'bg-white/[0.03] border-white/10 hover:border-yellow-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black">{slot.slotCode}</span>
                      <Car size={18} />
                    </div>
                    <div className={`text-xs mt-2 ${active ? 'text-black/60' : 'text-white/45'}`}>
                      {slot.floorName}
                    </div>
                    {slot.zoneName && (
                      <div className={`text-[11px] mt-1 ${active ? 'text-black/55' : 'text-white/35'}`}>
                        {slot.zoneName}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-3xl bg-[#101010] border border-white/10 p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black">My Bookings</h2>
            <p className="text-sm text-white/40">Use check-in/check-out buttons to test session and early refund.</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            Refresh
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-white/40">
            No bookings yet.
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking._id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl font-black">{booking.slotCode}</span>
                    <span className={`px-2.5 py-1 rounded-full border text-xs font-bold uppercase ${statusClass(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className="text-sm text-white/45">{booking.floorId?.name || 'Floor'}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-white/55">
                    <span>{booking.licensePlate}</span>
                    <span>{formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}</span>
                    <span>{formatMoney(booking.finalAmount)} paid</span>
                  </div>
                  {booking.services?.length > 0 && (
                    <div className="mt-2 text-xs text-yellow-300/80">
                      Services: {booking.services.map((service) => service.serviceName).join(', ')}
                    </div>
                  )}
                  {booking.refundAmount > 0 && (
                    <div className="mt-1 text-xs text-emerald-300">
                      Refunded: {formatMoney(booking.refundAmount)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {booking.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => handleBookingAction(booking._id, 'check-in')}
                      disabled={actionId === `check-in:${booking._id}`}
                      className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-2 text-sm font-bold hover:bg-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {actionId === `check-in:${booking._id}` ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                      Check in
                    </button>
                  )}
                  {booking.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleBookingAction(booking._id, 'check-out')}
                      disabled={actionId === `check-out:${booking._id}`}
                      className="rounded-xl bg-yellow-500 text-black px-4 py-2 text-sm font-black hover:bg-yellow-400 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {actionId === `check-out:${booking._id}` ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                      Check out
                    </button>
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
