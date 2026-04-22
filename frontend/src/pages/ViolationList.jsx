import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Clock, MapPin, CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ViolationList = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      const response = await axios.get('/api/violations');
      if (Array.isArray(response.data)) {
        setViolations(response.data);
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

  const handleIssueChallan = async (v) => {
    if (!window.confirm(`Issue a fine of ₹500 to ${v.vendor.name}?`)) return;
    
    try {
      await axios.post('/api/challans', {
        vendorId: v.vendor.vendorId,
        fineAmount: 500,
        reason: v.description || "Violation of vending rules",
        location: `${v.gpsLatitude}, ${v.gpsLongitude}`,
        imageProofUrl: v.imageProofUrl
      });
      alert("Challan Issued Successfully");
      fetchViolations(); // Refresh list
    } catch (err) {
      console.error("Failed to issue challan", err);
      alert("Failed to issue challan: " + (err.response?.data?.message || err.message));
    }
  };

  const openDetails = (v) => {
    setSelectedViolation(v);
    setShowDetailModal(true);
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
                  {violation.validationStatus === 'VALID' && (
                    <button 
                      onClick={() => handleIssueChallan(violation)}
                      className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-600 transition"
                    >
                      Issue Challan
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedViolation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800">Violation Evidence Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-200 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6">
              <div className="rounded-xl overflow-hidden border-2 border-gray-100 shadow-inner">
                {selectedViolation.imageProofUrl ? (
                  <img src={selectedViolation.imageProofUrl} alt="Full Evidence" className="w-full h-auto" />
                ) : (
                  <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400 italic">
                    No photo evidence attached
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Vendor Profile</p>
                    <p className="font-bold text-lg text-gray-900">{selectedViolation.vendor.name}</p>
                    <p className="text-sm text-blue-600 font-mono">{selectedViolation.vendor.vendorId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Location Coordinates</p>
                    <p className="text-sm font-medium flex items-center gap-1 text-gray-700">
                      <MapPin size={14} className="text-red-500" /> 
                      {selectedViolation.gpsLatitude}, {selectedViolation.gpsLongitude}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Reporting Info</p>
                    <p className="font-bold text-gray-900">
                      {selectedViolation.reportedBy?.fullName || selectedViolation.reporterName || 'Anonymous Public'}
                    </p>
                    {selectedViolation.reporterPhone && (
                      <p className="text-sm text-gray-600">Contact: {selectedViolation.reporterPhone}</p>
                    )}
                    <p className="text-sm text-gray-500">{new Date(selectedViolation.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Validation Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block mt-1 ${
                      selectedViolation.validationStatus === 'VALID' ? 'bg-red-100 text-red-700 border border-red-200' : 
                      selectedViolation.validationStatus === 'INVALID' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 
                      'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                      {selectedViolation.validationStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-800 uppercase mb-1">Violation Description</p>
                <p className="text-gray-700 leading-relaxed italic">
                  "{selectedViolation.description || 'No additional details provided.'}"
                </p>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-4">
              <button 
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-6 py-2.5 border-2 border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Close
              </button>
              {selectedViolation.validationStatus === 'VALID' && (
                <button 
                  onClick={() => {
                    handleIssueChallan(selectedViolation);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-lg"
                >
                  Confirm & Issue Fine
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationList;

