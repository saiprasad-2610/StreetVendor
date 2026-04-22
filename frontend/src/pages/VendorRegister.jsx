import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, User, Lock, IndianRupee, Layers, Navigation } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '350px'
};

const VendorRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [liveMeta, setLiveMeta] = useState({ accuracy: null, lastUpdatedAt: null });
  const watchIdRef = useRef(null);
  const pausePanUntilRef = useRef(0);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    phone: '',
    aadhaar: '',
    category: 'VEGETABLE',
    latitude: 17.6599,
    longitude: 75.9064,
    address: '',
    monthlyRent: 500,
    zoneId: ''
  });

  useEffect(() => {
    const fetchZones = async () => {
      setZonesLoading(true);
      setZonesError('');
      try {
        const response = await axios.get('/api/zones');
        const raw = Array.isArray(response.data) ? response.data : [];
        const filtered = raw.filter(z => {
          const active = z?.isActive ?? z?.active ?? true;
          const type = String(z?.zoneType ?? '').toUpperCase();
          return Boolean(active) && type === 'ALLOWED';
        });
        setZones(filtered);
      } catch (err) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch zones';
        setZonesError(status ? `${message} (HTTP ${status})` : message);
        setZones([]);
      }
      setZonesLoading(false);
    };
    fetchZones();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const mapRef = useRef(null);

  const onMapClick = useCallback((e) => {
    pausePanUntilRef.current = Date.now() + 8000;
    setFormData(prev => ({
      ...prev,
      latitude: e.latLng.lat(),
      longitude: e.latLng.lng()
    }));
  }, [isLive]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const stopLiveTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsStartingLive(false);
    setIsLive(false);
    setLiveMeta({ accuracy: null, lastUpdatedAt: null });
  };

  const panTo = (lat, lng) => {
    if (!mapRef.current) return;
    mapRef.current.panTo({ lat, lng });
  };

  const getZoomForRadius = (radiusMeters) => {
    const r = Number(radiusMeters || 0);
    if (r <= 30) return 19;
    if (r <= 80) return 18;
    if (r <= 200) return 17;
    if (r <= 500) return 15;
    return 14;
  };

  const focusZone = (zone) => {
    if (!zone) return;
    const lat = Number(zone.latitude);
    const lng = Number(zone.longitude);
    pausePanUntilRef.current = Date.now() + 8000;
    if (!mapRef.current) return;
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(getZoomForRadius(zone.radiusMeters));
  };

  const startLiveTracking = () => {
    if (!navigator.geolocation) {
      setLiveError('Geolocation is not supported in this browser.');
      return;
    }

    setLiveError('');
    setIsStartingLive(true);
    setIsLive(true);

    const onSuccess = (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
      setLiveMeta({
        accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
        lastUpdatedAt: Date.now()
      });
      if (Date.now() > pausePanUntilRef.current) {
        panTo(lat, lng);
      }
      setIsStartingLive(false);
    };

    const onError = (err, shouldStopOnNonTimeout) => {
      if (err?.code === 1) {
        setLiveError('Location permission denied. Please allow location and try again.');
        stopLiveTracking();
        return;
      }

      if (err?.code === 2) {
        setLiveError('Location unavailable. Please turn on GPS and try again.');
        if (shouldStopOnNonTimeout) stopLiveTracking();
        return;
      }

      if (err?.code === 3) {
        setLiveError('GPS timeout. Keep location ON and wait a bit…');
        setIsStartingLive(false);
        return;
      }

      setLiveError(err?.message || 'Live tracking failed.');
      if (shouldStopOnNonTimeout) stopLiveTracking();
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => onError(err, true),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      (err) => onError(err, false),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 }
    );
  };

  const toggleLiveTracking = () => {
    if (isLive) {
      setLiveError('');
      stopLiveTracking();
    } else {
      startLiveTracking();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.zoneId) {
      alert("Please select a Vending Zone first!");
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/vendors/register', {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        monthlyRent: parseFloat(formData.monthlyRent),
        zoneId: parseInt(formData.zoneId)
      });
      alert('Registration successful! You can now login after admin approval. Your unique QR code will be generated upon approval.');
      navigate('/login');
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/login" className="p-2 hover:bg-gray-200 rounded-full transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Vendor Self-Registration</h1>
            <p className="text-gray-500 text-sm">Join the Smart Street Vendor Management System</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2 mb-4">
                <User size={18} className="text-blue-600" /> Account Credentials
              </h3>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Username</label>
              <div className="relative">
                <input name="username" required value={formData.username} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" placeholder="Pick a username" />
                <User size={16} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Password</label>
              <div className="relative">
                <input name="password" type="password" required value={formData.password} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" placeholder="Create a password" />
                <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>

            <div className="md:col-span-2">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2 mb-4 mt-4">
                <Save size={18} className="text-blue-600" /> Personal Information
              </h3>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Full Name</label>
              <input name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" placeholder="Your full name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Phone Number</label>
              <input name="phone" required value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" placeholder="10-digit mobile number" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Aadhaar Number</label>
              <input name="aadhaar" required value={formData.aadhaar} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" placeholder="XXXX-XXXX-XXXX" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Vending Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600">
                <option value="VEGETABLE">Vegetables</option>
                <option value="FRUIT">Fruits</option>
                <option value="FOOD">Fast Food / Snacks</option>
                <option value="TEA">Tea / Coffee</option>
                <option value="PAN_SHOP">Pan Shop</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Monthly Rent (₹)</label>
              <div className="relative">
                <input name="monthlyRent" type="number" required value={formData.monthlyRent} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" placeholder="500" />
                <IndianRupee size={16} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Layers size={18} className="text-blue-600" /> Select Vending Zone & Location
              </h3>
              <button 
                type="button" 
                onClick={toggleLiveTracking} 
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                  isLive 
                    ? 'bg-green-500 text-white animate-pulse' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                <Navigation size={14} className={isLive ? 'animate-bounce' : ''} />
                {isLive ? (isStartingLive ? 'STARTING…' : 'LIVE TRACKING ON') : 'GO LIVE (GPS)'}
              </button>
            </div>
            {liveError ? (
              <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {liveError}
              </div>
            ) : null}
            {isLive && !liveError ? (
              <div className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg flex items-center justify-between gap-3">
                <span>
                  {isStartingLive ? 'Waiting for GPS fix…' : 'Live GPS running'}
                </span>
                <span className="font-mono">
                  {liveMeta.accuracy ? `±${Math.round(liveMeta.accuracy)}m` : '±—m'} • {liveMeta.lastUpdatedAt ? new Date(liveMeta.lastUpdatedAt).toLocaleTimeString() : '—'}
                </span>
              </div>
            ) : null}

            <div className="space-y-4">
              <select
                name="zoneId"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-blue-50/30"
                value={formData.zoneId}
                onChange={(e) => {
                  const zone = zones.find(z => z.id === parseInt(e.target.value));
                  if (zone) focusZone(zone);
                  setFormData(prev => ({
                    ...prev,
                    zoneId: e.target.value,
                    latitude: zone && !isLive ? zone.latitude : prev.latitude,
                    longitude: zone && !isLive ? zone.longitude : prev.longitude
                  }));
                }}
                disabled={zonesLoading}
              >
                <option value="">
                  {zonesLoading ? 'Loading zones…' : 'Choose an Authorized Zone (Required)'}
                </option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} (Radius: {zone.radiusMeters}m)
                  </option>
                ))}
              </select>
              {zonesError ? (
                <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {zonesError}
                </div>
              ) : null}
              {!zonesLoading && !zonesError && zones.length === 0 ? (
                <div className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                  No Active ALLOWED zones found. In admin, make sure the zone is Active and Type is ALLOWED.
                </div>
              ) : null}

              <div className="bg-gray-100 rounded-xl overflow-hidden border-2 border-blue-100 h-[350px] relative">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={{ lat: formData.latitude, lng: formData.longitude }}
                    zoom={17}
                    onClick={onMapClick}
                    onLoad={map => mapRef.current = map}
                    options={{
                      gestureHandling: 'greedy',
                      mapTypeControl: false,
                      streetViewControl: false
                    }}
                  >
                    <Marker 
                      position={{ lat: formData.latitude, lng: formData.longitude }}
                      icon={isLive && typeof window !== 'undefined' && window.google?.maps ? {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#3b82f6",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                      } : undefined}
                    />

          {isLive && liveMeta.accuracy && liveMeta.accuracy > 0 ? (
            <Circle
              center={{ lat: formData.latitude, lng: formData.longitude }}
              radius={liveMeta.accuracy}
              options={{
                fillColor: '#3b82f6',
                fillOpacity: 0.12,
                strokeColor: '#3b82f6',
                strokeOpacity: 0.35,
                strokeWeight: 2,
              }}
            />
          ) : null}
                    
                    {zones.map(zone => (
                      <Circle
                        key={zone.id}
                        center={{ lat: Number(zone.latitude), lng: Number(zone.longitude) }}
                        radius={zone.radiusMeters}
                        options={{
                          fillColor: formData.zoneId == zone.id ? '#22c55e' : '#94a3b8',
                          fillOpacity: formData.zoneId == zone.id ? 0.2 : 0.1,
                          strokeColor: formData.zoneId == zone.id ? '#22c55e' : '#94a3b8',
                          strokeOpacity: 0.5,
                          strokeWeight: formData.zoneId == zone.id ? 4 : 2,
                        }}
                      />
                    ))}
                  </GoogleMap>
                ) : (
                  <div className="h-full flex items-center justify-center">Loading Maps...</div>
                )}
                
                {isLive && (
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg border border-green-200 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Real-time GPS Active</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="space-y-1 text-xs">
                  <span className="text-gray-500 font-semibold uppercase">Current Latitude</span>
                  <p className="font-mono font-bold text-blue-800 text-sm">{formData.latitude.toFixed(8)}</p>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-gray-500 font-semibold uppercase">Current Longitude</span>
                  <p className="font-mono font-bold text-blue-800 text-sm">{formData.longitude.toFixed(8)}</p>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm font-semibold text-gray-600">Specific Address / Landmark</label>
                  <input name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600 bg-white" placeholder="e.g. Near Solapur Central Bus Stand" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-800 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'SUBMIT REGISTRATION APPLICATION'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4 px-8">
              Note: You must be physically present inside your selected zone to register. The system enforces a strict 4-meter accuracy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorRegister;
