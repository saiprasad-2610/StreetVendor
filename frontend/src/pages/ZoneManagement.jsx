import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, Polygon } from '@react-google-maps/api';
import { MapPin, Plus, Trash2, Save, X, AlertTriangle, CheckCircle, Edit3 } from 'lucide-react';

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
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZonePopup, setShowZonePopup] = useState(false);
  const [zoneVendors, setZoneVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [zoneAddress, setZoneAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState(solapurCenter);
  const [mapZoom, setMapZoom] = useState(14);
  const [mapType, setMapType] = useState('satellite');
  const [drawingMode, setDrawingMode] = useState('polygon'); // 'circle', 'polygon', or 'rectangle'
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isEditingZone, setIsEditingZone] = useState(false);
  const [editZoneData, setEditZoneData] = useState({
    monthlyRent: 0
  });
  const [newZone, setNewZone] = useState({
    name: '',
    zoneType: 'ALLOWED',
    latitude: 17.6599,
    longitude: 75.9064,
    radiusMeters: 100,
    monthlyRent: 500,
    lengthMeters: 0,
    breadthMeters: 0,
    totalSizeSqMeters: 0,
    polygonCoordinates: null,
    isActive: true,
    isAvailable: true,
    rectLength: 10,
    rectBreadth: 10
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
      // API returns nested structure: { success: true, data: [...] }
      const zonesData = response.data?.data || response.data;
      console.log('Zones data:', zonesData);
      if (zonesData && zonesData.length > 0) {
        const tlZone = zonesData.find(z => z.name === 'TL');
        console.log('Zone TL data:', JSON.stringify(tlZone, null, 2));
      }
      setZones(Array.isArray(zonesData) ? zonesData : []);
    } catch (err) {
      console.error("Failed to fetch zones", err);
      setZones([]);
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

  const getZoneColor = (zone, index) => {
    const isSelected = selectedZoneId === zone.id;
    const isAvailable = zone.isAvailable !== false; // Default to true if not set
    
    // If selected, use green
    if (isSelected) {
      return {
        fillColor: '#22c55e',
        strokeColor: '#16a34a',
        fillOpacity: 0.5,
        strokeOpacity: 1,
        strokeWeight: 5
      };
    }
    
    // If not available (allocated), use red/orange
    if (!isAvailable) {
      return {
        fillColor: '#ef4444',
        strokeColor: '#dc2626',
        fillOpacity: 0.4,
        strokeOpacity: 0.9,
        strokeWeight: 3
      };
    }
    
    // Available zones use yellow
    return {
      fillColor: '#FFD700',
      strokeColor: '#FFA500',
      fillOpacity: 0.4,
      strokeOpacity: 0.9,
      strokeWeight: 3
    };
  };

  const calculatePolygonCentroid = (polygonData) => {
    if (!polygonData) return null;
    try {
      const points = typeof polygonData === 'string' ? JSON.parse(polygonData) : polygonData;
      if (!Array.isArray(points) || points.length === 0) return null;
      
      let lat = 0, lng = 0;
      points.forEach(point => {
        lat += point.lat;
        lng += point.lng;
      });
      return { lat: lat / points.length, lng: lng / points.length };
    } catch (e) {
      return null;
    }
  };

  const focusZone = (zone) => {
    console.log('focusZone called for zone:', zone.name);
    
    // For polygon zones, use centroid; for circle zones, use center coordinates
    let lat, lng;
    const polygonData = zone.polygonCoordinatesJson || zone.polygonCoordinates;
    
    if (polygonData) {
      const centroid = calculatePolygonCentroid(polygonData);
      if (centroid) {
        lat = centroid.lat;
        lng = centroid.lng;
      } else {
        lat = Number(zone.centerLatitude || zone.latitude);
        lng = Number(zone.centerLongitude || zone.longitude);
      }
    } else {
      lat = Number(zone.centerLatitude || zone.latitude);
      lng = Number(zone.centerLongitude || zone.longitude);
    }
    
    const zoom = getZoomForRadius(zone.radiusMeters);
    console.log('Zone coordinates:', lat, lng, 'zoom:', zoom);
    setSelectedZoneId(zone.id);
    setSelectedZone(zone);
    setShowZonePopup(true);
    setZoneAddress(null);
    fetchZoneVendors(zone.id);
    fetchZoneAddress(lat, lng);
    
    // Use mapRef directly to pan and zoom
    if (mapRef.current) {
      console.log('Map ref available, panning to:', lat, lng);
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(zoom);
    } else {
      console.log('Map ref not available, updating state');
      // Fallback: update state if map ref not available
      setMapCenter({ lat, lng });
      setMapZoom(zoom);
    }
  };

  const fetchZoneVendors = async (zoneId) => {
    setLoadingVendors(true);
    try {
      const response = await axios.get(`/api/vendors/zone/${zoneId}`);
      setZoneVendors(response.data || []);
    } catch (err) {
      console.error("Failed to fetch zone vendors", err);
      setZoneVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchZoneAddress = async (lat, lng) => {
    setLoadingAddress(true);
    try {
      // First try to get the address
      const addressResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
      );
      const addressData = await addressResponse.json();
      console.log('Geocoding response:', addressData);
      
      let address = '';
      if (addressData && addressData.display_name) {
        if (addressData.address) {
          const parts = [];
          if (addressData.address.road) parts.push(addressData.address.road);
          if (addressData.address.building) parts.push(addressData.address.building);
          if (addressData.address.suburb) parts.push(addressData.address.suburb);
          if (addressData.address.city || addressData.address.town || addressData.address.village) parts.push(addressData.address.city || addressData.address.town || addressData.address.village);
          if (addressData.address.district) parts.push(addressData.address.district);
          if (addressData.address.state) parts.push(addressData.address.state);
          if (addressData.address.postcode) parts.push(addressData.address.postcode);
          if (addressData.address.country) parts.push(addressData.address.country);
          
          if (parts.length > 0) {
            address = parts.join(', ');
          } else {
            address = addressData.display_name;
          }
        } else {
          address = addressData.display_name;
        }
      }
      
      // Now search for nearby landmarks/shops using Overpass API
      const radius = 200; // 200 meters radius
      const overpassQuery = `
        [out:json];
        (
          node["shop"](around:${radius},${lat},${lng});
          node["amenity"](around:${radius},${lat},${lng});
          node["tourism"](around:${radius},${lat},${lng});
          node["landmark"](around:${radius},${lat},${lng});
          node["historic"](around:${radius},${lat},${lng});
          way["shop"](around:${radius},${lat},${lng});
          way["amenity"](around:${radius},${lat},${lng});
        );
        out tags center;
      `;
      
      const overpassResponse = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
      );
      const overpassData = await overpassResponse.json();
      console.log('Overpass response:', overpassData);
      
      // Extract nearby landmarks
      const landmarks = overpassData.elements
        .filter(el => el.tags && (el.tags.name || el.tags.shop || el.tags.amenity))
        .slice(0, 5) // Get top 5
        .map(el => {
          const name = el.tags.name || el.tags.shop || el.tags.amenity || 'Unknown';
          const type = el.tags.shop || el.tags.amenity || el.tags.tourism || 'POI';
          return `${name} (${type})`;
        });
      
      let finalAddress = address;
      if (landmarks.length > 0) {
        finalAddress += `\n\nNearby: ${landmarks.join(', ')}`;
      }
      
      setZoneAddress(finalAddress);
    } catch (err) {
      console.error("Failed to fetch address", err);
      setZoneAddress('Network error fetching address');
    } finally {
      setLoadingAddress(false);
    }
  };

  const calculatePolygonArea = (points) => {
    if (points.length < 3) return 0;
    
    // Calculate area using Shoelace formula
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].lat * points[j].lng;
      area -= points[j].lat * points[i].lng;
    }
    area = Math.abs(area) / 2;
    
    // Convert degrees to meters (approximate)
    // 1 degree of latitude ≈ 111,320 meters
    // 1 degree of longitude varies by latitude, but we'll use an average
    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const metersPerLatDegree = 111320;
    const metersPerLngDegree = 111320 * Math.cos(avgLat * Math.PI / 180);
    
    // Convert area from square degrees to square meters
    const areaInSqMeters = area * metersPerLatDegree * metersPerLngDegree;
    
    return areaInSqMeters;
  };

  const calculatePolygonDimensions = (points) => {
    if (points.length < 2) return { length: 0, breadth: 0 };
    
    // Find min/max lat and lng
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Convert to meters
    const avgLat = (minLat + maxLat) / 2;
    const metersPerLatDegree = 111320;
    const metersPerLngDegree = 111320 * Math.cos(avgLat * Math.PI / 180);
    
    const length = (maxLat - minLat) * metersPerLatDegree;
    const breadth = (maxLng - minLng) * metersPerLngDegree;
    
    return { length, breadth };
  };

  const generateRectanglePolygon = (centerLat, centerLng, lengthMeters, breadthMeters) => {
    // Convert meters to degrees
    const metersPerLatDegree = 111320;
    const metersPerLngDegree = 111320 * Math.cos(centerLat * Math.PI / 180);
    
    const halfLengthDeg = (lengthMeters / 2) / metersPerLatDegree;
    const halfBreadthDeg = (breadthMeters / 2) / metersPerLngDegree;
    
    // Generate 4 corners of rectangle
    const points = [
      { lat: centerLat + halfLengthDeg, lng: centerLng - halfBreadthDeg }, // Top-left
      { lat: centerLat + halfLengthDeg, lng: centerLng + halfBreadthDeg }, // Top-right
      { lat: centerLat - halfLengthDeg, lng: centerLng + halfBreadthDeg }, // Bottom-right
      { lat: centerLat - halfLengthDeg, lng: centerLng - halfBreadthDeg }, // Bottom-left
    ];
    
    return points;
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setMapCenter({ lat: latitude, lng: longitude });
        setMapZoom(18);
        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(18);
        }
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location. Please enable location services.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleMapClick = useCallback((e) => {
    if (isDrawing && drawingMode === 'polygon') {
      const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPolygonPoints(prev => [...prev, newPoint]);
    } else if (isAdding && (drawingMode === 'circle' || drawingMode === 'rectangle')) {
      setNewZone(prev => ({
        ...prev,
        latitude: e.latLng.lat(),
        longitude: e.latLng.lng()
      }));
    }
  }, [isDrawing, drawingMode, isAdding]);

  const handleSaveZone = async () => {
    if (!newZone.name) {
      alert("Please enter a zone name");
      return;
    }
    if (drawingMode === 'polygon' && polygonPoints.length < 3) {
      alert("Please draw at least 3 points for a polygon zone");
      return;
    }
    if (drawingMode === 'rectangle' && (!newZone.rectLength || !newZone.rectBreadth)) {
      alert("Please enter length and breadth for rectangle zone");
      return;
    }
    try {
      // Auto-calculate dimensions for polygon zones
      let lengthMeters = newZone.lengthMeters;
      let breadthMeters = newZone.breadthMeters;
      let totalSizeSqMeters = newZone.totalSizeSqMeters;
      let finalPolygonPoints = polygonPoints;

      if (drawingMode === 'polygon' && polygonPoints.length >= 3) {
        const dimensions = calculatePolygonDimensions(polygonPoints);
        const area = calculatePolygonArea(polygonPoints);
        lengthMeters = dimensions.length.toFixed(2);
        breadthMeters = dimensions.breadth.toFixed(2);
        totalSizeSqMeters = area.toFixed(2);
      } else if (drawingMode === 'circle') {
        // For circle zones, calculate from radius
        const radius = newZone.radiusMeters;
        lengthMeters = (radius * 2).toFixed(2);
        breadthMeters = (radius * 2).toFixed(2);
        totalSizeSqMeters = (Math.PI * radius * radius).toFixed(2);
      } else if (drawingMode === 'rectangle') {
        // For rectangle zones, use entered dimensions
        lengthMeters = newZone.rectLength;
        breadthMeters = newZone.rectBreadth;
        totalSizeSqMeters = (newZone.rectLength * newZone.rectBreadth).toFixed(2);
        // Generate rectangle polygon from center point
        finalPolygonPoints = generateRectanglePolygon(
          newZone.latitude,
          newZone.longitude,
          newZone.rectLength,
          newZone.rectBreadth
        );
      }

      // Send fields matching backend validation requirements
      const zoneToSave = {
        name: newZone.name,
        zoneType: newZone.zoneType,
        centerLatitude: newZone.latitude,
        centerLongitude: newZone.longitude,
        radiusMeters: drawingMode === 'circle' ? newZone.radiusMeters : null,
        monthlyRent: newZone.monthlyRent,
        lengthMeters: parseFloat(lengthMeters) || null,
        breadthMeters: parseFloat(breadthMeters) || null,
        totalSizeSqMeters: parseFloat(totalSizeSqMeters) || null,
        active: newZone.isActive,
        // Send polygon coordinates to the correct backend field
        ...(drawingMode === 'polygon' && polygonPoints.length >= 3 && {
          polygonCoordinates: JSON.stringify(polygonPoints)
        }),
        ...(drawingMode === 'rectangle' && {
          polygonCoordinates: JSON.stringify(finalPolygonPoints)
        })
      };
      console.log('Sending zone data:', zoneToSave);
      await axios.post('/api/zones', zoneToSave);
      alert("Zone created successfully!");
      setIsAdding(false);
      setIsDrawing(false);
      setPolygonPoints([]);
      setNewZone({
        name: '',
        zoneType: 'ALLOWED',
        latitude: 17.6599,
        longitude: 75.9064,
        radiusMeters: 100,
        monthlyRent: 500,
        lengthMeters: 0,
        breadthMeters: 0,
        totalSizeSqMeters: 0,
        polygonCoordinates: null,
        isActive: true,
        isAvailable: true,
        rectLength: 10,
        rectBreadth: 10
      });
      fetchZones();
    } catch (err) {
      console.error("Failed to save zone", err);
      console.error("Error response:", err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      alert(`Failed to save zone: ${errorMessage}`);
    }
  };

  const handleDeleteZone = async (id) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    try {
      await axios.delete(`/api/zones/${id}`);
      alert("Zone deleted successfully");
      fetchZones();
      setShowZonePopup(false);
    } catch (err) {
      console.error("Failed to delete zone", err);
      alert("Failed to delete zone");
    }
  };

  const handleUpdateZoneRent = async () => {
    if (!selectedZone || !selectedZone.id) {
      console.error('No zone selected or zone ID is missing:', selectedZone);
      alert("Please select a zone first");
      return;
    }
    try {
      console.log('Updating zone rent for zone ID:', selectedZone.id);
      console.log('Selected zone data:', selectedZone);
      console.log('New rent value:', editZoneData.monthlyRent);
      const payload = {
        name: selectedZone.name,
        zoneType: selectedZone.zoneType,
        centerLatitude: selectedZone.centerLatitude || selectedZone.latitude,
        centerLongitude: selectedZone.centerLongitude || selectedZone.longitude,
        radiusMeters: selectedZone.radiusMeters,
        monthlyRent: editZoneData.monthlyRent,
        active: selectedZone.isActive,
        polygonCoordinates: selectedZone.polygonCoordinates
      };
      console.log('Payload:', payload);
      const response = await axios.put(`/api/zones/${selectedZone.id}`, payload);
      console.log('Update response:', response.data);
      // EnhancedZoneController returns wrapped response: {success: true, data: {...}}
      const updatedZone = response.data?.data || response.data;
      console.log('Updated zone data:', updatedZone);
      console.log('Response monthlyRent:', updatedZone?.monthlyRent);
      alert("Zone rent updated successfully!");
      setIsEditingZone(false);
      // Directly update selectedZone with the response data
      setSelectedZone(updatedZone);
      // Also refresh zones list
      fetchZones();
    } catch (err) {
      console.error("Failed to update zone rent", err);
      console.error("Error response:", err.response?.data);
      alert(`Failed to update zone rent: ${err.response?.data?.message || err.message}`);
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
            onClick={() => {
              setIsAdding(true);
              setIsDrawing(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={20} /> Create New Zone
          </button>
        ) : (
          <button
            onClick={() => {
              setIsAdding(false);
              setIsDrawing(false);
              setPolygonPoints([]);
            }}
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
              mapTypeId={mapType === 'satellite' ? 'satellite' : 'roadmap'}
              options={{
                mapTypeId: mapType === 'satellite' ? 'satellite' : 'roadmap',
                mapTypeControl: true,
                mapTypeControlOptions: {
                  mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
                }
              }}
            >
              {Array.isArray(zones) && zones.map((zone, index) => {
                const polygonData = zone.polygonCoordinatesJson || zone.polygonCoordinates;
                const colors = getZoneColor(zone, index);
                return (
                  <React.Fragment key={zone.id}>
                    <Marker
                      position={{ lat: Number(zone.centerLatitude || zone.latitude), lng: Number(zone.centerLongitude || zone.longitude) }}
                      onClick={() => focusZone(zone)}
                    />
                    {polygonData ? (
                      <Polygon
                        paths={JSON.parse(polygonData)}
                        options={colors}
                        onClick={() => focusZone(zone)}
                      />
                    ) : (
                      <Circle
                        center={{ lat: Number(zone.centerLatitude || zone.latitude), lng: Number(zone.centerLongitude || zone.longitude) }}
                        radius={Number(zone.radiusMeters)}
                        options={colors}
                        onClick={() => focusZone(zone)}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {isDrawing && drawingMode === 'polygon' && polygonPoints.length > 0 && (
                <Polygon
                  paths={polygonPoints}
                  options={{
                    fillColor: newZone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                    fillOpacity: 0.4,
                    strokeColor: newZone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                    strokeWeight: 3,
                  }}
                />
              )}

              {isAdding && drawingMode === 'circle' && (
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
                    }}
                  />
                </>
              )}

              {isAdding && drawingMode === 'rectangle' && newZone.rectLength > 0 && newZone.rectBreadth > 0 && (
                <>
                  <Marker position={{ lat: newZone.latitude, lng: newZone.longitude }} draggable={true} onDragEnd={(e) => {
                    setNewZone(prev => ({ ...prev, latitude: e.latLng.lat(), longitude: e.latLng.lng() }));
                  }} />
                  <Polygon
                    paths={generateRectanglePolygon(newZone.latitude, newZone.longitude, newZone.rectLength, newZone.rectBreadth)}
                    options={{
                      fillColor: newZone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                      fillOpacity: 0.4,
                      strokeColor: newZone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                      strokeWeight: 4,
                    }}
                  />
                </>
              )}

              {userLocation && (
                <Marker
                  position={{ lat: userLocation.lat, lng: userLocation.lng }}
                />
              )}
            </GoogleMap>
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded shadow text-xs font-bold flex gap-4">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full opacity-50"></div> Allowed Zone</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full opacity-50"></div> Restricted Zone</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-full opacity-50"></div> Available</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-500 rounded-full opacity-50"></div> Allocated</div>
            </div>
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded shadow flex gap-2">
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="text-xs font-bold px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                {locationLoading ? '📍 Locating...' : '📍 My Location'}
              </button>
              <button
                onClick={() => setMapType(mapType === 'satellite' ? 'roadmap' : 'satellite')}
                className="text-xs font-bold px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {mapType === 'satellite' ? '🛰️ Satellite' : '🗺️ Roadmap'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md border p-4">
            <div className="text-xs text-gray-500">
              Zones loaded: {zones.length} | Loading: {loading ? 'Yes' : 'No'}
            </div>
          </div>
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
                  <label className="text-xs font-bold text-gray-500 uppercase">Drawing Mode</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawingMode('polygon');
                        setIsDrawing(true);
                        setPolygonPoints([]);
                      }}
                      className={`flex-1 px-3 py-2 rounded font-bold text-sm transition ${drawingMode === 'polygon' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <Edit3 size={14} className="inline mr-1" /> Polygon
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawingMode('circle');
                        setIsDrawing(false);
                      }}
                      className={`flex-1 px-3 py-2 rounded font-bold text-sm transition ${drawingMode === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <MapPin size={14} className="inline mr-1" /> Circle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawingMode('rectangle');
                        setIsDrawing(false);
                      }}
                      className={`flex-1 px-3 py-2 rounded font-bold text-sm transition ${drawingMode === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <MapPin size={14} className="inline mr-1" /> Rectangle
                    </button>
                  </div>
                </div>
                {drawingMode === 'polygon' && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-700 font-semibold mb-2">
                      {isDrawing ? 'Click on map to add points. Click "Finish Drawing" when done.' : 'Click "Start Drawing" to begin'}
                    </p>
                    <p className="text-xs text-gray-600">Points added: {polygonPoints.length}</p>
                    {polygonPoints.length >= 3 && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="text-xs font-bold text-purple-700 mb-1">Calculated Zone Size:</p>
                        <div className="grid grid-cols-3 gap-1 text-xs">
                          <div>
                            <p className="text-gray-500">Length</p>
                            <p className="font-bold">{calculatePolygonDimensions(polygonPoints).length.toFixed(2)} m</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Breadth</p>
                            <p className="font-bold">{calculatePolygonDimensions(polygonPoints).breadth.toFixed(2)} m</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Area</p>
                            <p className="font-bold">{calculatePolygonArea(polygonPoints).toFixed(2)} m²</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {polygonPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDrawing(false);
                        }}
                        className="mt-2 w-full bg-green-600 text-white py-2 rounded font-bold text-sm hover:bg-green-700"
                      >
                        Finish Drawing ({polygonPoints.length} points)
                      </button>
                    )}
                    {polygonPoints.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPolygonPoints([])}
                        className="mt-2 w-full bg-red-100 text-red-600 py-2 rounded font-bold text-sm hover:bg-red-200"
                      >
                        Clear Points
                      </button>
                    )}
                  </div>
                )}
                {drawingMode === 'circle' && (
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
                )}
                {drawingMode === 'rectangle' && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 font-semibold mb-2">
                      Click on map to set center point, then enter dimensions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Length (m)</label>
                        <input
                          type="number"
                          min="1"
                          step="0.1"
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          placeholder="e.g. 20"
                          value={newZone.rectLength}
                          onChange={e => setNewZone({...newZone, rectLength: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Breadth (m)</label>
                        <input
                          type="number"
                          min="1"
                          step="0.1"
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          placeholder="e.g. 10"
                          value={newZone.rectBreadth}
                          onChange={e => setNewZone({...newZone, rectBreadth: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    {newZone.rectLength > 0 && newZone.rectBreadth > 0 && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="text-xs font-bold text-purple-700 mb-1">Calculated Size:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div>
                            <p className="text-gray-500">Area</p>
                            <p className="font-bold">{(newZone.rectLength * newZone.rectBreadth).toFixed(2)} m²</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Perimeter</p>
                            <p className="font-bold">{(2 * (newZone.rectLength + newZone.rectBreadth)).toFixed(2)} m</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    className="w-full mt-1 px-3 py-2 border rounded outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g. 500"
                    value={newZone.monthlyRent}
                    onChange={e => setNewZone({...newZone, monthlyRent: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                {/* Zone Size Preview - Auto-calculated */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <p className="text-xs font-bold text-purple-700 mb-2">Zone Size (Auto-calculated)</p>
                  {drawingMode === 'polygon' && polygonPoints.length >= 3 ? (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Length</p>
                        <p className="font-bold text-purple-600">{calculatePolygonDimensions(polygonPoints).length.toFixed(2)} m</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Breadth</p>
                        <p className="font-bold text-purple-600">{calculatePolygonDimensions(polygonPoints).breadth.toFixed(2)} m</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Total</p>
                        <p className="font-bold text-purple-600">{calculatePolygonArea(polygonPoints).toFixed(2)} m²</p>
                      </div>
                    </div>
                  ) : drawingMode === 'circle' ? (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Length</p>
                        <p className="font-bold text-purple-600">{(newZone.radiusMeters * 2).toFixed(2)} m</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Breadth</p>
                        <p className="font-bold text-purple-600">{(newZone.radiusMeters * 2).toFixed(2)} m</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Total</p>
                        <p className="font-bold text-purple-600">{(Math.PI * newZone.radiusMeters * newZone.radiusMeters).toFixed(2)} m²</p>
                      </div>
                    </div>
                  ) : drawingMode === 'rectangle' && newZone.rectLength > 0 && newZone.rectBreadth > 0 ? (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Length</p>
                        <p className="font-bold text-purple-600">{newZone.rectLength.toFixed(2)} m</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Breadth</p>
                        <p className="font-bold text-purple-600">{newZone.rectBreadth.toFixed(2)} m</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-500">Total</p>
                        <p className="font-bold text-purple-600">{(newZone.rectLength * newZone.rectBreadth).toFixed(2)} m²</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Draw zone to see calculated size</p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Availability</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded outline-none focus:ring-2 focus:ring-blue-600"
                    value={newZone.isAvailable ? 'true' : 'false'}
                    onChange={e => setNewZone({...newZone, isAvailable: e.target.value === 'true'})}
                  >
                    <option value="true">Available for Registration</option>
                    <option value="false">Already Allocated</option>
                  </select>
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
                {!Array.isArray(zones) || zones.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 text-sm">No zones defined yet.</p>
                ) : (
                  zones.map(zone => (
                    <div
                      key={zone.id}
                      className={`p-3 rounded-lg border hover:bg-gray-50 transition group cursor-pointer ${selectedZoneId === zone.id ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div onClick={() => focusZone(zone)}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${zone.zoneType === 'ALLOWED' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <p className="font-bold text-gray-800 text-sm">{zone.name}</p>
                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              zone.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {zone.isAvailable ? 'Available' : 'Full'}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {zone.polygonCoordinates ? 'Polygon' : `Radius: ${zone.radiusMeters}m`} | Type: {zone.zoneType} | Rent: ₹{zone.monthlyRent || 0}/mo
                          </p>
                          <p className="text-[10px] mt-1 text-gray-500">
                            Size: {zone.totalSizeSqMeters ? `${zone.totalSizeSqMeters}m²` : (zone.lengthMeters && zone.breadthMeters ? `${zone.lengthMeters}×${zone.breadthMeters}m` : 'N/A')}
                          </p>
                          <p className="text-[10px] mt-1 text-gray-500">
                            Vendors: {zone.currentVendorCount || 0} / {zone.maxVendors || '∞'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteZone(zone.id);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition opacity-0 group-hover:opacity-100"
                          title="Delete Zone"
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
          
          {/* Zone Details Popup */}
          {showZonePopup && selectedZone && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b sticky top-0 bg-white z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedZone.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedZone.zoneType === 'ALLOWED' ? '✓ Allowed Zone' : '✗ Restricted Zone'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowZonePopup(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Zone Location Details */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <MapPin size={18} className="text-blue-600" /> Location Details
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs text-gray-500 mb-1">Zone Name</p>
                        <p className="text-sm font-bold text-blue-800">{selectedZone.name}</p>
                      </div>
                      {loadingAddress ? (
                        <p className="text-sm text-gray-500">Loading address...</p>
                      ) : zoneAddress ? (
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-sm text-gray-500 mb-1">Full Address</p>
                          <p className="text-sm font-semibold text-gray-800 whitespace-pre-line">{zoneAddress}</p>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Latitude:</span>
                          <p className="font-mono font-bold">{(selectedZone.centerLatitude || selectedZone.latitude)?.toFixed(7)}°</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Longitude:</span>
                          <p className="font-mono font-bold">{(selectedZone.centerLongitude || selectedZone.longitude)?.toFixed(7)}°</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <p className="font-bold">{selectedZone.polygonCoordinates ? 'Polygon' : 'Circle'}</p>
                        </div>
                        {selectedZone.radiusMeters && (
                          <div>
                            <span className="text-gray-500">Radius:</span>
                            <p className="font-bold">{selectedZone.radiusMeters}m</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Zone Information */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-700 mb-3">Zone Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <p className="font-bold">{selectedZone.zoneCategory || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Max Vendors:</span>
                        <p className="font-bold">{selectedZone.maxVendors || 'Unlimited'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Monthly Rent:</span>
                        {isEditingZone ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              value={editZoneData.monthlyRent}
                              onChange={(e) => setEditZoneData({ ...editZoneData, monthlyRent: parseInt(e.target.value) || 0 })}
                              className="w-24 px-2 py-1 border rounded text-sm"
                            />
                            <button
                              onClick={handleUpdateZoneRent}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingZone(false)}
                              className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs font-bold hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-blue-600">₹{selectedZone.monthlyRent || 0}</p>
                            <button
                              onClick={() => {
                                setIsEditingZone(true);
                                setEditZoneData({ monthlyRent: selectedZone.monthlyRent || 0 });
                              }}
                              className="text-blue-500 hover:text-blue-700"
                              title="Edit rent"
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <p className={`font-bold ${selectedZone.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedZone.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Availability:</span>
                        <p className={`font-bold ${selectedZone.isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                          {selectedZone.isAvailable ? 'Available' : 'Allocated'}
                        </p>
                      </div>
                    </div>
                    {selectedZone.timeRestrictions && (
                      <div className="mt-3">
                        <span className="text-gray-500 text-sm">Time Restrictions:</span>
                        <p className="text-sm">{selectedZone.timeRestrictions}</p>
                      </div>
                    )}
                  </div>

                  {/* Zone Size Details */}
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <MapPin size={18} className="text-purple-600" /> Zone Size Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white rounded-lg p-3 border">
                        <p className="text-xs text-gray-500 mb-1">Length</p>
                        <p className="text-lg font-bold text-purple-700">
                          {selectedZone.lengthMeters ? `${selectedZone.lengthMeters} m` : 
                           selectedZone.radiusMeters ? `${(selectedZone.radiusMeters * 2).toFixed(2)} m` :
                           selectedZone.polygonCoordinates ? `${calculatePolygonDimensions(JSON.parse(selectedZone.polygonCoordinates)).length.toFixed(2)} m` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <p className="text-xs text-gray-500 mb-1">Breadth</p>
                        <p className="text-lg font-bold text-purple-700">
                          {selectedZone.breadthMeters ? `${selectedZone.breadthMeters} m` :
                           selectedZone.radiusMeters ? `${(selectedZone.radiusMeters * 2).toFixed(2)} m` :
                           selectedZone.polygonCoordinates ? `${calculatePolygonDimensions(JSON.parse(selectedZone.polygonCoordinates)).breadth.toFixed(2)} m` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <p className="text-xs text-gray-500 mb-1">Total Size</p>
                        <p className="text-lg font-bold text-purple-700">
                          {selectedZone.totalSizeSqMeters ? `${selectedZone.totalSizeSqMeters} m²` :
                           selectedZone.radiusMeters ? `${(Math.PI * selectedZone.radiusMeters * selectedZone.radiusMeters).toFixed(2)} m²` :
                           selectedZone.polygonCoordinates ? `${calculatePolygonArea(JSON.parse(selectedZone.polygonCoordinates)).toFixed(2)} m²` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {(!selectedZone.lengthMeters || !selectedZone.breadthMeters || !selectedZone.totalSizeSqMeters) && (
                      <div className="mt-3 text-xs text-gray-500 italic">
                        * Size calculated from {selectedZone.radiusMeters ? 'radius' : selectedZone.polygonCoordinates ? 'polygon coordinates' : 'zone data'}
                      </div>
                    )}
                  </div>

                  {/* Manager Contact */}
                  {(selectedZone.managerEmail || selectedZone.managerPhone) && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-700 mb-3">Manager Contact</h3>
                      <div className="text-sm space-y-2">
                        {selectedZone.managerEmail && (
                          <div>
                            <span className="text-gray-500">Email:</span>
                            <p className="font-bold">{selectedZone.managerEmail}</p>
                          </div>
                        )}
                        {selectedZone.managerPhone && (
                          <div>
                            <span className="text-gray-500">Phone:</span>
                            <p className="font-bold">{selectedZone.managerPhone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Allocated Vendors */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle size={18} className="text-blue-600" /> Allocated Vendors
                    </h3>
                    {loadingVendors ? (
                      <p className="text-sm text-gray-500">Loading vendors...</p>
                    ) : zoneVendors.length === 0 ? (
                      <p className="text-sm text-gray-500">No vendors allocated to this zone.</p>
                    ) : (
                      <div className="space-y-3">
                        {zoneVendors.map(vendor => (
                          <div key={vendor.id} className="bg-white rounded-lg p-3 border">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-gray-800">{vendor.name}</p>
                                <p className="text-xs text-gray-500">{vendor.category}</p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                vendor.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {vendor.status}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              <p>📞 {vendor.phone}</p>
                              <p>📍 {vendor.latitude?.toFixed(6)}, {vendor.longitude?.toFixed(6)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
