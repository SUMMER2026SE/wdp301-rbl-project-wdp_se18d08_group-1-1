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
  
  // Shared State across steps
  const [formData, setFormData] = useState({
    licensePlate: '',
    phone: '',
    selectedSlot: null,
    durationHours: 1
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

  return (
    <div className="w-screen h-screen overflow-hidden bg-white selection:bg-gold/30">
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
            element={<KioskStep3 formData={formData} onConfirm={() => alert('Confirmed!')} onBack={() => handleBack(2)} />} 
          />
        </Route>
      </Routes>
    </div>
  );
}
