import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Receipt, CheckCircle, Clock, Filter, IndianRupee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ChallanList = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    try {
      const response = await axios.get('/api/challans');
      if (Array.isArray(response.data)) {
        setChallans(response.data);
      } else {
        console.error("Expected array but got:", response.data);
        setChallans([]);
      }
    } catch (err) {
      console.error("Failed to fetch challans", err);
      setChallans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await axios.put(`/api/challans/${id}/pay`);
      fetchChallans();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Challan Management</h1>
          <p className="text-gray-500 text-sm">Track and manage penalty payments from vendors</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border flex items-center gap-2 text-sm text-gray-600">
            <Filter size={16} /> Filter: All
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">Challan #</th>
                <th className="px-6 py-3 font-semibold">Vendor</th>
                <th className="px-6 py-3 font-semibold">Reason</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8">Loading challans...</td></tr>
              ) : challans.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8">No challans found</td></tr>
              ) : (
                challans.map(challan => (
                  <tr key={challan.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-smc-blue">
                      {challan.challanNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{challan.vendor.name}</p>
                        <p className="text-[10px] text-gray-400">{challan.vendor.vendorId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 truncate max-w-[150px]">{challan.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm font-bold text-gray-800">
                        <IndianRupee size={14} /> {challan.fineAmount}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                        challan.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {challan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      <p className="flex items-center gap-1"><Clock size={12} /> {new Date(challan.issuedAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      {challan.status === 'UNPAID' && user.role === 'ADMIN' ? (
                        <button 
                          onClick={() => handleMarkPaid(challan.id)}
                          className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition font-bold flex items-center gap-1"
                        >
                          <CheckCircle size={14} /> MARK PAID
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          {challan.status === 'PAID' ? <><CheckCircle size={14} className="text-green-500" /> COMPLETED</> : 'NO ACTIONS'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChallanList;
