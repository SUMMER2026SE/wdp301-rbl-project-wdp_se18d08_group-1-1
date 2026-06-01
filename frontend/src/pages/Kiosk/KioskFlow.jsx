import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import KioskWelcome from './KioskWelcome';
import KioskStep1 from './KioskStep1';
import KioskStep2 from './KioskStep2';
import KioskStep3 from './KioskStep3';
import KioskLayout from './KioskLayout';

export default function KioskFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Shared State across steps
  const [formData, setFormData] = useState({
    licensePlate: '',
    phone: '',
    selectedSlot: null,
    durationHours: 1,
    entryImageBase64: null,
  });

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = (step) => {
    navigate(`/kiosk/step${step}`);
  };

  const handleBack = (step) => {
    navigate(step === 0 ? '/kiosk' : `/kiosk/step${step}`);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/sessions/kiosk-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: formData.licensePlate,
          phone: formData.phone,
          parkingSlot: formData.selectedSlot,
          durationHours: formData.durationHours,
          entryImageBase64: formData.entryImageBase64
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Welcome! Your session has started.');
        // Reset and go back to start
        setFormData({
          licensePlate: '',
          phone: '',
          selectedSlot: null,
          durationHours: 1,
          entryImageBase64: null,
        });
        navigate('/kiosk');
      } else {
        alert(data.message || 'Something went wrong.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-white selection:bg-gold/30">
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center">
          <div className="text-2xl font-bold text-[#0f172a] animate-pulse">CREATING SESSION...</div>
        </div>
      )}
      <Routes>
        {/* Step 0: Welcome Screen (Full width, no split layout) */}
        <Route path="/" element={<KioskWelcome onStart={() => handleNext(1)} updateFormData={updateFormData} />} />
        
        {/* Steps 1-3 use the Split-Screen KioskLayout */}
        <Route element={<KioskLayout />}>
          <Route 
            path="step1" 
            element={<KioskStep1 formData={formData} updateFormData={updateFormData} onNext={() => handleNext(2)} />} 
          />
          <Route 
            path="step2" 
            element={<KioskStep2 formData={formData} updateFormData={updateFormData} onNext={() => handleNext(3)} onBack={() => handleBack(1)} />} 
          />
          <Route 
            path="step3" 
            element={<KioskStep3 formData={formData} onConfirm={handleConfirm} onBack={() => handleBack(2)} />} 
          />
        </Route>
      </Routes>
    </div>
  );
}
