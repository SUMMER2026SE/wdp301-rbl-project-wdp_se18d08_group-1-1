import { useState, useEffect } from 'react';
import { Delete, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../services/api';
import { isValidLicensePlate } from '../../utils/licensePlate';
import ParkingFullModal from './ParkingFullModal';

export default function KioskStep1({ formData, updateFormData, onNext }) {
  const [activeField, setActiveField] = useState('plate'); // Default to plate
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  // Auto-verify logic
  useEffect(() => {
    const plate = formData.licensePlate || '';
    // Trigger auto-verify if plate length is >= 8 and we are actively typing it
    if (plate.length >= 8 && activeField === 'plate') {
      const timerId = setTimeout(async () => {
        try {
          const cleanPlate = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          const response = await fetch(`${API_BASE}/sessions/verify-plate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licensePlate: cleanPlate })
          });
          const data = await response.json();
          if (data.success && data.data) {
            const verifyData = data.data;

            if (verifyData.isActive) {
              alert('Phương tiện này đang có lịch sử đỗ xe hoạt động trong bãi!');
              return;
            }

            // 1. Auto-fill phone if available and currently empty
            if (verifyData.phone && !formData.phone) {
              updateFormData({ phone: verifyData.phone });
            }

            // 2. Auto-next for Bookings or Subscriptions
            if (verifyData.hasPreBooking || verifyData.isMonthly) {
              updateFormData({
                step3Mode: verifyData.requiresSlotReallocation ? 'policy' : 'fastpass',
                isMonthly: verifyData.isMonthly,
                membershipType: verifyData.membershipType || null,
                hasPreBooking: verifyData.hasPreBooking,
                selectedSlot: verifyData.assignedSlot,
                floorId: verifyData.assignedFloorId || null,
                bookingId: verifyData.bookingId || null,
                bookingFloorName: verifyData.assignedFloorName || null,
                durationHours: verifyData.bookingDurationHours || formData.durationHours || 1,
                licensePlate: plate,
                phone: verifyData.phone || formData.phone || '',
                ticketPackageId: verifyData.bookingTicketPackageId || formData.ticketPackageId || null,
                bookingMode: verifyData.bookingMode || formData.bookingMode || 'hourly',
              });

              if (verifyData.requiresSlotReallocation) {
                alert('Your booking has expired, and the previous parking space is now occupied. Please select another available space on the map (no extra charge).');
                onNext('2');
              } else {
                onNext('3');
              }
            } else if (verifyData.isVIP || verifyData.isRegisteredVehicle || (verifyData.phone && verifyData.phone.length >= 10)) {
              if (formData.isParkingFull || verifyData.isFull) {
                if (!verifyData.isVIP) {
                  setShowFullModal(true);
                  updateFormData({ licensePlate: '', phone: '', entryImageBase64: null, isParkingFull: false });
                  return;
                }
              }
              updateFormData({
                step3Mode: 'policy',
                isVIP: !!verifyData.isVIP,
                isRegisteredVehicle: !!verifyData.isRegisteredVehicle,
                membershipType: verifyData.membershipType || null,
                phone: verifyData.phone || formData.phone || '',
                licensePlate: plate,
                pricingPackage: verifyData.pricingPackage || null,
                pricingSource: verifyData.pricingSource || 'default',
                ticketPackageId: verifyData.pricingPackage?._id || null,
                bookingMode: 'hourly',
              });
              onNext('2');
            } else {
              if (formData.isParkingFull || verifyData.isFull) {
                setShowFullModal(true);
                updateFormData({ licensePlate: '', phone: '', entryImageBase64: null, isParkingFull: false });
                return;
              }
            }
          } else {
            if (formData.isParkingFull) {
              alert('The parking lot is full. We apologize for the inconvenience.');
              updateFormData({ licensePlate: '', phone: '', entryImageBase64: null, isParkingFull: false });
              onNext(0);
            }
          }
        } catch (e) {
          console.error("Auto verify failed", e);
        }
      }, 800); // 0.8s debounce to allow user to finish typing
      return () => clearTimeout(timerId);
    }
  }, [formData.licensePlate, activeField]);

  const formatVietnamesePlate = (plate) => {
    if (!plate) return null;
    const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let province, series, numbers;
    if (clean.length === 9) {
      if (/^\d{2}[A-Z]\d\d{5}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 4); numbers = clean.slice(4); }
      else if (/^\d{2}[A-Z]{2}\d{5}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 4); numbers = clean.slice(4); }
    } else if (clean.length === 8) {
      if (/^\d{2}[A-Z]\d{5}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 3); numbers = clean.slice(3); }
      else if (/^\d{2}[A-Z]\d\d{4}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 4); numbers = clean.slice(4); }
      else if (/^\d{2}[A-Z]{2}\d{4}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 4); numbers = clean.slice(4); }
    } else if (clean.length === 7) {
      if (/^\d{2}[A-Z]\d{4}$/.test(clean)) { province = clean.slice(0, 2); series = clean.slice(2, 3); numbers = clean.slice(3); }
    }
    if (province && series && numbers) {
      let formattedNumbers = numbers;
      if (numbers.length === 5) { formattedNumbers = `${numbers.slice(0, 3)}.${numbers.slice(3)}`; }
      const isMotorbike = /\d/.test(series);
      if (isMotorbike) return `${province}-${series} ${formattedNumbers}`;
      else return `${province}${series} - ${formattedNumbers}`;
    }
    return null;
  };

  const handleKeyClick = (key) => {
    if (activeField === 'phone') {
      const currentPhone = formData.phone || '';

      // Validation for Vietnamese mobile phone numbers
      if (currentPhone.length === 0 && key !== '0') return; // Must start with 0
      if (currentPhone.length === 1 && !['3', '5', '7', '8', '9'].includes(key)) return; // Valid 2nd digits

      if (currentPhone.length < 10) {
        updateFormData({ phone: currentPhone + key });
      }
    } else if (activeField === 'plate') {
      if ((formData.licensePlate || '').length < 15) {
        const currentRaw = (formData.licensePlate || '') + key;
        const clean = currentRaw.replace(/[^A-Z0-9]/g, '');
        const formatted = formatVietnamesePlate(clean);

        if (formatted) {
          updateFormData({ licensePlate: formatted });
        } else {
          updateFormData({ licensePlate: currentRaw.toUpperCase() });
        }
      }
    }
  };

  const handleDelete = () => {
    if (activeField === 'phone' && (formData.phone || '').length > 0) {
      updateFormData({ phone: (formData.phone || '').slice(0, -1) });
    } else if (activeField === 'plate' && (formData.licensePlate || '').length > 0) {
      updateFormData({ licensePlate: (formData.licensePlate || '').slice(0, -1) });
    }
  };

  const handleSpace = () => {
    if (activeField === 'plate') {
      updateFormData({ licensePlate: (formData.licensePlate || '') + ' ' });
    }
  };

  const renderNumpad = () => (
    <div className="w-[90%] mx-auto relative mt-2">
      <div className="grid grid-cols-5 gap-3 mb-3 pr-14">
        {[0, 1, 2, 3, 4].map(num => (
          <button
            key={num}
            onClick={() => handleKeyClick(num.toString())}
            className="bg-[#0f172a] text-white text-2xl font-bold rounded-[14px] h-[52px] flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-3 pr-14">
        {[5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleKeyClick(num.toString())}
            className="bg-[#0f172a] text-white text-2xl font-bold rounded-[14px] h-[52px] flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}
      </div>
      {/* Delete Button Absolute Right */}
      <button
        onClick={handleDelete}
        className="absolute right-0 top-0 h-[116px] w-11 flex items-center justify-center border-2 border-[#0f172a] bg-white rounded-[14px] text-[#0f172a] hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-all"
      >
        <Delete size={20} strokeWidth={2} />
      </button>
    </div>
  );

  const qwertyRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '.']
  ];

  const renderKeyboard = () => (
    <div className="w-full mx-auto relative mt-2 flex flex-col gap-2">
      {qwertyRows.map((row, i) => (
        <div key={i} className={`flex justify-center gap-1.5 ${i === 1 ? 'px-3' : ''} ${i === 2 ? 'px-6' : ''}`}>
          {row.map(key => (
            <button
              key={key}
              onClick={() => handleKeyClick(key)}
              className="bg-[#0f172a] text-white text-lg font-bold rounded-lg h-[44px] flex-1 max-w-[44px] flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all shadow-sm"
            >
              {key}
            </button>
          ))}
          {i === 3 && (
            <button
              onClick={handleDelete}
              className="bg-white border-2 border-[#0f172a] text-[#0f172a] text-sm font-bold rounded-lg h-[44px] px-3 flex items-center justify-center active:bg-gray-100 active:scale-95 transition-all shadow-sm ml-1"
            >
              <Delete size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      ))}
      <div className="flex justify-center gap-2 mt-1 px-10">
        <button
          onClick={handleSpace}
          className="bg-[#0f172a] text-white text-sm font-bold rounded-lg h-[44px] flex-1 flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all shadow-sm"
        >
          SPACE
        </button>
      </div>
    </div>
  );

  const handleManualNext = async () => {
    setIsVerifying(true);
    try {
      const plate = (formData.licensePlate || '').trim();
      const cleanPlate = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const phone = (formData.phone || '').trim();
      const hasValidPhone = /^0[35789]\d{8}$/.test(phone);
      const response = await fetch(`${API_BASE}/sessions/verify-plate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licensePlate: cleanPlate })
      });
      const data = await response.json();
      const verifyData = data.data || {};

      if (data.success && verifyData.isActive) {
        alert('This vehicle is already inside the parking lot!');
        setIsVerifying(false);
        return;
      }
      else if (data.success && (verifyData.isMonthly || verifyData.hasPreBooking)) {
        updateFormData({
          step3Mode: verifyData.requiresSlotReallocation ? 'policy' : 'fastpass',
          isMonthly: verifyData.isMonthly,
          membershipType: verifyData.membershipType || null,
          hasPreBooking: verifyData.hasPreBooking,
          selectedSlot: verifyData.assignedSlot,
          floorId: verifyData.assignedFloorId || null,
          bookingId: verifyData.bookingId || null,
          bookingFloorName: verifyData.assignedFloorName || null,
          durationHours: verifyData.bookingDurationHours || formData.durationHours || 1,
          licensePlate: plate,
          phone: verifyData.phone || phone,
          ticketPackageId: verifyData.bookingTicketPackageId || formData.ticketPackageId || null,
          bookingMode: verifyData.bookingMode || formData.bookingMode || 'hourly',
        });

        if (verifyData.requiresSlotReallocation) {
          alert('Booking của bạn đã quá hạn và ô đỗ cũ đã được sử dụng. Vui lòng chọn một ô đỗ trống khác trên bản đồ (Không mất thêm phí).');
          onNext('2'); // Chuyển sang chọn Map
        } else {
          onNext('3'); // Fast-pass
        }
      }
      else if (data.success && (verifyData.isVIP || verifyData.isRegisteredVehicle)) {
        if ((formData.isParkingFull || verifyData.isFull) && !verifyData.isVIP) {
          setShowFullModal(true);
          updateFormData({ licensePlate: '', phone: '', entryImageBase64: null, isParkingFull: false });
          setIsVerifying(false);
          return;
        }
        updateFormData({
          step3Mode: 'policy',
          isVIP: !!verifyData.isVIP,
          isRegisteredVehicle: true,
          membershipType: verifyData.membershipType || null,
          phone: verifyData.phone || phone,
          licensePlate: plate,
          pricingPackage: verifyData.pricingPackage || formData.pricingPackage || null,
          pricingSource: verifyData.pricingSource || formData.pricingSource || 'default',
          ticketPackageId: verifyData.pricingPackage?._id || formData.ticketPackageId || null,
          bookingMode: formData.bookingMode || 'hourly',
        });
        setIsVerifying(false);
        onNext('2');
      }
      else if (data.success && verifyData.phone && verifyData.phone.length >= 10) {
        if (formData.isParkingFull || verifyData.isFull) {
          setShowFullModal(true);
          updateFormData({ licensePlate: '', phone: '', entryImageBase64: null, isParkingFull: false });
          setIsVerifying(false);
          return;
        }
        updateFormData({
          step3Mode: 'policy',
          phone: verifyData.phone,
          licensePlate: plate,
          pricingPackage: verifyData.pricingPackage || formData.pricingPackage || null,
          pricingSource: verifyData.pricingSource || formData.pricingSource || 'default',
          ticketPackageId: verifyData.pricingPackage?._id || formData.ticketPackageId || null,
          bookingMode: formData.bookingMode || 'hourly',
          membershipType: verifyData.membershipType || null,
        });
        setIsVerifying(false);
        onNext('2');
      }
      else {
        if (formData.isParkingFull || (data.data && data.data.isFull)) {
          setShowFullModal(true);
          updateFormData({ licensePlate: '', phone: '', entryImageBase64: null, isParkingFull: false });
          setIsVerifying(false);
          return;
        }

        setIsVerifying(false);
        updateFormData({
          step3Mode: 'policy',
          licensePlate: plate,
          phone,
          isVIP: false,
          isRegisteredVehicle: false,
          pricingPackage: verifyData.pricingPackage || formData.pricingPackage || null,
          pricingSource: verifyData.pricingSource || formData.pricingSource || 'default',
          ticketPackageId: verifyData.pricingPackage?._id || formData.ticketPackageId || null,
          bookingMode: formData.bookingMode || 'hourly',
          membershipType: verifyData.membershipType || null,
        });
        if (hasValidPhone) {
          onNext('2');
          return;
        }
        setActiveField('phone');
        alert('Please enter a valid phone number to continue.');
      }
    } catch (e) {
      console.error("verify-plate backend error", e);
      setIsVerifying(false);
      alert('Could not verify the license plate. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[650px] mx-auto pb-4">
      {/* ─── Yellow Card Container (Flat & Soft) ─── */}
      <div className="bg-[#FFDF00] w-full rounded-[32px] py-6 px-4 sm:px-8 flex flex-col items-center transition-all duration-500">

        {/* License Plate Field */}
        <div className="w-full text-center mb-4 relative flex flex-col items-center">
          <label className="block text-xs font-bold text-[#0f172a] tracking-widest mb-2 uppercase">
            License Plate Number
            {isVerifying && <span className="ml-2 text-blue-500 animate-pulse font-normal lowercase tracking-normal">(verifying...)</span>}
          </label>
          {!isValidLicensePlate(formData.licensePlate || '') && (formData.licensePlate || '').length > 0 && (
            <div className="absolute -top-10 flex items-center gap-2 text-rose-600 bg-white/80 px-4 py-1 rounded-full font-bold shadow-sm animate-pulse">
              <AlertCircle size={16} /> License plate format is incorrect.
            </div>
          )}
          <div
            className={`relative bg-white rounded-2xl h-[60px] flex items-center justify-center w-[90%] mx-auto transition-all border-2 cursor-pointer ${activeField === 'plate' ? 'border-[#0f172a] shadow-[0_4px_15px_rgba(0,0,0,0.05)]' : 'border-transparent'}`}
            onClick={() => setActiveField('plate')}
          >
            <span className="text-2xl font-bold font-mono tracking-[0.2em] text-[#0f172a]">
              {formData.licensePlate || 'TAP TO ENTER'}
            </span>
            {activeField === 'plate' && (
              <span className="w-0.5 h-[26px] bg-[#0f172a] animate-pulse ml-1"></span>
            )}
          </div>
        </div>

        {/* Phone Number Field */}
        <div className="w-full text-center mb-5 animate-in fade-in slide-in-from-top-4 duration-500">
          <label className="block text-xs font-bold text-[#0f172a] tracking-widest mb-2 uppercase">Enter Phone</label>
          <div
            className={`relative bg-white rounded-2xl h-[60px] flex items-center justify-center px-6 w-[90%] mx-auto transition-all border-2 cursor-pointer ${activeField === 'phone' ? 'border-[#0f172a] shadow-[0_4px_15px_rgba(0,0,0,0.05)]' : 'border-transparent'}`}
            onClick={() => setActiveField('phone')}
          >
            <div className="flex items-center justify-center w-full font-mono text-3xl font-bold pl-[0.2em]">
              <span className="text-[#0f172a] tracking-[0.2em]">{formData.phone || ''}</span>
              {/* Dynamic blinking cursor */}
              {activeField === 'phone' && (
                <span className="w-0.5 h-[30px] bg-[#0f172a] animate-pulse -ml-[0.1em] mr-[0.1em]"></span>
              )}
              <span className="text-gray-300 tracking-[0.2em]">
                {'0123456789'.slice((formData.phone || '').length)}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Keyboard based on active field */}
        {activeField === 'phone' ? renderNumpad() : renderKeyboard()}

      </div>

      {/* Next Step Button */}
      <button
        onClick={handleManualNext}
        disabled={isVerifying || !(formData.licensePlate || '') || !isValidLicensePlate(formData.licensePlate || '')}
        className={`mt-6 mb-2 font-bold text-[18px] px-16 py-[16px] rounded-full transition-all border-2 ${(isVerifying || !(formData.licensePlate || '') || !isValidLicensePlate(formData.licensePlate || ''))
          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-[#0f172a] border-[#0f172a] text-white hover:bg-black shadow-[0_10px_20px_rgba(0,0,0,0.2)] active:scale-95'
          }`}
      >
        Next step
      </button>

      <ParkingFullModal
        isOpen={showFullModal}
        onClose={() => window.location.replace('/kiosk')}
      />
    </div>
  );
}
