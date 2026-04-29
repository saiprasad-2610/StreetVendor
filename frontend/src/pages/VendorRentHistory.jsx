import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Calendar, IndianRupee, Filter, CheckCircle, AlertCircle, FileText, Download, CreditCard as PayIcon } from 'lucide-react';
import { format } from 'date-fns';

const VendorRentHistory = () => {
  console.log('VendorRentHistory component rendering');
  const { user } = useAuth();
  console.log('User from auth:', user);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    paymentsThisYear: 0
  });

  useEffect(() => {
    console.log('useEffect triggered, user:', user);
    if (user) {
      fetchRentHistory();
    } else {
      console.log('No user, skipping fetch');
    }
  }, [user, filterMonth, filterYear]);

  const fetchRentHistory = async () => {
    setLoading(true);
    console.log('Fetching rent history...');
    console.log('User:', user);
    
    // Get vendorId - either from auth context (after new login) or fetch from profile
    let vendorId = user?.vendorId;
    
    if (!vendorId) {
      // Fallback: fetch vendor profile to get vendorId
      try {
        console.log('Fetching vendor profile to get vendorId...');
        const profileRes = await axios.get('/api/vendors/me');
        vendorId = profileRes.data?.vendorId;
        console.log('Got vendorId from profile:', vendorId);
      } catch (err) {
        console.error('Failed to fetch vendor profile', err);
      }
    }
    
    if (!vendorId) {
      setLoading(false);
      console.error('No vendorId found');
      alert('Vendor ID not found. Please logout and login again.');
      return;
    }
    
    try {
      const [historyRes, summaryRes] = await Promise.all([
        axios.get(`/api/rent-payments/history/${vendorId}`),
        axios.get(`/api/rent-payments/summary/${vendorId}`)
      ]);

      console.log('History API Response:', historyRes.data);
      console.log('Summary API Response:', summaryRes.data);

      // The new API returns all months from registration with paid/pending status
      const rentData = Array.isArray(historyRes.data) ? historyRes.data : [];
      const summary = summaryRes.data || {};

      console.log('Rent data:', rentData);
      setPayments(rentData);

      // Use summary data for stats
      setStats({
        totalPaid: summary.totalPaid || 0,
        totalPending: summary.totalPending || 0,
        paymentsThisYear: rentData.filter(p => p.isPaid && p.year === filterYear).length,
        currentMonthPaid: summary.currentMonthPaid || false,
        monthlyRent: summary.monthlyRent || 0,
        registrationDate: summary.registrationDate
      });
    } catch (err) {
      console.error("Failed to fetch rent history", err);
      console.error("Error details:", err.response?.data);
      console.error("Error status:", err.response?.status);
      setPayments([]);
      alert(`Failed to fetch rent history: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    p && (
      (filterMonth === '' || p.month === parseInt(filterMonth)) &&
      (filterYear === '' || p.year === parseInt(filterYear))
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

  const years = [2024, 2025, 2026, 2027];

  const handleDownloadReceipt = (payment) => {
    // Create a simple receipt download
    const receiptContent = `
RENT PAYMENT RECEIPT
=====================
Payment ID: ${payment.id || 'N/A'}
Vendor ID: ${user?.vendorId || 'N/A'}
Vendor Name: ${user?.name || 'N/A'}
Month: ${months.find(m => m.value === payment.paymentMonth)?.label || 'Unknown'}
Year: ${payment.paymentYear || 'N/A'}
Amount: ₹${payment.amount || 0}
Status: ${payment.status || 'N/A'}
Payment Date: ${payment.paymentDate ? format(new Date(payment.paymentDate), 'dd MMM yyyy HH:mm') : 'N/A'}
Transaction ID: ${payment.razorpayPaymentId || 'N/A'}
    `;
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent-receipt-${payment.paymentMonth}-${payment.paymentYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Rent History</h1>
        <p className="text-gray-500 text-sm">View all your monthly rent payment records</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs uppercase font-bold">Total Paid</p>
              <p className="text-3xl font-bold mt-1">₹{stats.totalPaid?.toLocaleString() || 0}</p>
            </div>
            <CheckCircle size={40} className="text-green-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs uppercase font-bold">Total Pending</p>
              <p className="text-3xl font-bold mt-1">₹{stats.totalPending?.toLocaleString() || 0}</p>
            </div>
            <AlertCircle size={40} className="text-orange-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs uppercase font-bold">Payments This Year</p>
              <p className="text-3xl font-bold mt-1">{stats.paymentsThisYear || 0}</p>
            </div>
            <Calendar size={40} className="text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs uppercase font-bold">Monthly Rent</p>
              <p className="text-3xl font-bold mt-1">₹{stats.monthlyRent || 500}</p>
            </div>
            <CreditCard size={40} className="text-purple-200" />
          </div>
        </div>
      </div>

      {/* Registration Info */}
      {stats.registrationDate && (
        <div className="bg-gray-100 border border-gray-200 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <span className="text-sm text-gray-600">
              Registered: <strong>{format(new Date(stats.registrationDate), 'dd MMM yyyy')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Current Status: 
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${stats.currentMonthPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {stats.currentMonthPaid ? 'This Month PAID' : 'This Month UNPAID'}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-600">Filter by:</span>
        </div>
        <div>
          <select 
            className="px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <select 
            className="px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            <h2 className="font-bold text-gray-800">Payment Records</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Month/Year</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Payment Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10">Loading payment history...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-gray-500">No payment records found for the selected filters.</td></tr>
              ) : (
                filteredPayments.map((payment, index) => (
                  <tr key={index} className={`hover:bg-gray-50 transition ${!payment.isPaid ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        {payment.monthName || months.find(m => m.value === payment.month)?.label || 'Unknown'} {payment.year || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      <div className="flex items-center gap-2">
                        <IndianRupee size={16} className="text-gray-400" />
                        {payment.amount || '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {payment.dueDate ? format(new Date(payment.dueDate), 'dd MMM yyyy') : '5th of next month'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {payment.paidDate ? format(new Date(payment.paidDate), 'dd MMM yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 w-fit ${
                        payment.isPaid
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : payment.status === 'OVERDUE'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      }`}>
                        {payment.isPaid && <CheckCircle size={12} />}
                        {!payment.isPaid && payment.status === 'OVERDUE' && <AlertCircle size={12} />}
                        {!payment.isPaid && payment.status !== 'OVERDUE' && <AlertCircle size={12} />}
                        {payment.status || (payment.isPaid ? 'PAID' : 'PENDING')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {payment.isPaid && (
                        <button
                          onClick={() => handleDownloadReceipt(payment)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1"
                        >
                          <Download size={12} />
                          Receipt
                        </button>
                      )}
                      {!payment.isPaid && (
                        <button
                          onClick={() => alert('Payment feature coming soon')}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition flex items-center gap-1"
                        >
                          <IndianRupee size={12} />
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <p className="font-bold text-blue-800 text-sm">Rent Payment Information</p>
            <p className="text-blue-700 text-xs mt-1">
              • Rent is calculated from your registration date<br/>
              • Due date: 5th of each month<br/>
              • Shows all months from registration to now<br/>
              • Green = Paid | Yellow = Pending | Red = Overdue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRentHistory;
