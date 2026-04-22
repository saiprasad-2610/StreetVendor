import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import axios from 'axios';
import { format } from 'date-fns';
import { MapPin, User, Calendar, IndianRupee, AlertCircle, Phone } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const solapurCenter = {
  lat: 17.6599,
  lng: 75.9064
};

const MapView = () => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [zones, setZones] = useState([]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const fetchVendors = async () => {
    try {
      const response = await axios.get('/api/vendors');
      setVendors(response.data.filter(v => v.status === 'APPROVED'));
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await axios.get('/api/zones'); // Assuming this endpoint exists
      setZones(response.data);
    } catch (err) {
      console.error("Failed to fetch zones", err);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchZones();
  }, []);

  const [map, setMap] = useState(null);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-xl">Loading Map...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Solapur Vendor Management Map</h1>
          <p className="text-gray-500 text-sm">Real-time visualization of allocated vendor spots and streets</p>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Approved Vendor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Allowed Zone</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Restricted Zone</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-2 rounded-xl shadow-md border h-[650px] overflow-hidden relative">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={solapurCenter}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: true,
            }}
          >
            {/* Zones / Allocated Streets */}
            {zones.map(zone => (
              <Circle
                key={`zone-${zone.id}`}
                center={{ lat: zone.latitude, lng: zone.longitude }}
                radius={zone.radiusMeters}
                options={{
                  fillColor: zone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                  fillOpacity: 0.15,
                  strokeColor: zone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                  strokeOpacity: 0.5,
                  strokeWeight: 2,
                }}
              />
            ))}

            {/* Vendor Markers */}
            {vendors.map(vendor => (
              <Marker
                key={vendor.id}
                position={{ lat: vendor.latitude, lng: vendor.longitude }}
                onClick={() => setSelectedVendor(vendor)}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }}
              />
            ))}

            {selectedVendor && (
              <InfoWindow
                position={{ lat: selectedVendor.latitude, lng: selectedVendor.longitude }}
                onCloseClick={() => setSelectedVendor(null)}
              >
                <div className="p-1 max-w-[250px]">
                  <div className="flex items-center gap-2 mb-2 border-b pb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                      {selectedVendor.faceImageUrl ? (
                        <img src={selectedVendor.faceImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">{selectedVendor.name}</h3>
                      <p className="text-[10px] text-gray-500">{selectedVendor.vendorId}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{selectedVendor.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>Joined: {selectedVendor.createdAt ? format(new Date(selectedVendor.createdAt), 'dd MMM yyyy') : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                      <IndianRupee className="w-3 h-3" />
                      <span>Monthly Rent: ₹{selectedVendor.monthlyRent || 0}</span>
                    </div>
                    <div className={`flex items-center gap-2 font-bold ${selectedVendor.totalPendingFine > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <AlertCircle className="w-3 h-3" />
                      <span>Pending Fine: ₹{selectedVendor.totalPendingFine || 0}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => window.location.href = `/vendors/${selectedVendor.id}`}
                    className="mt-3 w-full bg-blue-600 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Full Details
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-md border">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Active Vendors</span>
                <span className="font-bold text-blue-600">{vendors.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Total Zones</span>
                <span className="font-bold text-red-600">{zones.length}</span>
              </div>
            </div>
          </div>

          {selectedVendor && (
            <div className="bg-white p-4 rounded-xl shadow-md border border-blue-200 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="font-bold text-gray-800 mb-3">Selected Vendor</h2>
              <div className="space-y-4">
                <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden border">
                  {selectedVendor.faceImageUrl ? (
                    <img src={selectedVendor.faceImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedVendor.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                    <Phone className="w-3 h-3" />
                    <span>{selectedVendor.phone}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-blue-50 p-2 rounded border border-blue-100 text-center">
                      <p className="text-[10px] text-blue-600 uppercase font-bold">Rent</p>
                      <p className="font-bold text-blue-900">₹{selectedVendor.monthlyRent || 0}</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded border border-red-100 text-center">
                      <p className="text-[10px] text-red-600 uppercase font-bold">Fines</p>
                      <p className="font-bold text-red-900">₹{selectedVendor.totalPendingFine || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
