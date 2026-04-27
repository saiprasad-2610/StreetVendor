import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, User, Calendar, IndianRupee, Search, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const RentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get('/api/payments/rent-payments');
      // Handle direct response structure (backend returns array directly)
      setPayments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch rent payments", err);
      // Set empty array on error to prevent blank page
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    p && (
      (filterMonth === '' || p.paymentMonth === parseInt(filterMonth)) &&
      (filterYear === '' || p.paymentYear === parseInt(filterYear)) &&
      (searchTerm === '' || 
        (p.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         p.vendor?.vendorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         `Vendor ${p.vendorId}`.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    )
  );

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = [2024, 2025, 2026];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Rent Payment Management</h1>
        <p className="text-gray-500 text-sm">Track monthly rent collections from vendors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by vendor name or ID..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            value={searchTerm}
            onChange={(e) => setSearchSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select 
            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <select 
            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Month/Year</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Paid Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-gray-500">No rent payments found for the selected filters.</td></tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.id || Math.random()} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {payment.vendor?.name?.charAt(0) || 'V'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{payment.vendor?.name || `Vendor ${payment.vendorId}`}</p>
                          <p className="text-[10px] text-gray-500">{payment.vendor?.vendorId || `ID: ${payment.vendorId}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {months.find(m => m.value === payment.paymentMonth)?.label || 'Unknown'} {payment.paymentYear || 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      ₹{payment.amount || '0'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {payment.razorpayPaymentId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {payment.paidAt ? format(new Date(payment.paidAt), 'dd MMM yyyy HH:mm') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-fit">
                        <CheckCircle size={12} /> Paid
                      </span>
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

export default RentManagement;
