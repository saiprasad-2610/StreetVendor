import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { MapPin, Plus, Trash2, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '500px'
};

const solapurCenter = {
  lat: 17.6599,
  lng: 75.9064
};

const ZoneManagement = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [mapCenter, setMapCenter] = useState(solapurCenter);
  const [mapZoom, setMapZoom] = useState(14);
  const [newZone, setNewZone] = useState({
    name: '',
    zoneType: 'ALLOWED',
    latitude: 17.6599,
    longitude: 75.9064,
    radiusMeters: 100,
    isActive: true
  });

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const mapRef = useRef(null);

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    if (!isAdding) return;
    setMapCenter({ lat: newZone.latitude, lng: newZone.longitude });
    setMapZoom(17);
  }, [isAdding, newZone.latitude, newZone.longitude]);

  const fetchZones = async () => {
    try {
      const response = await axios.get('/api/zones');
      setZones(response.data);
    } catch (err) {
      console.error("Failed to fetch zones", err);
    } finally {
      setLoading(false);
    }
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
    const zoom = getZoomForRadius(zone.radiusMeters);
    setSelectedZoneId(zone.id);
    setMapCenter({ lat, lng });
    setMapZoom(zoom);
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(zoom);
    }
  };

  const handleMapClick = useCallback((e) => {
    if (isAdding) {
      setNewZone(prev => ({
        ...prev,
        latitude: e.latLng.lat(),
        longitude: e.latLng.lng()
      }));
    }
  }, [isAdding]);

  const handleSaveZone = async () => {
    if (!newZone.name) {
      alert("Please enter a zone name");
      return;
    }
    try {
      await axios.post('/api/zones', newZone);
      alert("Zone created successfully!");
      setIsAdding(false);
      setNewZone({
        name: '',
        zoneType: 'ALLOWED',
        latitude: 17.6599,
        longitude: 75.9064,
        radiusMeters: 100,
        isActive: true
      });
      fetchZones();
    } catch (err) {
      console.error("Failed to save zone", err);
      alert("Failed to save zone");
    }
  };

  const handleDeleteZone = async (id) => {
    if (!window.confirm("Are you sure you want to delete this zone?")) return;
    try {
      await axios.delete(`/api/zones/${id}`);
      fetchZones();
    } catch (err) {
      console.error("Failed to delete zone", err);
      alert("Failed to delete zone");
    }
  };

  if (!isLoaded) return <div className="p-8 text-center">Loading Maps...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Zone Management</h1>
          <p className="text-gray-500 text-sm">Define vending boundaries across Solapur City</p>
        </div>
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={20} /> Create New Zone
          </button>
        ) : (
          <button 
            onClick={() => setIsAdding(false)}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition"
          >
            <X size={20} /> Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-2 rounded-xl shadow-md border overflow-hidden relative">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={mapZoom}
              onClick={handleMapClick}
              onLoad={map => mapRef.current = map}
            >
              {zones.map(zone => (
                <React.Fragment key={zone.id}>
                  <Marker
                    position={{ lat: Number(zone.latitude), lng: Number(zone.longitude) }}
                    onClick={() => focusZone(zone)}
                  />
                  <Circle
                    center={{ lat: Number(zone.latitude), lng: Number(zone.longitude) }}
                    radius={Number(zone.radiusMeters)}
                    options={{
                      fillColor: zone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                      fillOpacity: 0.2,
                      strokeColor: zone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                      strokeOpacity: 0.8,
                      strokeWeight: selectedZoneId === zone.id ? 4 : 2,
                    }}
                    onClick={() => focusZone(zone)}
                  />
                </React.Fragment>
              ))}

              {isAdding && (
                <>
                  <Marker position={{ lat: newZone.latitude, lng: newZone.longitude }} draggable={true} onDragEnd={(e) => {
                    setNewZone(prev => ({ ...prev, latitude: e.latLng.lat(), longitude: e.latLng.lng() }));
                  }} />
                  <Circle
                    center={{ lat: newZone.latitude, lng: newZone.longitude }}
                    radius={newZone.radiusMeters}
                    options={{
                      fillColor: newZone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                      fillOpacity: 0.4,
                      strokeColor: newZone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                      strokeWeight: 4,
                      editable: true,
                    }}
                    onRadiusChanged={() => {
                      // This is tricky with uncontrolled components, simpler to use the input
                    }}
                  />
                </>
              )}
            </GoogleMap>
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded shadow text-xs font-bold flex gap-4">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full opacity-50"></div> Allowed Zone</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full opacity-50"></div> Restricted Zone</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {isAdding ? (
            <div className="bg-white p-6 rounded-xl shadow-md border border-blue-200 animate-in slide-in-from-right-4 duration-300">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="text-blue-600" size={20} /> New Zone Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Zone Name</label>
                  <input 
                    type="text" 
                    className="w-full mt-1 px-3 py-2 border rounded outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g. Market Yard Area"
                    value={newZone.name}
                    onChange={e => setNewZone({...newZone, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                  <select 
                    className="w-full mt-1 px-3 py-2 border rounded outline-none focus:ring-2 focus:ring-blue-600"
                    value={newZone.zoneType}
                    onChange={e => setNewZone({...newZone, zoneType: e.target.value})}
                  >
                    <option value="ALLOWED">Allowed Vending</option>
                    <option value="RESTRICTED">Restricted Area</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Radius (Meters): {newZone.radiusMeters}m</label>
                  <input 
                    type="range" 
                    min="10" 
                    max="1000" 
                    step="10"
                    className="w-full mt-1"
                    value={newZone.radiusMeters}
                    onChange={e => setNewZone({...newZone, radiusMeters: parseInt(e.target.value)})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 font-mono">
                  <div>LAT: {newZone.latitude.toFixed(6)}</div>
                  <div>LNG: {newZone.longitude.toFixed(6)}</div>
                </div>
                <button 
                  onClick={handleSaveZone}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Save Zone
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md border max-h-[500px] flex flex-col">
              <div className="p-4 border-b font-bold text-gray-800">Existing Zones ({zones.length})</div>
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {zones.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 text-sm">No zones defined yet.</p>
                ) : (
                  zones.map(zone => (
                    <div
                      key={zone.id}
                      className={`p-3 rounded-lg border hover:bg-gray-50 transition group cursor-pointer ${selectedZoneId === zone.id ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                      onClick={() => focusZone(zone)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${zone.zoneType === 'ALLOWED' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <p className="font-bold text-gray-800 text-sm">{zone.name}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">Radius: {zone.radiusMeters}m | Type: {zone.zoneType}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteZone(zone.id)}
                          className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
              <AlertTriangle size={16} /> Guidelines
            </h3>
            <ul className="text-xs text-blue-700 space-y-2 list-disc pl-4">
              <li>Click on the map to place a new zone marker.</li>
              <li>Drag the marker to adjust the center point.</li>
              <li>Use the slider to set the enforcement radius.</li>
              <li>Vendors outside "Allowed" zones will receive automatic notifications.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneManagement;
