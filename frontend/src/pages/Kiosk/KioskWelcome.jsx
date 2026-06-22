import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Pointer } from 'lucide-react';
import backgroundImage from '../../assets/images/Kiosk/BackgroundWelcomeKiosk.png';
import logoImage from '../../assets/images/Kiosk/LogoKiosk.png';
import { API_BASE } from '../../services/api';
import { normalizeLicensePlate } from '../../utils/licensePlate';

const SCAN_ATTEMPTS = 8;
const SCAN_RETRY_DELAY_MS = 400;
const CAMERA_WARMUP_MS = 1500;
const SCAN_TIMEOUT_MS = 8500;
const VIDEO_READY_TIMEOUT_MS = 5000;
const SCAN_IMAGE_WIDTH = 1920;
const SCAN_IMAGE_HEIGHT = 1800;
const FULL_FRAME_HEIGHT = 1080;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isLikelyVietnamesePlate = (plate) => {
  const clean = normalizeLicensePlate(plate);
  return (
    /^\d{2}[A-Z]{1,2}\d{4,5}$/.test(clean) ||
    /^\d{2}[A-Z]\d\d{4,5}$/.test(clean)
  );
};

const plateFingerprint = (plate) => {
  const clean = normalizeLicensePlate(plate);
  if (!clean) return '';
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(-4)}`;
};

export default function KioskWelcome({ onStart, updateFormData }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const openCameraStream = async () => {
    const cameraOptions = [
      {
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      },
      { video: true, audio: false },
    ];

    let lastError;
    for (const constraints of cameraOptions) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const configureCameraTrack = async (stream) => {
    const track = stream.getVideoTracks()[0];
    if (!track?.applyConstraints) return;

    const capabilities = track.getCapabilities?.() || {};
    const advanced = [];

    if (capabilities.focusMode?.includes?.('continuous')) {
      advanced.push({ focusMode: 'continuous' });
    }
    if (capabilities.exposureMode?.includes?.('continuous')) {
      advanced.push({ exposureMode: 'continuous' });
    }
    if (capabilities.whiteBalanceMode?.includes?.('continuous')) {
      advanced.push({ whiteBalanceMode: 'continuous' });
    }
    if (capabilities.zoom?.max && capabilities.zoom.max >= 1) {
      advanced.push({ zoom: Math.min(1.1, capabilities.zoom.max) });
    }
    if (capabilities.torch) {
      advanced.push({ torch: false });
    }

    if (!advanced.length) return;

    try {
      await track.applyConstraints({ advanced });
      console.info('[Kiosk scan] Camera track tuned', track.getSettings?.());
    } catch (error) {
      console.info('[Kiosk scan] Camera track tuning skipped', error?.message || error);
    }
  };

  const waitForVideoFrame = async (video) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < VIDEO_READY_TIMEOUT_MS) {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth && video.videoHeight) {
        return true;
      }
      await wait(100);
    }
    return false;
  };

  const drawCrop = (ctx, video, crop, target) => {
    const sourceWidth = video.videoWidth || video.width;
    const sourceHeight = video.videoHeight || video.height;
    const sx = Math.max(0, Math.round(crop.x * sourceWidth));
    const sy = Math.max(0, Math.round(crop.y * sourceHeight));
    const sw = Math.min(sourceWidth - sx, Math.round(crop.w * sourceWidth));
    const sh = Math.min(sourceHeight - sy, Math.round(crop.h * sourceHeight));
    ctx.drawImage(video, sx, sy, sw, sh, target.x, target.y, target.w, target.h);
  };

  const drawFilteredCrop = (ctx, source, crop, target, filter) => {
    ctx.save();
    ctx.filter = filter;
    drawCrop(ctx, source, crop, target);
    ctx.restore();
  };

  const drawContain = (ctx, video, target) => {
    const sourceWidth = video.videoWidth || video.width;
    const sourceHeight = video.videoHeight || video.height;
    const videoRatio = sourceWidth / sourceHeight;
    const targetRatio = target.w / target.h;
    let dw = target.w;
    let dh = target.h;
    let dx = target.x;
    let dy = target.y;

    if (videoRatio > targetRatio) {
      dh = Math.round(target.w / videoRatio);
      dy += Math.round((target.h - dh) / 2);
    } else {
      dw = Math.round(target.h * videoRatio);
      dx += Math.round((target.w - dw) / 2);
    }

    ctx.drawImage(video, 0, 0, sourceWidth, sourceHeight, dx, dy, dw, dh);
  };

  const captureHighQualitySource = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (track && 'ImageCapture' in window) {
      try {
        const imageCapture = new window.ImageCapture(track);
        if (imageCapture.takePhoto) {
          const blob = await imageCapture.takePhoto();
          const bitmap = await createImageBitmap(blob);
          return bitmap;
        }
        if (imageCapture.grabFrame) {
          return await imageCapture.grabFrame();
        }
      } catch (error) {
        console.info('[Kiosk scan] ImageCapture fallback to video frame', error?.message || error);
      }
    }

    return videoRef.current;
  };

  const buildScanImageBase64 = async () => {
    const source = await captureHighQualitySource();
    const sourceWidth = source?.videoWidth || source?.width;
    const sourceHeight = source?.videoHeight || source?.height;
    if (!source || !sourceWidth || !sourceHeight) return null;

    const canvas = document.createElement('canvas');
    canvas.width = SCAN_IMAGE_WIDTH;
    canvas.height = SCAN_IMAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    drawContain(ctx, source, { x: 0, y: 0, w: SCAN_IMAGE_WIDTH, h: FULL_FRAME_HEIGHT });

    const panels = [
      { x: 0, y: FULL_FRAME_HEIGHT, w: 960, h: 360 },
      { x: 960, y: FULL_FRAME_HEIGHT, w: 960, h: 360 },
      { x: 0, y: FULL_FRAME_HEIGHT + 360, w: 960, h: 360 },
      { x: 960, y: FULL_FRAME_HEIGHT + 360, w: 960, h: 360 },
    ];

    const crops = [
      { x: 0.02, y: 0.24, w: 0.96, h: 0.6 },
      { x: 0.1, y: 0.3, w: 0.8, h: 0.5 },
      { x: 0.18, y: 0.36, w: 0.64, h: 0.38 },
      { x: 0.26, y: 0.4, w: 0.48, h: 0.28 },
    ];

    drawCrop(ctx, source, crops[0], panels[0]);
    drawFilteredCrop(ctx, source, crops[1], panels[1], 'contrast(1.35) saturate(1.15) brightness(1.06)');
    drawFilteredCrop(ctx, source, crops[2], panels[2], 'grayscale(1) contrast(1.85) brightness(1.12)');
    drawFilteredCrop(ctx, source, crops[3], panels[3], 'contrast(1.6) brightness(1.08) saturate(0.85)');
    if (source !== videoRef.current && source?.close) source.close();
    return canvas.toDataURL('image/jpeg', 0.92);
  };

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
      if (numbers.length === 5) formattedNumbers = `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      const isMotorbike = /\d/.test(series);
      return isMotorbike ? `${province}-${series} ${formattedNumbers}` : `${province}${series} - ${formattedNumbers}`;
    }
    return null;
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return null;
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return null;
    const imageBase64 = await buildScanImageBase64();
    if (!imageBase64) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}/ai/scan-plate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (response.status === 429) {
        return {
          rateLimited: true,
          retryAfterSeconds: data.retryAfterSeconds || null,
          message: data.message || 'AI plate scanning is temporarily unavailable.',
        };
      }
      const normalizedPlate = normalizeLicensePlate(data.plate || '');
      if (response.ok && data.success && isLikelyVietnamesePlate(normalizedPlate)) {
        return { plate: normalizedPlate, imageBase64 };
      }
      console.info('[Kiosk scan] AI did not return a valid plate', {
        status: response.status,
        plate: data.plate,
        message: data.message,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    return null;
  };

  const verifyScannedPlate = async ({ plate, imageBase64 }) => {
    const formatted = formatVietnamesePlate(plate);
    if (!formatted) return false;

    setScanMessage(`Detected ${formatted}. Checking registration...`);

    const response = await fetch(`${API_BASE}/sessions/verify-plate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licensePlate: formatted }),
    });
    const data = await response.json();
    const verifyData = data.data || {};

    if (!data.success) {
      updateFormData({ licensePlate: formatted, entryImageBase64: imageBase64 });
      return false;
    }

    if (verifyData.isActive) {
      alert('This vehicle is already inside the parking lot!');
      updateFormData({ licensePlate: formatted, entryImageBase64: imageBase64 });
      return true;
    }

    if (verifyData.isMonthly || verifyData.hasPreBooking) {
      updateFormData({
        step3Mode: 'welcome',
        licensePlate: formatted,
        entryImageBase64: imageBase64,
        phone: verifyData.phone || '',
        isMonthly: verifyData.isMonthly,
        hasPreBooking: verifyData.hasPreBooking,
        selectedSlot: verifyData.assignedSlot,
        floorId: verifyData.assignedFloorId || null,
        bookingId: verifyData.bookingId || null,
        bookingFloorName: verifyData.assignedFloorName || null,
        durationHours: verifyData.bookingDurationHours || 1,
        pricingPackage: verifyData.pricingPackage || null,
        pricingSource: verifyData.pricingSource || 'default',
        ticketPackageId: verifyData.bookingTicketPackageId || verifyData.pricingPackage?._id || null,
        bookingMode: verifyData.bookingMode || 'hourly',
      });
      onStart(3);
      return true;
    }

    if (verifyData.isRegisteredVehicle || verifyData.isVIP) {
      updateFormData({
        step3Mode: 'policy',
        licensePlate: formatted,
        entryImageBase64: imageBase64,
        phone: verifyData.phone || '',
        isVIP: !!verifyData.isVIP,
        isRegisteredVehicle: true,
        pricingPackage: verifyData.pricingPackage || null,
        pricingSource: verifyData.pricingSource || 'default',
        ticketPackageId: verifyData.pricingPackage?._id || null,
        bookingMode: 'hourly',
      });
      onStart(2);
      return true;
    }

    updateFormData({
      step3Mode: 'policy',
      licensePlate: formatted,
      entryImageBase64: imageBase64,
      phone: verifyData.phone || '',
      pricingPackage: verifyData.pricingPackage || null,
      pricingSource: verifyData.pricingSource || 'default',
      ticketPackageId: verifyData.pricingPackage?._id || null,
      bookingMode: 'hourly',
    });
    return false;
  };

  const handleStart = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanMessage('Opening camera...');

    try {
      const stream = await openCameraStream();
      streamRef.current = stream;
      await configureCameraTrack(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const hasFrame = await waitForVideoFrame(videoRef.current);
        if (!hasFrame) {
          throw new Error('Camera did not produce a readable video frame');
        }
        await wait(CAMERA_WARMUP_MS);
      }

      setScanMessage('Scanning license plate...');
      const settings = stream.getVideoTracks()[0]?.getSettings?.();
      console.info('[Kiosk scan] Camera started', settings);
      const detectedPlates = new Map();
      for (let i = 0; i < SCAN_ATTEMPTS; i++) {
        try {
          const rawResult = await captureAndAnalyze();
          if (rawResult) {
            if (rawResult.rateLimited) {
              stopCamera();
              setIsScanning(false);
              setScanMessage(rawResult.message);
              alert(rawResult.message);
              onStart(1);
              return;
            }
            const normalizedPlate = normalizeLicensePlate(rawResult.plate);
            const fingerprint = plateFingerprint(normalizedPlate);
            const previous = detectedPlates.get(fingerprint);
            const nextCandidate = previous
              ? { ...previous, count: previous.count + 1, plate: normalizedPlate, imageBase64: rawResult.imageBase64 }
              : { ...rawResult, plate: normalizedPlate, count: 1, fingerprint };
            detectedPlates.set(fingerprint, nextCandidate);

            if (nextCandidate.count >= 2 || i >= 3) {
              const handled = await verifyScannedPlate(nextCandidate);
              stopCamera();
              setIsScanning(false);
              if (handled) return;
              onStart(1);
              return;
            }
          }
        } catch (scanError) {
          console.error('Welcome scan attempt failed:', scanError);
        }
        await wait(SCAN_RETRY_DELAY_MS);
      }

      updateFormData({ licensePlate: '', phone: '', entryImageBase64: null });
      stopCamera();
      setIsScanning(false);
      onStart(1);
    } catch (error) {
      console.error('Welcome camera scan error:', error);
      stopCamera();
      setIsScanning(false);
      onStart(1);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden font-sans">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center blur-sm scale-105 opacity-90"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>

      {/* Main Card */}
      <div className="relative z-10 bg-white/95 backdrop-blur-md w-[85%] max-w-[1000px] rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.3)] p-16 flex flex-col items-center">
        
        <div className="absolute top-5 right-0 w-44">
          <img src={logoImage} alt="Valo Parking" className="w-full h-auto object-contain" />
        </div>

        <div className="w-full text-left mt-8 mb-10">
          <h2 className="text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">WELCOME TO</h2>
          <h1
            className="text-[100px] font-black tracking-tight leading-none text-[#FFEB00]"
            style={{ textShadow: '2px 4px 10px rgba(0,0,0,0.3), 1px 1px 0px #0f172a' }}
          >
            VALO PARKING
          </h1>
          <p className="text-2xl font-bold text-gray-600 mt-6 tracking-wide">
            Fast, Secure, and Fully Automated Experience
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={isScanning}
          className="mt-12 bg-[#FFEB00] hover:bg-[#FFE000] text-[#0f172a] font-black text-3xl px-16 py-6 rounded-full flex items-center gap-4 transition-all shadow-[0_15px_30px_rgba(255,235,0,0.4)] border border-[#F2D600] group min-w-[400px] justify-center hover:shadow-[0_20px_40px_rgba(255,235,0,0.6)] active:scale-95 active:shadow-md"
        >
          {isScanning ? 'Please wait...' : 'Click to start'}
          {isScanning ? (
            <Loader2 size={36} className="animate-spin" strokeWidth={2.5} />
          ) : (
            <Pointer size={36} className="transform -rotate-12 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
          )}
        </button>

      </div>

      <video
        ref={videoRef}
        className="absolute h-px w-px opacity-0 pointer-events-none"
        playsInline
        muted
        aria-hidden="true"
      />
    </div>
  );
}
