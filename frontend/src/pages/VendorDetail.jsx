import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, Polygon, useGoogleMap } from '@react-google-maps/api';
import { ArrowLeft, MapPin, Calendar, User, Phone, IndianRupee, FileText, QrCode as QrIcon, AlertCircle, CheckCircle, Clock, Download, Badge, CreditCard, Map, Building2, Mail, Shield } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '400px'
};

// Map controller component to handle auto-centering and zooming
const MapController = ({ vendor, zone }) => {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map || !vendor) return;

    let bounds = null;

    // If zone exists, fit bounds to include both vendor and zone
    if (zone) {
      bounds = new window.google.maps.LatLngBounds();

      // Add vendor location
      if (vendor.latitude && vendor.longitude) {
        bounds.extend({ lat: vendor.latitude, lng: vendor.longitude });
      }

      // Add zone boundaries
      if (zone.polygonCoordinates) {
        const polygon = JSON.parse(zone.polygonCoordinates);
        polygon.forEach(point => {
          bounds.extend({ lat: point.lat, lng: point.lng });
        });
      } else if (zone.latitude && zone.longitude && zone.radiusMeters) {
        // For circle zones, add center and a point on the circumference
        bounds.extend({ lat: Number(zone.latitude), lng: Number(zone.longitude) });
        // Add a point at the edge of the circle
        const edgeLat = Number(zone.latitude) + (zone.radiusMeters / 111320); // Approximate conversion
        bounds.extend({ lat: edgeLat, lng: Number(zone.longitude) });
      }

      // Fit map to bounds with padding
      map.fitBounds(bounds, { padding: 50 });
    } else {
      // If no zone, center on vendor
      if (vendor.latitude && vendor.longitude) {
        map.setCenter({ lat: vendor.latitude, lng: vendor.longitude });
        map.setZoom(16);
      }
    }
  }, [map, vendor, zone]);

  return null;
};

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rentHistory, setRentHistory] = useState([]);
  const [loadingRent, setLoadingRent] = useState(false);
  const [zone, setZone] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    fetchVendorDetails();
    fetchRentHistory();
  }, [id]);

  const fetchVendorDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/vendors/${id}`);
      setVendor(response.data);
      if (response.data.zoneId) {
        fetchZoneDetails(response.data.zoneId);
      }
    } catch (err) {
      console.error("Failed to fetch vendor details", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchZoneDetails = async (zoneId) => {
    try {
      const response = await axios.get(`/api/zones`);
      const zones = response.data?.data || response.data || [];
      const zoneData = zones.find(z => z.id === zoneId);
      setZone(zoneData);
    } catch (err) {
      console.error("Failed to fetch zone details", err);
    }
  };

  const fetchRentHistory = async () => {
    setLoadingRent(true);
    try {
      const response = await axios.get(`/api/payments/rent-payments/vendor/${id}`);
      // Handle wrapped response structure and ensure it's an array
      const rentData = response.data?.data || response.data || [];
      setRentHistory(Array.isArray(rentData) ? rentData : []);
    } catch (err) {
      console.error("Failed to fetch rent history", err);
      setRentHistory([]);
    } finally {
      setLoadingRent(false);
    }
  };

  const handleGoToZone = () => {
    if (!zone || !mapRef.current) return;

    const map = mapRef.current.state.map;

    if (zone.polygonCoordinates) {
      // For polygon zones, fit bounds to show entire polygon
      const bounds = new window.google.maps.LatLngBounds();
      const polygon = JSON.parse(zone.polygonCoordinates);
      polygon.forEach(point => {
        bounds.extend({ lat: point.lat, lng: point.lng });
      });
      map.fitBounds(bounds, { padding: 50 });
    } else if (zone.latitude && zone.longitude && zone.radiusMeters) {
      // For circle zones, center on zone center and set appropriate zoom
      map.setCenter({ lat: Number(zone.latitude), lng: Number(zone.longitude) });
      map.setZoom(15);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin text-blue-600 mx-auto mb-4">
          <Clock size={48} className="inline" />
        </div>
        <p className="text-gray-600">Loading vendor details...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Vendor not found</p>
        <Link to="/vendors" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Vendor List
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full transition"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Vendor Details</h1>
            <p className="text-blue-100 text-sm mt-1">ID: {vendor.vendorId}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
            vendor.status === 'APPROVED' ? 'bg-green-500 text-white border-green-400' :
            vendor.status === 'PENDING' ? 'bg-yellow-500 text-white border-yellow-400' :
            vendor.status === 'REJECTED' ? 'bg-red-500 text-white border-red-400' :
            'bg-gray-500 text-white border-gray-400'
          }`}>
            {vendor.status}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <IndianRupee size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Monthly Rent</p>
                <p className="text-2xl font-bold text-gray-900">₹{vendor.monthlyRent || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${vendor.isRentPaidCurrentMonth ? 'bg-green-100' : 'bg-red-100'}`}>
                <CreditCard size={24} className={vendor.isRentPaidCurrentMonth ? 'text-green-600' : 'text-red-600'} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Rent Status</p>
                <p className={`text-lg font-bold ${vendor.isRentPaidCurrentMonth ? 'text-green-600' : 'text-red-600'}`}>
                  {vendor.isRentPaidCurrentMonth ? 'Paid' : 'Pending'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertCircle size={24} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Pending Fine</p>
                <p className="text-2xl font-bold text-orange-600">₹{vendor.totalPendingFine || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Badge size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Category</p>
                <p className="text-lg font-bold text-gray-900">{vendor.category || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Information Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User size={20} className="text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Personal Information</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Full Name</p>
                    <p className="font-semibold text-gray-800">{vendor.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Phone size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Phone</p>
                    <p className="font-semibold text-gray-800">{vendor.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Shield size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Aadhaar</p>
                    <p className="font-semibold text-gray-800">{vendor.aadhaar || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Registration Date</p>
                    <p className="font-semibold text-gray-800">{vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Zone Information Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin size={20} className="text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Zone Information</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Building2 size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Zone Name</p>
                    <p className="font-semibold text-gray-800">{vendor.zoneName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Map size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Address</p>
                    <p className="font-semibold text-gray-800">{vendor.address || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Coordinates</p>
                    <p className="font-mono text-sm text-gray-800">{vendor.latitude?.toFixed(6)}, {vendor.longitude?.toFixed(6)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Card */}
            {vendor.qrCodeUrl && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <QrIcon size={20} className="text-purple-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">QR Code</h2>
                </div>
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <img
                      src={vendor.qrCodeUrl}
                      alt="Vendor QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                  <a
                    href={vendor.qrCodeUrl}
                    download={`vendor-${vendor.vendorId}-qr.png`}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2 text-sm"
                  >
                    <Download size={16} /> Download QR Code
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Map size={20} className="text-orange-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Location on Map</h2>
                </div>
                {zone && (
                  <button
                    onClick={handleGoToZone}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition flex items-center gap-2 text-sm shadow-md"
                  >
                    <MapPin size={16} /> Go to Zone
                  </button>
                )}
              </div>
              {isLoaded ? (
                <div className="h-96 rounded-2xl overflow-hidden border-2 border-gray-200">
                  <GoogleMap
                    ref={mapRef}
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: vendor.latitude || 17.6599, lng: vendor.longitude || 75.9064 }}
                    zoom={16}
                    options={{
                      mapTypeControl: true,
                      streetViewControl: false,
                      zoomControl: true,
                      fullscreenControl: false
                    }}
                  >
                    <MapController vendor={vendor} zone={zone} />
                    <Marker
                      position={{ lat: vendor.latitude, lng: vendor.longitude }}
                      icon={{
                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                        scaledSize: new window.google.maps.Size(40, 40)
                      }}
                    />
                    {zone && zone.polygonCoordinates ? (
                      <Polygon
                        paths={JSON.parse(zone.polygonCoordinates)}
                        options={{
                          fillColor: zone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                          fillOpacity: 0.4,
                          strokeColor: zone.zoneType === 'ALLOWED' ? '#16a34a' : '#dc2626',
                          strokeOpacity: 1,
                          strokeWeight: 4
                        }}
                      />
                    ) : zone && zone.radiusMeters ? (
                      <Circle
                        center={{ lat: Number(zone.latitude), lng: Number(zone.longitude) }}
                        radius={zone.radiusMeters}
                        options={{
                          fillColor: zone.zoneType === 'ALLOWED' ? '#22c55e' : '#ef4444',
                          fillOpacity: 0.3,
                          strokeColor: zone.zoneType === 'ALLOWED' ? '#16a34a' : '#dc2626',
                          strokeOpacity: 1,
                          strokeWeight: 4
                        }}
                      />
                    ) : null}
                  </GoogleMap>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gray-100 rounded-2xl">
                  <p className="text-gray-500">Loading map...</p>
                </div>
              )}
            </div>

            {/* Rent Payment History */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FileText size={20} className="text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Rent Payment History</h2>
              </div>
              {loadingRent ? (
                <p className="text-gray-500">Loading payment history...</p>
              ) : rentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={48} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No payment history available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Month</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Year</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(rentHistory) && rentHistory.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50 transition">
                          <td className="py-4 px-4 text-sm">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 px-4 text-sm">{payment.paymentMonth || 'N/A'}</td>
                          <td className="py-4 px-4 text-sm">{payment.paymentYear || 'N/A'}</td>
                          <td className="py-4 px-4 text-sm font-bold text-gray-800">₹{payment.amount || 0}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              payment.status === 'PAID' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'
                            }`}>
                              {payment.status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetail;
