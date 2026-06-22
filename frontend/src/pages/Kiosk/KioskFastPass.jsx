import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import ParkingMapViewer from '../../components/ParkingMapViewer';
import { API_BASE } from '../../services/api';
import { formatLicensePlateDisplay } from '../../utils/licensePlate';

export default function KioskFastPass({ formData, isMonthly, onAutoCheckIn, onComplete }) {
  const [countdown, setCountdown] = useState(5);
  const [status, setStatus] = useState('checking-in');
  const [errorMessage, setErrorMessage] = useState('');
  const [floors, setFloors] = useState([]);
  const [dbSlots, setDbSlots] = useState([]);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return undefined;
    hasStartedRef.current = true;
    let ignore = false;

    const runFastPassEntry = async () => {
      try {
        setStatus('checking-in');
        await onAutoCheckIn();
        if (ignore) return;
        setStatus('ready');
      } catch (error) {
        if (ignore) return;
        setStatus('error');
        setErrorMessage(error.message || 'Fast-pass check-in failed.');
      }
    };

    runFastPassEntry();

    return () => {
      ignore = true;
    };
  }, [onAutoCheckIn]);

  useEffect(() => {
    if (!formData.floorId) return undefined;
    let ignore = false;

    const fetchMapData = async () => {
      try {
        const [floorsRes, slotsRes] = await Promise.all([
          fetch(`${API_BASE}/parking-floors`),
          fetch(`${API_BASE}/parking-floors/${formData.floorId}/slots`),
        ]);

        const [floorsData, slotsData] = await Promise.all([floorsRes.json(), slotsRes.json()]);
        if (ignore) return;

        if (floorsData.success) setFloors(floorsData.data || []);
        if (slotsData.success) setDbSlots(slotsData.data || []);
      } catch (error) {
        console.error('Failed to load fast-pass map data', error);
      }
    };

    fetchMapData();
    return () => {
      ignore = true;
    };
  }, [formData.floorId]);

  useEffect(() => {
    if (status !== 'ready') return undefined;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, onComplete]);

  const statusTitle =
    status === 'checking-in'
      ? 'Checking In...'
      : status === 'error'
        ? 'Fast-Pass Unavailable'
        : 'Welcome Back!';

  const statusMessage =
    status === 'error'
      ? 'could not complete automatic entry.'
      : `is recognized as a ${isMonthly ? 'Monthly Subscriber' : 'Pre-booked Guest'}.`;

  return (
    <div className="flex flex-col flex-1 min-h-0 items-center">
      <div className="w-full max-w-[980px] flex flex-col gap-4">
        <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_20px_40px_rgba(15,23,42,0.08)] px-6 py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-5 items-center">
          <div className="flex items-center gap-5 min-w-0">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center border shrink-0 ${
                status === 'error'
                  ? 'bg-red-50 text-red-500 border-red-200'
                  : 'bg-green-50 text-green-500 border-green-200'
              }`}
            >
              {status === 'checking-in' ? (
                <Loader2 size={30} className="animate-spin" />
              ) : status === 'error' ? (
                <AlertCircle size={30} />
              ) : (
                <CheckCircle size={30} />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl font-black text-[#0f172a] uppercase tracking-tight mb-1">
                {statusTitle}
              </h2>
              <p className="text-gray-500 text-base leading-relaxed">
                Biển số{' '}
                <span className="font-bold text-[#0f172a]">
                  {formatLicensePlateDisplay(formData.licensePlate)}
                </span>{' '}
                {statusMessage}
              </p>
            </div>
          </div>

          <div className="rounded-[22px] bg-[#0f172a] text-white px-5 py-4 shadow-xl">
            <div className="flex items-center gap-2 text-cyan-300 mb-2">
              <ShieldCheck size={16} />
              <span className="font-bold uppercase tracking-widest text-[10px]">Assigned Slot</span>
            </div>
            <div className="text-4xl font-black leading-none tracking-tight">
              {formData.selectedSlot || '--'}
            </div>
            <div className="mt-3 text-[11px] text-gray-300 font-medium">
              {formData.bookingFloorName || 'Reserved floor'}
            </div>
          </div>
        </div>

        <div
          className={`mt-4 rounded-[18px] px-4 py-3 border ${
            status === 'checking-in'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : status === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 font-bold text-base">
              <span>
                {status === 'checking-in'
                  ? 'Validating booking'
                  : status === 'error'
                    ? 'Automatic check-in failed'
                    : 'Barrier is opening'}
              </span>
              <ArrowRight className="animate-pulse" size={22} />
            </div>
            {status === 'ready' && (
              <span className="text-sm font-black uppercase tracking-widest">{countdown}s</span>
            )}
          </div>
        </div>
      </div>

      {status === 'error' ? (
        <div className="w-full max-w-[980px] bg-red-50 border border-red-200 rounded-[28px] px-8 py-7 text-center text-red-600 font-semibold">
          {errorMessage}
        </div>
      ) : (
        <div className="w-full max-w-[980px] bg-white rounded-[28px] border border-gray-100 shadow-[0_20px_40px_rgba(15,23,42,0.08)] p-5 flex flex-col min-h-[440px]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-600 mb-3">
                Parking Layout
              </div>
              <h3 className="text-xl font-black text-[#0f172a] leading-tight mb-2">
                {status === 'checking-in'
                  ? 'Preparing your reserved slot...'
                  : 'Your reserved parking space is ready'}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                {status === 'checking-in'
                  ? 'The kiosk is validating your reservation and loading the real parking layout for your assigned floor.'
                  : 'Sơ đồ dưới đây là tầng đỗ thực tế của bạn và ô đã đặt sẽ được làm nổi bật.'}
              </p>
            </div>

            <div className="rounded-[18px] bg-gray-50 border border-gray-200 px-4 py-3 min-w-[150px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Slot</div>
              <div className="text-3xl font-black text-[#0f172a] leading-none mb-1">{formData.selectedSlot || '--'}</div>
              <div className="text-xs font-semibold text-gray-500">{formData.bookingFloorName || 'Reserved floor'}</div>
            </div>
          </div>

          <div className="rounded-[24px] overflow-hidden border border-[#0b0e16] shadow-sm bg-[#0b0e16] min-h-[340px] flex-1 relative">
            <div className="absolute top-4 right-4 z-20 rounded-full bg-cyan-400/15 border border-cyan-300/30 px-4 py-2 text-white backdrop-blur">
              <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-200">
                {formData.bookingFloorName || 'Reserved floor'} · Slot {formData.selectedSlot || '--'}
              </span>
            </div>
            <ParkingMapViewer
              floors={floors.filter((floor) => floor._id === formData.floorId)}
              currentFloorId={formData.floorId}
              onFloorSelect={() => {}}
              activeSessions={[]}
              dbSlots={dbSlots}
              selectedSlotId={formData.selectedSlot}
              onSelectSlot={null}
              is2DMode={true}
              hideUI={true}
              theme="dark"
              initialZoom={0.72}
              staticFit={true}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
