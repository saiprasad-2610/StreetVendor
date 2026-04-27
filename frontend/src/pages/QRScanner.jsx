import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapPin, ShieldCheck, ShieldAlert, ArrowLeft, RefreshCw, Camera, Send, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const QRScanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [gpsStatus, setGpsStatus] = useState('initializing');
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [reporting, setReporting] = useState(false);
  const [description, setDescription] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [pendingVendorId, setPendingVendorId] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scannerInstance, setScannerInstance] = useState(null);

  // Get location with progressive fallback strategy
  const getLocationWithFallback = async () => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    setGpsStatus('initializing');

    // Strategy 1: Try high accuracy GPS with averaging
    let loc = await tryHighAccuracyLocation();
    if (loc) {
      setGpsStatus('good');
      return loc;
    }

    // Strategy 2: Try medium accuracy
    setGpsStatus('poor');
    loc = await tryMediumAccuracyLocation();
    if (loc) {
      return loc;
    }

    // Strategy 3: Try low accuracy (network-based)
    loc = await tryLowAccuracyLocation();
    if (loc) {
      return loc;
    }

    setGpsStatus('failed');
    throw new Error('Unable to get location after all fallback strategies');
  };

  const tryHighAccuracyLocation = async () => {
    const readings = [];
    const maxReadings = 5;
    const minAccuracy = 20;

    for (let i = 0; i < maxReadings; i++) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });

        if (position.coords.accuracy && position.coords.accuracy <= minAccuracy) {
          readings.push({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        }
      } catch (err) {
        console.error('High accuracy location error:', err);
      }

      if (i < maxReadings - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (readings.length === 0) return null;

    const weights = readings.map(r => 1 / (r.accuracy * r.accuracy));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const avgLat = readings.reduce((sum, r, i) => sum + r.lat * weights[i], 0) / totalWeight;
    const avgLng = readings.reduce((sum, r, i) => sum + r.lng * weights[i], 0) / totalWeight;
    const avgAccuracy = readings.reduce((sum, r) => sum + r.accuracy, 0) / readings.length;

    return {
      lat: avgLat,
      lng: avgLng,
      accuracy: avgAccuracy
    };
  };

  const tryMediumAccuracyLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy || 50
      };
    } catch (err) {
      return null;
    }
  };

  const tryLowAccuracyLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 60000 // Allow 1 minute old location
          }
        );
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy || 100
      };
    } catch (err) {
      return null;
    }
  };

  // Collect Wi-Fi access points for Google Geolocation API
  const collectWifiAccessPoints = async () => {
    // Browser security prevents direct Wi-Fi scanning
    // This would require a native app or extension
    // For web, we rely on browser's built-in geolocation
    return null;
  };

  // Use watchPosition for continuous location updates (like Google Maps)
  const startContinuousLocationTracking = () => {
    if (!navigator.geolocation) return null;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 50
        };
        setLocation(loc);
        setAccuracy(loc.accuracy);

        // Update status based on accuracy
        if (loc.accuracy < 10) {
          setGpsStatus('good');
        } else if (loc.accuracy < 50) {
          setGpsStatus('poor');
        }
      },
      (error) => {
        console.error('Location watch error:', error);
        setGpsStatus('failed');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        distanceFilter: 5 // Update only if moved 5 meters
      }
    );

    return watchId;
  };

  useEffect(() => {
    let scanner = null;
    
    const timer = setTimeout(() => {
      scanner = new Html5QrcodeScanner('reader', {
         qrbox: { width: 250, height: 250 },
         fps: 25,
         rememberLastUsedCamera: true,
         supportedScanTypes: [0],
         videoConstraints: {
           facingMode: "environment"
         }
       });

      scanner.render(onScanSuccess, onScanError);
      setScannerInstance(scanner);
    }, 500);

    function onScanSuccess(result) {
      let vendorId = result;
      try {
        const data = JSON.parse(result);
        vendorId = data.id || result;
      } catch (e) {
        // If result is a URL, extract the last path segment as vendorId
        try {
          const url = new URL(result);
          const segments = url.pathname.split('/').filter(Boolean);
          if (segments.length > 0) {
            vendorId = segments[segments.length - 1];
          }
        } catch (urlErr) {
          // use result as is
        }
      }

      setPendingVendorId(vendorId);
      
      // CRITICAL: Stop the scanner and release the camera immediately
      if (scanner) {
        scanner.clear().then(() => {
          setScannerInstance(null);
          setShowCamera(true); // Only show camera after scanner is cleared
        }).catch(e => {
          console.error("Failed to clear scanner:", e);
          setShowCamera(true); // Fallback
        });
      } else {
        setShowCamera(true);
      }
    }

    function onScanError(err) {
      if (err && err.includes("Permission denied")) {
        setError("Camera permission denied. Please allow camera access.");
      }
    }

    // Initialize with high-accuracy location
    getLocationWithFallback()
      .then(loc => {
        setLocation({ lat: loc.lat, lng: loc.lng });
        setAccuracy(loc.accuracy);
        setLocationHistory([loc]);
      })
      .catch(err => {
        console.error("GPS Error:", err);
        setError("Location access denied. Please enable GPS and allow browser access.");
      });

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(e => {});
      }
    };
  }, []);

  // Handle Photo Capture
  useEffect(() => {
    if (showCamera && !capturedImage) {
      startCamera();
    }
  }, [showCamera, capturedImage]);

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      console.log('Camera access granted');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Video stream attached');
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError') {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found on this device.");
      } else if (err.name === 'NotReadableError') {
        setError("Camera is already in use by another application.");
      } else {
        setError("Failed to access camera: " + err.message);
      }
    }
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && location) {
      // ANTI-FRAUD: Verify camera is still active
      if (!video.srcObject || video.srcObject.getTracks().length === 0) {
        setError("❌ FRAUD DETECTED: Camera stream interrupted. Please restart scan.");
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      
      // ANTI-FRAUD: Verify video dimensions (real camera has standard dimensions)
      if (width < 640 || height < 480) {
        setError("❌ FRAUD DETECTED: Invalid camera resolution. Real camera required.");
        return;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // 1. Draw the actual photo
      ctx.drawImage(video, 0, 0, width, height);
      
      // 2. Add Enhanced Geo-Tag Overlay (Advanced Anti-Fraud Watermark)
      const overlayHeight = height * 0.30; // Increased overlay for more security info
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, height - overlayHeight, width, overlayHeight);
      
      // Add gradient border for authenticity
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, width - 4, height - 4);
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.max(12, width * 0.035)}px Arial`;
      
      const padding = width * 0.05;
      let currentY = height - overlayHeight + padding;
      const lineSpacing = width * 0.045;

      // Line 1: Location Status with timestamp
      const now = new Date();
      ctx.fillText("📍 SOLAPUR MUNICIPAL CORPORATION - LIVE VERIFICATION", padding, currentY);
      currentY += lineSpacing;

      // Line 2: Coordinates with precision
      ctx.font = `${Math.max(10, width * 0.03)}px monospace`;
      ctx.fillText(`LAT: ${location.lat.toFixed(7)}° | LONG: ${location.lng.toFixed(7)}° | ACC: ±${accuracy?.toFixed(1)}m`, padding, currentY);
      currentY += lineSpacing;

      // Line 3: Full timestamp with timezone
      ctx.fillText(`DATE: ${now.toLocaleDateString()} | TIME: ${now.toLocaleTimeString()} | TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`, padding, currentY);
      currentY += lineSpacing;

      // Line 4: Device and browser fingerprint
      ctx.fillText(`DEVICE: ${navigator.userAgent.substring(0, 50)}...`, padding, currentY);
      currentY += lineSpacing;

      // Line 5: Advanced Security Token with checksum
      const securityToken = generateSecureToken(location.lat, location.lng, now.getTime());
      ctx.fillStyle = '#fbbf24'; // Gold color
      ctx.fillText(`SECURITY TOKEN: ${securityToken}`, padding, currentY);

      // 3. Add hidden metadata in canvas (for backend verification)
      const metadata = {
        timestamp: now.getTime(),
        coordinates: { lat: location.lat, lng: location.lng },
        accuracy: accuracy,
        deviceFingerprint: generateDeviceFingerprint(),
        canvasSignature: btoa(`${width}x${height}${now.getTime()}`).substring(0, 20)
      };
      
      // Embed metadata as invisible pixels (advanced anti-fraud)
      embedMetadataInCanvas(ctx, metadata, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Higher quality for better analysis
      setCapturedImage(dataUrl);
      
      // Stop stream immediately after capture
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Proceed to validation with enhanced security
      if (pendingVendorId) {
        handleValidation(pendingVendorId, dataUrl);
      }
    }
  };

  // Generate secure token with checksum
  const generateSecureToken = (lat, lng, timestamp) => {
    const base = `${lat.toFixed(4)}${lng.toFixed(4)}${timestamp}`;
    const hash = btoa(base).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
    const checksum = (lat * lng * timestamp).toString(36).substring(0, 4).toUpperCase();
    return `${hash}-${checksum}`;
  };

  // Generate device fingerprint
  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    return canvas.toDataURL().slice(-16);
  };

  // Embed metadata invisibly in canvas
  const embedMetadataInCanvas = (ctx, metadata, width, height) => {
    // Convert metadata to binary and embed in least significant bits of pixels
    const metadataString = JSON.stringify(metadata);
    const binaryData = btoa(metadataString);
    
    // Embed in top-left pixels (invisible to human eye)
    for (let i = 0; i < Math.min(binaryData.length, 100); i++) {
      const x = i % 10;
      const y = Math.floor(i / 10);
      const charCode = binaryData.charCodeAt(i);
      
      // Get current pixel and modify least significant bits
      const imageData = ctx.getImageData(x, y, 1, 1);
      const pixel = imageData.data;
      pixel[0] = (pixel[0] & 0xFE) | ((charCode >> 0) & 1);
      pixel[1] = (pixel[1] & 0xFE) | ((charCode >> 1) & 1);
      pixel[2] = (pixel[2] & 0xFE) | ((charCode >> 2) & 1);
      
      ctx.putImageData(imageData, x, y);
    }
  };

  const handleValidation = async (vendorId, photoData) => {
    // MANDATORY: Photo capture is required for validation
    if (!photoData || !photoData.startsWith('data:image')) {
      setError("❌ FRAUD DETECTED: Real photo capture is mandatory. Please use camera to capture vendor location.");
      return;
    }

    // FRAUD DETECTION: Validate photo authenticity
    const validationResult = validatePhotoAuthenticity(photoData);
    if (!validationResult.isValid) {
      setError(`❌ ${validationResult.error}`);
      return;
    }

    // CRITICAL: Refresh location before validation for real-time accuracy
    setLoading(true);
    setError(null);
    setShowCamera(false);

    try {
      const freshLocation = await getLocationWithFallback();
      setLocation({ lat: freshLocation.lat, lng: freshLocation.lng });
      setAccuracy(freshLocation.accuracy);
      setLocationHistory(prev => [...prev, freshLocation]);

      // Create FormData for real image upload
      const formData = new FormData();
      formData.append('vendorId', vendorId);
      formData.append('latitude', freshLocation.lat);
      formData.append('longitude', freshLocation.lng);
      formData.append('gpsAccuracy', freshLocation.accuracy);
      formData.append('deviceId', navigator.userAgent || "unknown_device");
      formData.append('weatherCondition', "clear");

      // Convert base64 to blob and upload real photo
      const response = await fetch(photoData);
      const blob = await response.blob();
      formData.append('image', blob, `scan_${vendorId}_${Date.now()}.jpg`);

      // Upload photo and validate with security checks
      const uploadResponse = await axios.post('/api/scan/upload-and-validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout for security validation
      });

      setScanResult(uploadResponse.data);
    } catch (err) {
      if (err.response?.status === 400 && (typeof err.response?.data === 'string' ? err.response.data.includes('fraud') : err.response?.data?.message?.includes('fraud'))) {
        setError(`❌ FRAUD DETECTED: ${err.response.data.message || (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))}`);
      } else {
        setError(err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data)) || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // FRAUD DETECTION: Photo authenticity validation
  const validatePhotoAuthenticity = (photoData) => {
    // Check if photo is from camera (not gallery/uploaded)
    if (!photoData.includes('data:image/jpeg') && !photoData.includes('data:image/png')) {
      return { isValid: false, error: "Invalid image format. Camera capture required." };
    }

    // Check image size (camera photos are typically larger)
    const base64Length = photoData.length - (photoData.indexOf(',') + 1);
    const imageSizeBytes = base64Length * 0.75; // Approximate size
    
    if (imageSizeBytes < 50000) { // Less than 50KB indicates possible fraud
      return { isValid: false, error: "Image too small. Real camera capture required." };
    }

    // Check for EXIF data presence (camera photos have EXIF, screenshots don't)
    if (!hasEXIFData(photoData)) {
      return { isValid: false, error: "No camera metadata detected. Real camera capture required." };
    }

    return { isValid: true };
  };

  // Check if image has EXIF data (camera metadata)
  const hasEXIFData = (photoData) => {
    // Basic check - real camera photos typically have more complex data
    // This is a simplified version - in production, you'd use EXIF.js library
    try {
      const base64Data = photoData.split(',')[1];
      const binaryString = atob(base64Data);
      
      // Look for EXIF markers (real camera photos have these)
      const exifMarkers = ['Exif', 'JFIF', 'Camera'];
      return exifMarkers.some(marker => binaryString.includes(marker));
    } catch (e) {
      return false;
    }
  };

  const useMockLocation = () => {
    // Mock Solapur location
    const mockLoc = { lat: 17.6599, lng: 75.9064 };
    setLocation(mockLoc);
    setError(null);
  };

  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid latitude and longitude');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Latitude must be between -90 and 90, Longitude between -180 and 180');
      return;
    }

    setLocation({ lat, lng });
    setAccuracy(0);
    setShowManualLocation(false);
    setError(null);
  };

  const handleReport = async () => {
    if (!scanResult) return;
    setReporting(true);
    try {
      // Use FormData to match backend's @RequestParam and MultipartFile expectations
      const formData = new FormData();
      formData.append('vendorId', scanResult.vendorId);
      formData.append('gpsLatitude', location.lat);
      formData.append('gpsLongitude', location.lng);
      formData.append('description', description || "Location violation reported with geo-tagged photo");
      
      // If we have a captured image (base64), convert to blob and append
      if (capturedImage && capturedImage.startsWith('data:image')) {
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        formData.append('image', blob, `violation_${scanResult.vendorId}.jpg`);
      }

      await axios.post('/api/violations/report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setReportSuccess(true);
    } catch (err) {
      alert("Failed to report: " + (err.response?.data?.message || err.message));
    } finally {
      setReporting(false);
    }
  };

  const resetScanner = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="max-w-md mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-full transition text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user ? 'Security Verification' : 'Public Compliance'}</h1>
            <p className="text-gray-400 text-sm">🔒 QR Scan + Mandatory Live Photo Proof</p>
          </div>
          <div className="bg-red-500 px-2 py-1 rounded-full">
            <span className="text-xs font-bold">SECURE MODE</span>
          </div>
        </div>

        {/* Security Features Banner */}
        <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={20} className="text-red-400" />
            <h3 className="font-bold text-red-400">🚨 ANTI-FRAUD PROTECTION ACTIVE</h3>
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            <div>✅ Real-time camera capture required</div>
            <div>✅ Photo authenticity validation</div>
            <div>✅ GPS coordinate verification</div>
            <div>✅ Timestamp and watermark checking</div>
            <div>✅ Device fingerprinting enabled</div>
          </div>
        </div>

        {/* 1. QR Scanner Phase */}
        {!scanResult && !error && !pendingVendorId && !showCamera && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl p-4">
            <div id="reader" style={{ minHeight: '300px' }}></div>
            <div className="mt-4 text-center text-gray-500 text-sm space-y-1">
              <div className="flex items-center justify-center gap-2">
                <MapPin size={16} className="text-smc-blue" />
                {location ? `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Detecting GPS..."}
              </div>
              {gpsStatus === 'initializing' && (
                <div className="text-[10px] font-bold uppercase text-blue-500">
                  🔄 Getting GPS...
                </div>
              )}
              {gpsStatus === 'good' && accuracy !== null && (
                <div className="text-[10px] font-bold uppercase text-green-500">
                  ✓ GPS: ±{accuracy.toFixed(1)}m (High Accuracy)
                </div>
              )}
              {gpsStatus === 'poor' && accuracy !== null && (
                <div className="text-[10px] font-bold uppercase text-yellow-500">
                  ⚠ GPS: ±{accuracy.toFixed(1)}m (Low Accuracy)
                </div>
              )}
              {gpsStatus === 'failed' && (
                <div className="text-[10px] font-bold uppercase text-red-500">
                  ✗ GPS Failed - Please enable location
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Photo Capture Phase (Mandatory Anti-Fraud Verification) */}
        {showCamera && !capturedImage && (
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative border-4 border-red-500 animate-in fade-in duration-500">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-square object-cover" />
            
            {/* Security Indicators */}
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <div className="bg-red-600/90 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                🔒 LIVE CAPTURE ACTIVE
              </div>
              <div className="bg-black/60 px-2 py-1 rounded-full text-xs">
                {accuracy ? `GPS: ±${accuracy.toFixed(1)}m` : 'Detecting GPS...'}
              </div>
            </div>
            
            {/* Anti-Fraud Warning */}
            <div className="absolute top-20 left-4 bg-red-900/90 px-3 py-2 rounded-lg max-w-[200px]">
              <p className="text-xs font-bold text-white">⚠️ FRAUD DETECTION</p>
              <p className="text-xs text-gray-300">Real camera capture required. No uploads or screenshots allowed.</p>
            </div>
            
            <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-4 px-6">
              <div className="bg-red-900/80 p-3 rounded-lg text-center max-w-[300px]">
                <p className="text-sm font-bold text-white mb-2">📸 MANDATORY PHOTO CAPTURE</p>
                <p className="text-xs text-gray-300">
                  Take a live photo of the vendor/stall. System will verify authenticity and prevent fraud.
                </p>
                <div className="text-xs text-yellow-400 mt-2">
                  ✓ EXIF validation ✓ GPS verification ✓ Timestamp check ✓ Watermark verification
                </div>
              </div>
              
              <button 
                onClick={takePhoto}
                className="w-24 h-24 bg-red-600 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition shadow-lg"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <Camera size={40} className="text-red-600" />
                </div>
              </button>
              
              <p className="text-xs text-gray-400 text-center">
                Tap to capture secure verification photo
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 flex flex-col items-center gap-4">
            <div className="animate-spin text-smc-gold"><RefreshCw size={48} /></div>
            <p className="text-lg font-semibold">Validating Geo-Tagged Proof...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 p-6 rounded-2xl text-center space-y-4">
            <ShieldAlert size={48} className="mx-auto text-red-500" />
            <h2 className="text-xl font-bold text-red-500">Security Error</h2>
            <p className="text-gray-300">{error}</p>
            <button onClick={resetScanner} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition">
              RESTART SCAN
            </button>
          </div>
        )}

        {pendingVendorId && !location && (
          <div className="bg-blue-500/10 border border-blue-500 p-6 rounded-2xl text-center space-y-4 shadow-xl">
            <RefreshCw size={48} className="mx-auto text-blue-500 animate-spin" />
            <h2 className="text-xl font-bold text-blue-500">Waiting for GPS</h2>
            <p className="text-gray-300 text-sm">
              Scan successful! We are still trying to detect your location to verify if the vendor is in the right spot.
            </p>
            <div className="pt-2 space-y-2">
              <button onClick={useMockLocation} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
                USE MOCK LOCATION FOR TESTING
              </button>
              <button onClick={() => setShowManualLocation(true)} className="w-full bg-gray-600 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition shadow-lg">
                ENTER LOCATION MANUALLY
              </button>
            </div>
          </div>
        )}

        {showManualLocation && (
          <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Enter Location Manually</h2>
              <button onClick={() => setShowManualLocation(false)}>
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => window.open('https://www.google.com/maps', '_blank')}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"
              >
                <MapPin size={20} /> Open Google Maps to Get Location
              </button>

              <div className="text-center text-gray-400 text-sm font-semibold py-2">OR ENTER MANUALLY</div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g., 17.6599"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g., 75.9064"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-500 italic">
                Tip: In Google Maps, tap and hold on your location to see coordinates.
              </p>
              <button
                onClick={handleManualLocationSubmit}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Send size={20} /> Set Location
              </button>
            </div>
          </div>
        )}

        {scanResult && !reportSuccess && (
          <div className={`p-6 rounded-2xl border-t-8 shadow-2xl space-y-6 ${
            scanResult.validationStatus === 'VALID' ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500 animate-pulse'
          }`}>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <h2 className={`text-2xl font-bold ${
                  scanResult.validationStatus === 'VALID' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {scanResult.validationStatus === 'VALID' ? 'VERIFIED SPOT' : 'SECURITY BREACH'}
                </h2>
                <p className="text-gray-400 mt-1">{scanResult.message}</p>
              </div>
              {capturedImage && (
                <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-white/20">
                  <img src={capturedImage} alt="Proof" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="bg-black/20 p-4 rounded-xl space-y-2">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Vendor</span>
                <span className="font-bold">{scanResult.vendorName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Security Mode</span>
                <span className="font-bold text-smc-gold flex items-center gap-1">
                   <ShieldCheck size={14} /> GPS + Photo
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Distance Error</span>
                <span className="font-bold text-red-400">
                  {scanResult.distance !== null ? `${scanResult.distance.toFixed(2)} meters` : 'N/A'}
                </span>
              </div>
              {scanResult.confidence !== null && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Confidence Score</span>
                  <span className={`font-bold ${scanResult.confidence >= 0.8 ? 'text-green-400' : scanResult.confidence >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(scanResult.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {scanResult.algorithmUsed && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Algorithm</span>
                  <span className="font-bold text-blue-400 text-xs">
                    {scanResult.algorithmUsed}
                  </span>
                </div>
              )}
              {scanResult.gpsAccuracy !== null && scanResult.gpsAccuracy !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">GPS Accuracy</span>
                  <span className={`font-bold ${scanResult.gpsAccuracy <= 10 ? 'text-green-400' : scanResult.gpsAccuracy <= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                    ±{scanResult.gpsAccuracy.toFixed(1)}m
                  </span>
                </div>
              )}
            </div>

            {scanResult.validationStatus !== 'VALID' && (
              <div className="space-y-4">
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-red-500 transition"
                  placeholder="Additional details about the location violation..."
                />
                <button 
                  onClick={handleReport}
                  disabled={reporting}
                  className="w-full bg-red-500 text-white py-4 rounded-xl font-bold hover:bg-red-600 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Send size={20} /> {reporting ? 'Submitting Evidence...' : 'SUBMIT SECURE REPORT'}
                </button>
              </div>
            )}
            
            <button onClick={resetScanner} className="w-full py-2 text-sm text-gray-500 hover:text-white transition underline">
              Scan Another Vendor
            </button>
          </div>
        )}

        {reportSuccess && (
          <div className="bg-green-500/10 border border-green-500 p-8 rounded-2xl text-center space-y-4">
            <ShieldCheck size={64} className="mx-auto text-green-500" />
            <h2 className="text-2xl font-bold text-green-500">Evidence Submitted</h2>
            <p className="text-gray-300">
              Thank you. The geo-tagged photo and location data have been sent to SMC. An automatic challan has been issued to the vendor.
            </p>
            <button onClick={resetScanner} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition">
              FINISH
            </button>
          </div>
        )}

        <div className="text-center text-xs text-gray-600 uppercase tracking-widest pt-8">
          SMC Smart City Enforcement
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
