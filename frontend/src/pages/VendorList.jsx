import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Check, X, Search, MoreVertical, QrCode as QrIcon, Download, ExternalLink, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VendorList = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/vendors');
      // Handle wrapped response structure
      const vendorsData = response.data?.data || response.data;
      if (Array.isArray(vendorsData)) {
        setVendors(vendorsData);
      } else {
        console.error("Expected array but got:", vendorsData);
        setVendors([]);
      }
    } catch (err) {
      console.error("Failed to fetch vendors", err);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      // Backend uses PUT /api/vendors/{id}/approve and PUT /api/vendors/{id}/reject
      const endpoint = `http://localhost:8080/api/vendors/${id}/${action}`;
      await axios.put(endpoint);
      fetchVendors();
    } catch (err) {
      console.error(`Failed to ${action} vendor:`, err);
      const message = err.response?.data?.message || "Failed to update status";
      alert(message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this vendor? This action cannot be undone.")) {
      try {
        await axios.delete(`/api/vendors/${id}`);
        fetchVendors();
      } catch (err) {
        console.error("Failed to delete vendor", err);
        const message = err.response?.data?.message || "Failed to delete vendor";
        alert(message);
      }
    }
  };

  const filteredVendors = Array.isArray(vendors) ? vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.vendorId.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Street Vendors</h1>
          <p className="text-gray-500 text-sm">Manage and monitor all registered vendors in Solapur</p>
        </div>
        {user.role === 'ADMIN' && (
          <Link to="/vendors/add" className="bg-smc-blue text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-800 transition shadow-md w-full sm:w-auto">
            <Plus size={18} /> Register Vendor
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Search size={18} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or Vendor ID..." 
            className="bg-transparent border-none outline-none text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">Vendor Info</th>
                <th className="px-6 py-3 font-semibold">Category</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Monthly Rent</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8">Loading vendors...</td></tr>
              ) : filteredVendors.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8">No vendors found</td></tr>
              ) : (
                filteredVendors.map(vendor => (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => vendor.qrCodeUrl && setSelectedVendor(vendor)}
                          className={`h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden border ${vendor.qrCodeUrl ? 'cursor-pointer border-blue-200 bg-white' : 'bg-blue-100 text-smc-blue font-bold'}`}
                        >
                          {vendor.qrCodeUrl ? (
                            <img src={vendor.qrCodeUrl} alt="QR" className="w-full h-full object-cover" />
                          ) : (
                            vendor.status === 'APPROVED' ? 'QR' : vendor.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{vendor.name}</p>
                          <p className="text-xs text-gray-500">{vendor.vendorId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase">
                        {vendor.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        vendor.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        vendor.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-gray-700">₹{vendor.monthlyRent || 0}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase w-fit ${
                          vendor.isRentPaidCurrentMonth ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {vendor.isRentPaidCurrentMonth ? 'Paid (Apr)' : 'Unpaid (Apr)'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link 
                          to={`/vendors/${vendor.id}`}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </Link>
                        {user.role === 'ADMIN' && vendor.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleStatusChange(vendor.id, 'approve')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve">
                              <Check size={18} />
                            </button>
                            <button onClick={() => handleStatusChange(vendor.id, 'reject')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject">
                              <X size={18} />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => vendor.qrCodeUrl && setSelectedVendor(vendor)}
                          className={`p-1 rounded ${vendor.qrCodeUrl ? 'text-smc-blue hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title={vendor.qrCodeUrl ? "View QR Code" : vendor.status === 'APPROVED' ? "QR Code will be generated on approval" : "QR Code - Approve vendor to generate"}
                          disabled={!vendor.qrCodeUrl}
                        >
                          <QrIcon size={18} />
                        </button>
                        {user.role === 'ADMIN' && (
                          <button 
                            onClick={() => handleDelete(vendor.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Vendor"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <button className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading vendors...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-8">No vendors found</div>
          ) : (
            filteredVendors.map(vendor => (
              <div key={vendor.id} className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div 
                    onClick={() => vendor.qrCodeUrl && setSelectedVendor(vendor)}
                    className={`h-12 w-12 rounded-lg flex items-center justify-center overflow-hidden border flex-shrink-0 ${vendor.qrCodeUrl ? 'cursor-pointer border-blue-200 bg-white' : 'bg-blue-100 text-smc-blue font-bold'}`}
                  >
                    {vendor.qrCodeUrl ? (
                      <img src={vendor.qrCodeUrl} alt="QR" className="w-full h-full object-cover" />
                    ) : (
                      vendor.status === 'APPROVED' ? 'QR' : vendor.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{vendor.name}</p>
                    <p className="text-xs text-gray-500">{vendor.vendorId}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                    vendor.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    vendor.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {vendor.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full uppercase">
                    {vendor.category}
                  </span>
                  <span className="text-xs font-bold text-gray-700">
                    ₹{vendor.monthlyRent || 0}/month
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    vendor.isRentPaidCurrentMonth ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {vendor.isRentPaidCurrentMonth ? 'Paid' : 'Unpaid'}
                  </span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <Link 
                    to={`/vendors/${vendor.id}`}
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <Eye size={16} /> View
                  </Link>
                  {user.role === 'ADMIN' && vendor.status === 'PENDING' && (
                    <>
                      <button onClick={() => handleStatusChange(vendor.id, 'approve')} className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                        <Check size={16} /> Approve
                      </button>
                      <button onClick={() => handleStatusChange(vendor.id, 'reject')} className="flex-1 flex items-center justify-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
                        <X size={16} /> Reject
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => vendor.qrCodeUrl && setSelectedVendor(vendor)}
                    disabled={!vendor.qrCodeUrl}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${vendor.qrCodeUrl ? 'bg-smc-blue text-white hover:bg-blue-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    <QrIcon size={16} /> QR
                  </button>
                  {user.role === 'ADMIN' && (
                    <button 
                      onClick={() => handleDelete(vendor.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 text-center space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800">Vendor ID Card</h3>
                <button onClick={() => setSelectedVendor(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                <img 
                  src={selectedVendor.qrCodeUrl} 
                  alt="QR Code" 
                  className="w-48 h-48 sm:w-64 sm:h-64 object-contain shadow-sm"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300?text=QR+Not+Found';
                  }}
                />
                <div className="mt-4 text-center">
                  <p className="font-bold text-lg text-gray-800 uppercase tracking-tight">{selectedVendor.name}</p>
                  <p className="text-smc-blue font-mono text-sm font-bold">{selectedVendor.vendorId}</p>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{selectedVendor.category}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <a 
                  href={selectedVendor.qrCodeUrl} 
                  download={`${selectedVendor.vendorId}_QR.png`}
                  className="flex items-center justify-center gap-2 bg-smc-blue text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition shadow-md"
                >
                  <Download size={18} /> Download
                </a>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  <ExternalLink size={18} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorList;
