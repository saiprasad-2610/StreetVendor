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

  useEffect(() => {
    let scanner = null;
    
    const timer = setTimeout(() => {
      scanner = new Html5QrcodeScanner('reader', {
         qrbox: { width: 250, height: 250 },
         fps: 10,
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
        // use result as is
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

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAccuracy(pos.coords.accuracy);
        },
        (err) => {
          console.error("GPS Error:", err);
          setError("Location access denied. Please enable GPS and allow browser access.");
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 0 
        }
      );
    }

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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
    }
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && location) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // 1. Draw the actual photo
      ctx.drawImage(video, 0, 0, width, height);
      
      // 2. Add Geo-Tag Overlay (The Anti-Fraud Watermark)
      const overlayHeight = height * 0.25;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, height - overlayHeight, width, overlayHeight);
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.max(12, width * 0.035)}px Arial`;
      
      const padding = width * 0.05;
      let currentY = height - overlayHeight + padding;
      const lineSpacing = width * 0.045;

      // Line 1: Location Status
      ctx.fillText("📍 SOLAPUR MUNICIPAL CORPORATION - VERIFIED", padding, currentY);
      currentY += lineSpacing;

      // Line 2: Coordinates
      ctx.font = `${Math.max(10, width * 0.03)}px monospace`;
      ctx.fillText(`LAT: ${location.lat.toFixed(7)}° | LONG: ${location.lng.toFixed(7)}°`, padding, currentY);
      currentY += lineSpacing;

      // Line 3: Timestamp
      const now = new Date();
      ctx.fillText(`DATE: ${now.toLocaleDateString()} | TIME: ${now.toLocaleTimeString()}`, padding, currentY);
      currentY += lineSpacing;

      // Line 4: Security Token
      ctx.fillStyle = '#fbbf24'; // Gold color
      ctx.fillText(`SECURITY TOKEN: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, padding, currentY);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(dataUrl);
      
      // Stop stream
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Proceed to validation
      if (pendingVendorId) {
        handleValidation(pendingVendorId, dataUrl);
      }
    }
  };

  const handleValidation = async (vendorId, photoData) => {
    setLoading(true);
    setError(null);
    setShowCamera(false);
    try {
      // In a real app, upload the photoData (base64) to a file server first
      // For this demo, we'll use a placeholder URL
      const response = await axios.post('/api/scan/validate', {
        vendorId,
        latitude: location.lat,
        longitude: location.lng,
        imageProofUrl: "geo_tagged_proof_" + Date.now() + ".jpg"
      });
      setScanResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const useMockLocation = () => {
    // Mock Solapur location
    const mockLoc = { lat: 17.6599, lng: 75.9064 };
    setLocation(mockLoc);
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
          <div>
            <h1 className="text-2xl font-bold">{user ? 'Security Verification' : 'Public Compliance'}</h1>
            <p className="text-gray-400 text-sm">QR Scan + Geo-Tagged Photo Proof</p>
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
              {accuracy !== null && (
                <div className={`text-[10px] font-bold uppercase ${accuracy < 10 ? 'text-green-500' : 'text-orange-500'}`}>
                  Precision: ±{accuracy.toFixed(1)} meters {accuracy < 10 ? '(High Accuracy)' : '(Low Accuracy)'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Photo Capture Phase (The Geo-Tagging Part) */}
        {showCamera && !capturedImage && (
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative border-4 border-smc-gold animate-in fade-in duration-500">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-square object-cover" />
            <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              GEO-TAGGING ACTIVE
            </div>
            <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-4 px-6">
              <p className="text-center text-sm font-bold bg-black/80 p-2 rounded-lg">
                STEP 2: Capture a photo of the vendor/stall to verify the location
              </p>
              <button 
                onClick={takePhoto}
                className="w-20 h-20 bg-white rounded-full border-8 border-gray-300 flex items-center justify-center hover:scale-105 transition"
              >
                <div className="w-12 h-12 bg-smc-blue rounded-full flex items-center justify-center text-white">
                  <Camera size={32} />
                </div>
              </button>
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
            <div className="pt-2">
              <button onClick={useMockLocation} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
                USE MOCK LOCATION FOR TESTING
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
              <div className="flex justify-between">
                <span className="text-gray-400">Distance Error</span>
                <span className="font-bold text-red-400">{Math.round(scanResult.distance)} meters</span>
              </div>
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
