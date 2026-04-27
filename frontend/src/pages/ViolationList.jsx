import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Clock, MapPin, CheckCircle2, XCircle, Info, X, User, UserCheck, FileText, CameraOff, Map } from 'lucide-react';
import { GoogleMap, Marker, useJsApiLoader, Polyline, Circle, Polygon } from '@react-google-maps/api';

const ViolationList = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [zoneDetails, setZoneDetails] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [loadingZone, setLoadingZone] = useState(false);
  const [challans, setChallans] = useState([]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDummyKey'
  });

  useEffect(() => {
    fetchViolations();
    fetchChallans();
  }, []);

  const fetchViolations = async () => {
    try {
      const response = await axios.get('/api/violations');
      // Backend returns ApiResponse wrapper, need to access response.data.data
      const violationsData = response.data?.data || response.data;
      if (Array.isArray(violationsData)) {
        setViolations(violationsData);
      } else {
        console.error("Expected array but got:", response.data);
        setViolations([]);
      }
    } catch (err) {
      console.error("Failed to fetch violations", err);
      setViolations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChallans = async () => {
    try {
      const response = await axios.get('/api/challans');
      const challansData = response.data?.data || response.data;
      console.log("Fetched challans:", challansData);
      if (Array.isArray(challansData)) {
        setChallans(challansData);
      } else {
        console.log("Challans data is not an array:", challansData);
        setChallans([]);
      }
    } catch (err) {
      console.error("Failed to fetch challans", err);
      setChallans([]);
    }
  };

  const hasChallanForViolation = (violation) => {
    const violationLocation = `${violation.gpsLatitude}, ${violation.gpsLongitude}`;

    const hasChallan = challans.some(challan => {
      // Challan might have vendorId directly or nested in vendor object
      const challanVendorId = challan.vendorId || challan.vendor?.vendorId;
      const vendorMatch = challanVendorId === violation.vendor.vendorId;

      // Parse location coordinates for distance calculation
      const [challanLat, challanLng] = challan.location.split(',').map(Number);
      const distance = calculateDistance(violation.gpsLatitude, violation.gpsLongitude, challanLat, challanLng);
      const locationMatch = distance < 50; // Within 50 meters

      console.log(`Checking challan for violation ${violation.id}:`, {
        challanLocation: challan.location,
        violationLocation,
        distance,
        locationMatch,
        challanVendorId,
        violationVendorId: violation.vendor.vendorId,
        vendorMatch,
        totalChallans: challans.length
      });

      return vendorMatch && locationMatch;
    });

    console.log(`Violation ${violation.id} has challan: ${hasChallan}`);
    return hasChallan;
  };

  const handleIssueChallan = async (v) => {
    if (!window.confirm(`Issue a fine of ₹500 to ${v.vendor.name}?`)) return;

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.post('/api/challans', {
        vendorId: v.vendor.vendorId,
        fineAmount: 500,
        reason: v.description || "Violation of vending rules",
        location: `${v.gpsLatitude}, ${v.gpsLongitude}`,
        imageProofUrl: v.imageProofUrl
      }, {
        headers: {
          'X-User-ID': user?.id
        }
      });
      alert("Challan Issued Successfully");
      fetchViolations(); // Refresh list
      fetchChallans(); // Refresh challans
    } catch (err) {
      console.error("Failed to issue challan", err);
      alert("Failed to issue challan: " + (err.response?.data?.message || err.message));
    }
  };

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Return in meters
  };

  // Get authorized location - prioritize zone location over vendor location
  const getAuthorizedLocation = () => {
    // First priority: use zone location if available (this is the authorized zone)
    if (zoneDetails?.latitude && zoneDetails?.longitude) {
      console.log("Using zone location:", zoneDetails.latitude, zoneDetails.longitude);
      return { lat: Number(zoneDetails.latitude), lng: Number(zoneDetails.longitude) };
    }

    // Second priority: use vendor location if it's not the default center
    const defaultCenter = { lat: 17.6599, lng: 75.9064 };
    if (vendorDetails?.latitude && vendorDetails?.longitude) {
      const vendorLoc = { lat: vendorDetails.latitude, lng: vendorDetails.longitude };
      // Check if it's not the default center
      if (Math.abs(vendorLoc.lat - defaultCenter.lat) > 0.0001 ||
          Math.abs(vendorLoc.lng - defaultCenter.lng) > 0.0001) {
        console.log("Using vendor location:", vendorLoc);
        return vendorLoc;
      }
    }

    console.log("No valid authorized location found");
    return null;
  };

  // Find closest point on zone boundary to violation location
  const getClosestZonePoint = (violationLat, violationLng) => {
    if (!zoneDetails) {
      console.log("No zone details available");
      return null;
    }

    console.log("Zone details:", zoneDetails);

    // For polygon zone, find closest point on polygon boundary
    if (zoneDetails.polygonCoordinates) {
      try {
        const polygon = JSON.parse(zoneDetails.polygonCoordinates);
        console.log("Polygon coordinates:", polygon);
        let minDistance = Infinity;
        let closestPoint = null;

        polygon.forEach(point => {
          const distance = calculateDistance(violationLat, violationLng, point.lat, point.lng);
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = { lat: point.lat, lng: point.lng };
          }
        });

        console.log("Closest polygon point:", closestPoint, "Distance:", minDistance);
        return closestPoint;
      } catch (e) {
        console.error("Error parsing polygon coordinates:", e);
        return null;
      }
    }

    // For circle zone, find closest point on circle boundary
    if (zoneDetails.latitude && zoneDetails.longitude && zoneDetails.radiusMeters) {
      const centerLat = Number(zoneDetails.latitude);
      const centerLng = Number(zoneDetails.longitude);
      const radius = zoneDetails.radiusMeters;

      // Calculate direction from center to violation location
      const d = calculateDistance(centerLat, centerLng, violationLat, violationLng);
      const ratio = radius / d;

      // Find point on circle boundary
      const closestLat = centerLat + (violationLat - centerLat) * ratio;
      const closestLng = centerLng + (violationLng - centerLng) * ratio;

      console.log("Closest circle point:", { lat: closestLat, lng: closestLng }, "Distance:", d);
      return { lat: closestLat, lng: closestLng };
    }

    console.log("No polygon or circle zone found");
    return null;
  };

  const openDetails = async (v) => {
    setSelectedViolation(v);
    setShowDetailModal(true);
    setVendorDetails(null);
    setZoneDetails(null);
    setLoadingVendor(true);
    setLoadingZone(true);

    // Fetch vendor details to get authorized location
    try {
      console.log("Fetching vendor details for ID:", v.vendor.id);
      console.log("Violation vendor object:", v.vendor);
      const response = await axios.get(`/api/vendors/${v.vendor.id}`);
      const vendorData = response.data?.data || response.data;
      console.log("Vendor details received:", vendorData);
      console.log("Vendor location:", vendorData?.latitude, vendorData?.longitude);
      setVendorDetails(vendorData);

      // Fetch zone details if vendor has a zone
      if (vendorData?.zoneId) {
        try {
          const zoneResponse = await axios.get(`/api/zones`);
          const zones = zoneResponse.data?.data || zoneResponse.data || [];
          const zoneData = zones.find(z => z.id === vendorData.zoneId);
          console.log("Zone details received:", zoneData);
          setZoneDetails(zoneData);
        } catch (zoneErr) {
          console.error("Failed to fetch zone details:", zoneErr);
        }
      }
    } catch (err) {
      console.error("Failed to fetch vendor details:", err);
    } finally {
      setLoadingVendor(false);
      setLoadingZone(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Violations Log</h1>
          <p className="text-gray-500 text-sm">Review vending violations reported by officers and public</p>
        </div>
        <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <AlertTriangle size={18} /> {violations.length} Reports
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">Loading reports...</div>
        ) : violations.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed">
            No violations reported yet.
          </div>
        ) : (
          violations.map(violation => (
            <div key={violation.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition flex flex-col">
              <div className="h-48 bg-gray-200 relative group cursor-pointer" onClick={() => openDetails(violation)}>
                {violation.imageProofUrl ? (
                  <img src={violation.imageProofUrl} alt="Violation Proof" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image Proof
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">
                  Click for Details
                </div>
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                  violation.validationStatus === 'VALID' ? 'bg-red-500 text-white' : 
                  violation.validationStatus === 'INVALID' ? 'bg-gray-500 text-white' : 
                  'bg-yellow-500 text-white'
                }`}>
                  {violation.validationStatus} VIOLATION
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Vendor</p>
                    <p className="font-bold text-gray-800">{violation.vendor.name}</p>
                    <p className="text-xs text-gray-500">{violation.vendor.vendorId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Reported By</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {violation.reportedBy?.fullName || violation.reporterName || 'Anonymous Public'}
                    </p>
                    {violation.reportedBy && (
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                        violation.reportedBy.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        violation.reportedBy.role === 'OFFICER' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {violation.reportedBy.role}
                      </span>
                    )}
                    {violation.reporterPhone && (
                      <p className="text-[10px] text-gray-500">{violation.reporterPhone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={14} /> {new Date(violation.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin size={14} /> {violation.gpsLatitude.toFixed(6)}, {violation.gpsLongitude.toFixed(6)}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 italic line-clamp-2">
                  "{violation.description || 'No description provided'}"
                </div>

                <div className="pt-4 flex gap-3 mt-auto">
                  <button
                    onClick={() => openDetails(violation)}
                    className="flex-1 bg-smc-blue text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-800 transition flex items-center justify-center gap-2"
                  >
                    <Info size={16} /> Details
                  </button>
                  {violation.validationStatus === 'VALID' && !hasChallanForViolation(violation) && (
                    <button
                      onClick={() => handleIssueChallan(violation)}
                      className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-600 transition"
                    >
                      Issue Challan
                    </button>
                  )}
                  {hasChallanForViolation(violation) && (
                    <div className="flex-1 bg-green-100 text-green-700 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> Challan Issued
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedViolation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <AlertTriangle size={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Violation Evidence Details</h2>
                    <p className="text-sm text-blue-100 mt-1">ID: #{selectedViolation.id} • {new Date(selectedViolation.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X size={24} className="text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    selectedViolation.validationStatus === 'VALID' ? 'bg-red-100 text-red-700 border-2 border-red-300' :
                    selectedViolation.validationStatus === 'INVALID' ? 'bg-gray-100 text-gray-700 border-2 border-gray-300' :
                    'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                  }`}>
                    {selectedViolation.validationStatus} VIOLATION
                  </span>
                  {selectedViolation.violationType && (
                    <span className="px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-700 border-2 border-blue-300">
                      {selectedViolation.violationType}
                    </span>
                  )}
                </div>
                {selectedViolation.reportedBy && (
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedViolation.reportedBy.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      selectedViolation.reportedBy.role === 'OFFICER' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedViolation.reportedBy.role}
                    </span>
                  </div>
                )}
              </div>

              {/* Evidence Image */}
              <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg bg-white">
                {selectedViolation.imageProofUrl ? (
                  <img src={selectedViolation.imageProofUrl} alt="Full Evidence" className="w-full h-auto max-h-96 object-cover" />
                ) : (
                  <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center text-gray-400">
                    <CameraOff size={48} className="mb-2" />
                    <p className="italic">No photo evidence attached</p>
                  </div>
                )}
              </div>

              {/* Info Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Vendor Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User size={20} className="text-blue-600" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Vendor</p>
                  </div>
                  <p className="font-bold text-lg text-gray-900">{selectedViolation.vendor.name}</p>
                  <p className="text-sm text-blue-600 font-mono mt-1">{selectedViolation.vendor.vendorId}</p>
                </div>

                {/* Location Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <MapPin size={20} className="text-red-600" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Location</p>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {selectedViolation.gpsLatitude?.toFixed(6)}, {selectedViolation.gpsLongitude?.toFixed(6)}
                  </p>
                  {loadingVendor || loadingZone ? (
                    <p className="text-xs text-gray-500 mt-1">Loading zone info...</p>
                  ) : zoneDetails ? (() => {
                    const closestPoint = getClosestZonePoint(selectedViolation.gpsLatitude, selectedViolation.gpsLongitude);
                    if (closestPoint) {
                      const distance = calculateDistance(
                        selectedViolation.gpsLatitude,
                        selectedViolation.gpsLongitude,
                        closestPoint.lat,
                        closestPoint.lng
                      );
                      return (
                        <p className="text-xs font-bold text-red-600 mt-1">
                          {distance.toFixed(2)}m from zone
                        </p>
                      );
                    }
                    return <p className="text-xs text-gray-500 mt-1">Zone: {zoneDetails.name || 'N/A'}</p>;
                  })() : (
                    <p className="text-xs text-gray-500 mt-1">Zone info unavailable</p>
                  )}
                </div>

                {/* Reporter Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <UserCheck size={20} className="text-green-600" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Reported By</p>
                  </div>
                  <p className="font-bold text-gray-900">
                    {selectedViolation.reportedBy?.fullName || selectedViolation.reporterName || 'Anonymous'}
                  </p>
                  {selectedViolation.reporterPhone && (
                    <p className="text-sm text-gray-600 mt-1">{selectedViolation.reporterPhone}</p>
                  )}
                </div>
              </div>

              {/* Description Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText size={20} className="text-purple-600" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Violation Description</p>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {selectedViolation.description || 'No additional details provided.'}
                </p>
              </div>

              {/* Map Section */}
              {isLoaded && selectedViolation.gpsLatitude && selectedViolation.gpsLongitude && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Map size={20} className="text-orange-600" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Location Map</p>
                    </div>
                    {zoneDetails && (() => {
                      const closestPoint = getClosestZonePoint(selectedViolation.gpsLatitude, selectedViolation.gpsLongitude);
                      if (closestPoint) {
                        const distance = calculateDistance(
                          selectedViolation.gpsLatitude,
                          selectedViolation.gpsLongitude,
                          closestPoint.lat,
                          closestPoint.lng
                        );
                        return (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                            {distance.toFixed(2)}m from zone
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="h-80 rounded-xl overflow-hidden border-2 border-gray-200">
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{
                        lat: selectedViolation.gpsLatitude,
                        lng: selectedViolation.gpsLongitude
                      }}
                      zoom={16}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                      }}
                    >
                      {/* Zone Polygon/Circle */}
                      {zoneDetails?.polygonCoordinates ? (
                        <Polygon
                          paths={JSON.parse(zoneDetails.polygonCoordinates)}
                          options={{
                            fillColor: '#22c55e',
                            fillOpacity: 0.15,
                            strokeColor: '#22c55e',
                            strokeOpacity: 0.8,
                            strokeWeight: 2
                          }}
                        />
                      ) : zoneDetails?.latitude && zoneDetails?.longitude && zoneDetails?.radiusMeters ? (
                        <Circle
                          center={{
                            lat: Number(zoneDetails.latitude),
                            lng: Number(zoneDetails.longitude)
                          }}
                          radius={Number(zoneDetails.radiusMeters)}
                          options={{
                            fillColor: '#22c55e',
                            fillOpacity: 0.15,
                            strokeColor: '#22c55e',
                            strokeOpacity: 0.8,
                            strokeWeight: 2
                          }}
                        />
                      ) : null}

                      {/* Violation Marker */}
                      <Marker
                        position={{
                          lat: selectedViolation.gpsLatitude,
                          lng: selectedViolation.gpsLongitude
                        }}
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: new window.google.maps.Size(40, 40)
                        }}
                      />

                      {/* Polyline */}
                      {(() => {
                        const closestPoint = getClosestZonePoint(selectedViolation.gpsLatitude, selectedViolation.gpsLongitude);
                        return closestPoint ? (
                          <Polyline
                            path={[
                              { lat: selectedViolation.gpsLatitude, lng: selectedViolation.gpsLongitude },
                              { lat: closestPoint.lat, lng: closestPoint.lng }
                            ]}
                            options={{
                              strokeColor: '#ef4444',
                              strokeOpacity: 0.8,
                              strokeWeight: 3,
                              geodesic: true
                            }}
                          />
                        ) : null;
                      })()}
                    </GoogleMap>
                  </div>
                  <div className="flex gap-6 mt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
                      <span className="text-gray-600 font-medium">Violation Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
                      <span className="text-gray-600 font-medium">Authorized Zone</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t bg-white flex gap-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition flex items-center justify-center gap-2"
              >
                <X size={18} /> Close
              </button>
              {selectedViolation.validationStatus === 'VALID' && !hasChallanForViolation(selectedViolation) && (
                <button
                  onClick={() => {
                    handleIssueChallan(selectedViolation);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <AlertTriangle size={18} /> Issue ₹500 Fine
                </button>
              )}
              {hasChallanForViolation(selectedViolation) && (
                <div className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                  <CheckCircle2 size={18} /> Challan Already Issued
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationList;

