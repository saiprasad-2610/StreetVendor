import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MapPin, IndianRupee, Layers } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '350px'
};

const solapurCenter = {
  lat: 17.6599,
  lng: 75.9064
};

const AddVendor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState([]);
  const [formData, setFormData] = useState({
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
      try {
        const response = await axios.get('/api/zones');
        setZones(response.data.filter(z => z.isActive && z.zoneType === 'ALLOWED'));
      } catch (err) {
        console.error("Failed to fetch zones", err);
      }
    };
    fetchZones();
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const mapRef = useRef(null);

  const onMapClick = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      latitude: e.latLng.lat(),
      longitude: e.latLng.lng()
    }));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
      }, (err) => {
        alert("Unable to retrieve location: " + err.message);
      });
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/vendors', {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        monthlyRent: parseFloat(formData.monthlyRent),
        zoneId: formData.zoneId ? parseInt(formData.zoneId) : null
      });
      alert('Vendor registered successfully!');
      navigate('/vendors');
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/vendors')} className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Register New Vendor</h1>
          <p className="text-gray-500 text-sm">Add a new street vendor to the SMC system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-600">Full Name</label>
            <input name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" placeholder="Vendor's full name" />
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

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Layers size={18} className="text-smc-blue" />
            Vending Zone Allocation
          </h3>
          <p className="text-xs text-gray-500">Select an authorized zone and mark the specific spot for this vendor.</p>
          
          <select
            name="zoneId"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-smc-blue focus:border-transparent outline-none"
            value={formData.zoneId}
            onChange={(e) => {
              const zone = zones.find(z => z.id === parseInt(e.target.value));
              setFormData(prev => ({
                ...prev,
                zoneId: e.target.value,
                latitude: zone ? zone.latitude : prev.latitude,
                longitude: zone ? zone.longitude : prev.longitude
              }));
            }}
          >
            <option value="">Select an Authorized Zone</option>
            {zones.map(zone => (
              <option key={zone.id} value={zone.id}>
                {zone.name} (Radius: {zone.radiusMeters}m)
              </option>
            ))}
          </select>

          <div className="rounded-xl overflow-hidden border border-gray-200 relative">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={{ lat: formData.latitude, lng: formData.longitude }}
                zoom={16}
                onClick={onMapClick}
              >
                <Marker position={{ lat: formData.latitude, lng: formData.longitude }} />
                
                {zones.map(zone => (
                  <Circle
                    key={zone.id}
                    center={{ lat: zone.latitude, lng: zone.longitude }}
                    radius={zone.radiusMeters}
                    options={{
                      fillColor: formData.zoneId == zone.id ? '#22c55e' : '#94a3b8',
                      fillOpacity: formData.zoneId == zone.id ? 0.2 : 0.1,
                      strokeColor: formData.zoneId == zone.id ? '#22c55e' : '#94a3b8',
                      strokeOpacity: 0.5,
                      strokeWeight: 2,
                    }}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div className="h-[300px] bg-gray-100 flex items-center justify-center">Loading Map...</div>
            )}
            <button 
              type="button"
              onClick={getCurrentLocation}
              className="absolute bottom-4 right-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 text-smc-blue"
              title="Get Current Location"
            >
              <MapPin size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="space-y-1 text-xs">
              <span className="text-gray-500 font-semibold uppercase tracking-wider">Latitude</span>
              <p className="font-mono font-bold text-gray-800">{formData.latitude.toFixed(6)}</p>
            </div>
            <div className="space-y-1 text-xs">
              <span className="text-gray-500 font-semibold uppercase tracking-wider">Longitude</span>
              <p className="font-mono font-bold text-gray-800">{formData.longitude.toFixed(6)}</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-smc-blue text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition shadow-lg flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {loading ? 'Registering...' : 'REGISTER VENDOR'}
        </button>
      </form>
    </div>
  );
};

export default AddVendor;
