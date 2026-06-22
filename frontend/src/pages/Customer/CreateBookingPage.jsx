import { useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import ParkingMapViewer from '../../components/ParkingMapViewer';
import { getServices } from '../../services/extraServiceApi';
import { getMyVehicles } from '../../services/vehicleService';
import { getWalletInfo } from '../../services/walletService';
import {
  createBooking,
  getAvailableBookingSlots,
} from '../../services/bookingService';
import { QRCodeSVG } from 'qrcode.react';
import { createTopUpUrl, getTopUpStatus } from '../../services/walletService';

const formatMoney = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const toDateTimeLocal = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getLocalDateString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const getLocalTimeString = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const getMinEndTimeStr = (startStr) => {
  let [h, m] = startStr.split(':').map(Number);
  m += 30;
  if (m >= 60) {
    h += 1;
    m -= 60;
  }
  if (h >= 24) return '24:00';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getInitialTimeRange = () => {
  const start = new Date();
  
  // Làm tròn lên block 15 phút tiếp theo (ví dụ: 9:07 -> 9:15)
  const minutes = start.getMinutes();
  const remainder = minutes % 15;
  const addMinutes = remainder === 0 ? 0 : 15 - remainder;
  
  start.setMinutes(minutes + addMinutes);
  start.setSeconds(0, 0);

  // Mặc định check out sau check in 30 phút
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);

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

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

const CustomTimePicker = ({ value, onChange, options, minTime }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cuộn tới vị trí giờ hiện tại khi mở dropdown
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('.active-time');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, [isOpen]);

  return (
    <div className="relative h-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-[100px] h-full rounded-xl bg-gray-50 border border-gray-200 px-3 text-sm font-semibold text-gray-800 outline-none focus:border-gold focus:ring-1 focus:ring-gold hover:border-gold/50 transition flex items-center justify-between"
      >
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-gray-400" />
          <span>{value}</span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-36 max-h-64 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 py-2 time-scrollbar animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 pb-2 mb-2 border-b border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Time</span>
          </div>
          {options.map((time) => {
            const isActive = value === time;
            const isDisabled = minTime && time < minTime;
            return (
              <div
                key={time}
                onClick={() => {
                  if (isDisabled) return;
                  onChange(time);
                  setIsOpen(false);
                }}
                className={`mx-2 px-3 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-between ${
                  isDisabled
                    ? 'text-gray-300 bg-gray-50/50 cursor-not-allowed'
                    : isActive 
                      ? 'bg-gold/10 text-gold font-bold active-time cursor-pointer' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer'
                }`}
              >
                {time}
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function CreateBookingPage() {
  const [initialRange] = useState(() => getInitialTimeRange());
  const [startDate, setStartDate] = useState(() => initialRange.startTime.split('T')[0]);
  const [startTimeStr, setStartTimeStr] = useState(() => initialRange.startTime.split('T')[1]);
  const [endDate, setEndDate] = useState(() => initialRange.endTime.split('T')[0]);
  const [endTimeStr, setEndTimeStr] = useState(() => initialRange.endTime.split('T')[1]);

  const startTime = `${startDate}T${startTimeStr}`;
  const endTime = `${endDate}T${endTimeStr}`;

  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [manualPlate, setManualPlate] = useState('');
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState('');
  const [hourlyRate, setHourlyRate] = useState(10000);
  const [loading, setLoading] = useState(true);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New states for Booking flow
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpData, setTopUpData] = useState(null); // { qrCode, checkoutUrl, amount }
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [successRedirectCountdown, setSuccessRedirectCountdown] = useState(4);

  // Map state
  const [floors, setFloors] = useState([]);
  const [currentFloorId, setCurrentFloorId] = useState(null);
  const [dbSlots, setDbSlots] = useState([]);

  useEffect(() => {
    const fetchDbSlots = async () => {
      if (!currentFloorId) {
        setDbSlots([]);
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/parking-floors/${currentFloorId}/slots`);
        const data = await res.json();
        if (data.success) {
          setDbSlots(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch slots", err);
      }
    };
    fetchDbSlots();
  }, [currentFloorId]);

  const handleStartChange = (newDate, newTime) => {
    setStartDate(newDate);
    setStartTimeStr(newTime);
    
    if (newDate && newTime) {
      const newStartObj = new Date(`${newDate}T${newTime}`);
      const currentEndObj = new Date(`${endDate}T${endTimeStr}`);
      
      const minEndObj = new Date(newStartObj);
      minEndObj.setMinutes(minEndObj.getMinutes() + 30);
      
      // Nếu giờ kết thúc hiện tại nhỏ hơn giờ kết thúc tối thiểu (cách 30p), tự động điều chỉnh
      if (currentEndObj < minEndObj) {
        const minEndStr = toDateTimeLocal(minEndObj);
        setEndDate(minEndStr.split('T')[0]);
        setEndTimeStr(minEndStr.split('T')[1]);
      }
    }
  };

  const handleEndChange = (newDate, newTime) => {
    setEndDate(newDate);
    setEndTimeStr(newTime);
  };

  const durationHours = useMemo(() => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = end.getTime() - start.getTime();
    if (!Number.isFinite(diff) || diff <= 0) return 0;
    return Math.ceil(diff / 3600000);
  }, [startTime, endTime]);

  const todayDateStr = getLocalDateString();
  const currentTimeStr = getLocalTimeString();

  const startMinTime = startDate === todayDateStr 
    ? currentTimeStr 
    : (startDate < todayDateStr ? '24:00' : null);

  const endMinTime = endDate === startDate 
    ? getMinEndTimeStr(startTimeStr) 
    : (endDate < startDate ? '24:00' : (endDate === todayDateStr ? currentTimeStr : (endDate < todayDateStr ? '24:00' : null)));

  const serviceTotal = useMemo(
    () =>
      services
        .filter((service) => selectedServices.includes(service._id))
        .reduce((total, service) => total + Number(service.price || 0), 0),
    [services, selectedServices]
  );

  const parkingTotal = useMemo(() => {
    let paidHours = durationHours;
    if (paidHours < 1) paidHours = 1;
    return paidHours * hourlyRate;
  }, [durationHours, hourlyRate]);

  const grandTotal = parkingTotal + serviceTotal;

  const selectedSlot = slots.find((slot) => `${slot.floorId}:${slot.slotCode}` === selectedSlotKey);

  const loadData = () => {
    Promise.all([
      getWalletInfo().then(res => res.ok ? res.data?.data : null).catch(() => null),
      getMyVehicles().then(res => res.ok ? res.data?.data : []).catch(() => []),
      getServices().then(res => res.ok ? res.data?.data : []).catch(() => []),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/parking-floors`).then(res => res.json().catch(() => ({}))),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/ticket-packages/active`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      }).then(r => r.json().catch(() => ({})))
    ]).then(([walletData, vehiclesData, servicesData, floorsData, packagesData]) => {
      if (walletData) setWallet(walletData);
      if (vehiclesData) {
        setVehicles(vehiclesData);
        if (vehiclesData.length > 0) setVehicleId(vehiclesData[0]._id);
      }
      if (servicesData) setServices(servicesData);
      if (floorsData && floorsData.success) {
        const fls = floorsData.data || [];
        setFloors(fls);
        if (fls.length > 0) setCurrentFloorId(fls[0]._id);
      }
      if (packagesData && packagesData.success) {
        const hourlyPkg = packagesData.data?.find(p => p.type === 'hourly');
        if (hourlyPkg) setHourlyRate(hourlyPkg.price);
      }
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestActions = useRef({ loadData, handleCreateBooking: null });
  useEffect(() => {
    latestActions.current.loadData = loadData;
  });

  useEffect(() => {
    if (!showTopUpModal || !topUpData?.orderCode) return undefined;

    const intervalId = setInterval(async () => {
      try {
        const statusRes = await getTopUpStatus(topUpData.orderCode);
        const txStatus = String(statusRes.data?.data?.status || "").toUpperCase();

        if (["COMPLETED", "SUCCESS", "PAID"].includes(txStatus)) {
          clearInterval(intervalId);
          setTopUpSuccess(true);
          await latestActions.current.loadData(true);
          if (latestActions.current.handleCreateBooking) {
            await latestActions.current.handleCreateBooking();
          }
          setShowTopUpModal(false);
          setTopUpData(null);
          setTopUpSuccess(false);
        } else if (["CANCELLED", "CANCELED", "FAILED"].includes(txStatus)) {
          clearInterval(intervalId);
          setShowTopUpModal(false);
          setTopUpData(null);
          setTopUpSuccess(false);
          setError("Payment was cancelled or failed.");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [showTopUpModal, topUpData?.orderCode]);

  useEffect(() => {
    if (!showSuccessModal || !bookingInfo) return undefined;

    setSuccessRedirectCountdown(4);

    const countdownTimer = setInterval(() => {
      setSuccessRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const redirectTimer = setTimeout(() => {
      setShowSuccessModal(false);
      setBookingInfo(null);
      window.location.href = '/customer/booking';
    }, 4000);

    return () => {
      clearInterval(countdownTimer);
      clearTimeout(redirectTimer);
    };
  }, [showSuccessModal, bookingInfo]);

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


      if (nextSlots[0]) {
        setSelectedSlotKey(`${nextSlots[0].floorId}:${nextSlots[0].slotCode}`);
      }
    } catch (err) {
      console.error('Error finding slots:', err);
      setError(`Network error while checking slots: ${err.message}`);
    } finally {
      setCheckingSlots(false);
    }
  };

  useEffect(() => {
    const startObj = new Date(startTime);
    const endObj = new Date(endTime);
    const now = new Date();
    
    if (startObj < now) return;
    if ((endObj - startObj) / 60000 < 30) return;
    
    handleFindSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime]);

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
      const startObj = new Date(startTime);
      const endObj = new Date(endTime);
      const now = new Date();
      
      if (startObj < now) {
        setError('Start time cannot be in the past.');
        return;
      }
      
      const diffMins = (endObj.getTime() - startObj.getTime()) / 60000;
      if (diffMins < 30) {
        setError('Minimum booking duration is 30 minutes.');
        return;
      }

      if (!selectedSlot) {
        setError('Please select an available slot first.');
        return;
      }

      if (!vehicleId && !manualPlate.trim()) {
        setError('Please select a vehicle or enter a license plate.');
        return;
      }

      const payload = {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        floorId: selectedSlot.floorId,
        slotCode: selectedSlot.slotCode,
        serviceIds: selectedServices,
      };

      if (vehicleId) payload.vehicleId = vehicleId;
      else payload.licensePlate = manualPlate;

      const res = await createBooking(payload);

      if (!res.ok) {
        const errorMessage = res.data?.message || '';
        if (errorMessage.toLowerCase().includes('insufficient wallet balance')) {
          const shortfall = Math.max(grandTotal - (wallet?.balance || 0), 0);
          const amountToTopUp = Math.max(shortfall, 10000);

          setTopUpLoading(true);
          try {
            const topUpRes = await createTopUpUrl(amountToTopUp);
            if (topUpRes.ok) {
              setTopUpData(topUpRes.data?.data);
              setShowTopUpModal(true);
            } else {
              setError('Insufficient balance and failed to generate top-up QR.');
            }
          } catch {
            setError('Insufficient balance. Network error while generating top-up QR.');
          } finally {
            setTopUpLoading(false);
          }
          return;
        }

        setError(errorMessage || 'Could not create booking.');
        return;
      }

      setBookingInfo(res.data?.data?.booking);
      setShowSuccessModal(true);

      setSuccess(`Booking created for slot ${selectedSlot.slotCode}. Wallet charged ${formatMoney(grandTotal)}.`);
      setSelectedServices([]);
      setSlots((current) => current.filter((slot) => `${slot.floorId}:${slot.slotCode}` !== selectedSlotKey));
      setSelectedSlotKey('');
      await loadData(true);
    } catch {
      setError('Network error while creating booking.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    latestActions.current.handleCreateBooking = handleCreateBooking;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] pt-24 pb-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-charcoal pt-32 pb-12 px-6 md:px-8">
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-date-input::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
        .time-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .time-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .time-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 20px;
        }
        .time-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #d1d5db;
        }
      `}} />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Book Parking</h1>
            <p className="text-gray-500 font-medium mt-1">Reserve your spot and check live availability.</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                <Wallet size={12} /> Wallet Balance
              </div>
              <div className="text-xl font-black text-gray-900">
                {wallet ? formatMoney(wallet.balance) : '0 VND'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTopUpModal(true)}
              className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center hover:bg-gold hover:text-white transition shadow-sm"
            >
              +
            </button>
          </div>
        </div>

        {(error || success) && (
          <div className={`mb-6 rounded-2xl border px-4 py-3 flex items-start gap-3 ${error
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
            {error ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <span className="text-sm font-semibold">{error || success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 flex flex-col gap-6">
            <div className="rounded-3xl bg-white border border-gray-200 p-4 md:p-5 shadow-sm">
              <h2 className="text-lg font-black mb-4 text-gray-900">Booking Details</h2>

              <div className="grid grid-cols-1 gap-4">
                <label className="block">
                  <span className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1.5 block">Start time</span>
                  <div className="flex gap-2 h-11">
                    <div className="relative flex-1 h-full">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Calendar size={15} className="text-gray-400" />
                      </div>
                      <input
                        type="date"
                        min={todayDateStr}
                        value={startDate}
                        onChange={(e) => handleStartChange(e.target.value, startTimeStr)}
                        className="w-full h-full rounded-xl bg-gray-50 border border-gray-200 pl-9 pr-3 text-sm font-semibold text-gray-800 outline-none focus:border-gold focus:ring-1 focus:ring-gold transition custom-date-input hover:border-gold/50"
                      />
                    </div>
                    <CustomTimePicker
                      value={startTimeStr}
                      onChange={(val) => handleStartChange(startDate, val)}
                      options={TIME_OPTIONS}
                      minTime={startMinTime}
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1.5 block">End time</span>
                  <div className="flex gap-2 h-11">
                    <div className="relative flex-1 h-full">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Calendar size={15} className="text-gray-400" />
                      </div>
                      <input
                        type="date"
                        min={startDate}
                        value={endDate}
                        onChange={(e) => handleEndChange(e.target.value, endTimeStr)}
                        className="w-full h-full rounded-xl bg-gray-50 border border-gray-200 pl-9 pr-3 text-sm font-semibold text-gray-800 outline-none focus:border-gold focus:ring-1 focus:ring-gold transition custom-date-input hover:border-gold/50"
                      />
                    </div>
                    <CustomTimePicker
                      value={endTimeStr}
                      onChange={(val) => handleEndChange(endDate, val)}
                      options={TIME_OPTIONS}
                      minTime={endMinTime}
                    />
                  </div>
                </label>
              </div>

              <div className="mt-5">
                <span className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">Vehicle</span>
                {vehicles.length > 0 ? (
                  <select
                    value={vehicleId}
                    onChange={(event) => setVehicleId(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-gold focus:ring-1 focus:ring-gold transition"
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
                    className="mt-1 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-gold focus:ring-1 focus:ring-gold transition"
                  />
                )}

                {vehicleId === '' && vehicles.length > 0 && (
                  <input
                    value={manualPlate}
                    onChange={(event) => setManualPlate(event.target.value)}
                    placeholder="License plate"
                    className="mt-2 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-gold focus:ring-1 focus:ring-gold transition"
                  />
                )}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">Extra services</span>
                  <span className="text-xs font-black text-gray-900">{formatMoney(serviceTotal)}</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                  {services.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-400 font-medium">
                      No active services.
                    </div>
                  ) : (
                    services.map((service) => (
                      <button
                        key={service._id}
                        type="button"
                        onClick={() => toggleService(service._id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition flex items-center justify-between ${
                          selectedServices.includes(service._id)
                            ? 'bg-gold/10 border-gold shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            selectedServices.includes(service._id) ? 'bg-gold border-gold text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {selectedServices.includes(service._id) && <Check size={12} strokeWidth={4} />}
                          </div>
                          <div>
                            <div className="font-bold text-[13px] text-gray-900 leading-tight">{service.name}</div>
                            <div className="text-[10px] font-medium text-gray-400 leading-tight">{service.timeCost || 30} mins</div>
                          </div>
                        </div>
                        <div className="text-[13px] font-black text-gray-900">{formatMoney(service.price)}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium flex items-center gap-2"><Clock size={15} /> Duration</span>
                  <span className="font-bold text-gray-900">{durationHours || 0} hour(s)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium flex items-center gap-2"><CreditCard size={15} /> Parking</span>
                  <span className="font-bold text-gray-900">{formatMoney(parkingTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium flex items-center gap-2"><Sparkles size={15} /> Services</span>
                  <span className="font-bold text-gray-900">{formatMoney(serviceTotal)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-black text-gray-900">Wallet charge</span>
                  <span className="text-xl font-black text-gold">{formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={handleCreateBooking}
                disabled={submitting || !selectedSlot || durationHours <= 0 || checkingSlots}
                className="w-full rounded-2xl bg-gradient-to-r from-gold to-yellow-500 hover:from-yellow-500 hover:to-gold disabled:opacity-50 text-black px-4 py-4 font-black transition flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_8px_25px_rgba(212,175,55,0.5)] active:scale-[0.98]"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Book Now
              </button>
            </div>
          </section>

          <section className="xl:col-span-7 rounded-3xl bg-white border border-gray-200 p-3 md:p-4 shadow-sm flex flex-col min-h-[400px] lg:min-h-[480px]">
            <div className="flex items-center justify-between gap-4 mb-3 px-2 pt-2">
              <div>
                <h2 className="text-lg font-black text-gray-900">Available Slots Map</h2>
                <p className="text-sm font-medium text-gray-500">Select an available slot on the map to book.</p>
              </div>
              <div className="text-sm text-emerald-600 font-bold px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">{slots.length} slot(s) available</div>
            </div>

            <div className="flex-1 w-full relative rounded-2xl overflow-hidden border border-[#0b0e16] bg-[#0b0e16] shadow-inner">
              {/* Floor Selection */}
              {floors.length > 0 && !checkingSlots && (
                <div className="absolute top-4 left-0 right-0 flex justify-center flex-wrap gap-2 z-30 px-4">
                  {floors.map(f => (
                    <button
                      key={f._id}
                      type="button"
                      onClick={() => setCurrentFloorId(f._id)}
                      className={`px-6 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm ${
                        currentFloorId === f._id
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                          : 'bg-[#181c23]/80 border border-white/10 text-gray-400 hover:text-white hover:bg-[#1f242d]/80 backdrop-blur'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}

              {checkingSlots && (
                <div className="absolute inset-0 z-20 bg-[#0b0e16]/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                  <Loader2 size={40} className="text-cyan-400 animate-spin mb-4" />
                  <p className="font-black text-white">Finding available slots...</p>
                </div>
              )}

              {slots.length === 0 && !checkingSlots && (
                <div className="absolute inset-0 z-10 bg-[#0b0e16]/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-[#181c23] shadow-xl shadow-black/50 border border-white/10 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-cyan-500" />
                  </div>
                  <p className="font-black text-white text-xl">Select a valid time range</p>
                  <p className="text-sm font-medium text-gray-400 mt-2 max-w-xs mx-auto">Please adjust your start and end time to view available parking spaces.</p>
                </div>
              )}

              <ParkingMapViewer
                floors={floors}
                currentFloorId={currentFloorId}
                onFloorSelect={setCurrentFloorId}
                availableSlots={slots.length > 0 ? slots : null}
                dbSlots={dbSlots}
                selectedSlotId={selectedSlot?.slotCode}
                onSelectSlot={(slot, floorId) => setSelectedSlotKey(`${floorId}:${slot.id}`)}
                is2DMode={true}
                hideUI={true}
                theme="dark"
              />

              {/* Legend Overlay */}
              {!checkingSlots && slots.length > 0 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30 pointer-events-none px-4">
                  <div className="bg-[#181c23]/80 backdrop-blur border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-4 shadow-lg pointer-events-auto">
                    <p className="text-cyan-400 font-black text-[10px] uppercase tracking-widest pr-2 hidden sm:block">Status Legend</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-sm bg-white border border-gray-300"></div>
                      <span className="text-[10px] text-gray-300 font-bold tracking-wide">Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-sm bg-red-500/20 border border-red-500"></div>
                      <span className="text-[10px] text-gray-300 font-bold tracking-wide">Occupied</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-sm bg-cyan-500 border border-cyan-400"></div>
                      <span className="text-[10px] text-gray-300 font-bold tracking-wide">Selected</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-sm bg-red-200 border border-red-500" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.2) 4px, rgba(127, 29, 29, 0.3) 4px, rgba(127, 29, 29, 0.3) 8px)' }}></div>
                      <span className="text-[10px] text-gray-300 font-bold tracking-wide">Maintenance</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccessModal && bookingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mb-4 shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Booking Confirmed</h2>
            <p className="text-gray-500 font-medium text-sm mb-6">Scan this QR code at the Kiosk to check in.</p>

            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl mb-6 shadow-inner">
              <QRCodeSVG value={bookingInfo._id} size={200} />
            </div>

            <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-semibold">Slot</span>
                <span className="font-black text-gray-900">{bookingInfo.slotCode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-semibold">Valid from</span>
                <span className="font-bold text-gray-900">{formatDateTime(bookingInfo.startTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-semibold">Valid until</span>
                <span className="font-bold text-gray-900">{formatDateTime(bookingInfo.endTime)}</span>
              </div>
            </div>

            <div className="w-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold py-3.5 rounded-2xl text-sm">
              Bạn đã booking thành công. Tự động chuyển tới My Bookings sau {successRedirectCountdown}s...
            </div>
          </div>
        </div>
      )}

      {/* TOP UP MODAL */}
      {showTopUpModal && topUpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Insufficient Balance</h2>
            <p className="text-gray-500 font-medium text-sm mb-6">
              You need to top up <span className="font-bold text-gray-900">{formatMoney(topUpData.amount)}</span> to complete this booking.
            </p>

            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl mb-4 shadow-inner">
              {topUpData.qrCode ? (
                <QRCodeSVG value={topUpData.qrCode} size={200} />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 font-medium text-sm">
                  No QR data
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 font-medium mb-6">
              Scan with your banking app or e-wallet to pay.<br />
              Alternatively, <a href={topUpData.checkoutUrl} target="_blank" rel="noreferrer" className="text-blue-500 font-bold hover:underline">click here to checkout</a>.
            </p>

            <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gold font-black">
              <Loader2 size={16} className="animate-spin" />
              {topUpSuccess ? "Payment received! Processing booking..." : "Waiting for your payment..."}
            </div>

            <div className="flex gap-3 w-full">
              <button
                disabled={topUpSuccess}
                onClick={() => {
                  setShowTopUpModal(false);
                  setTopUpData(null);
                  setTopUpSuccess(false);
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl transition disabled:opacity-50 active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
