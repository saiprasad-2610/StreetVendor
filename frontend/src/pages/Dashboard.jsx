import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, Receipt, CheckCircle, TrendingUp, QrCode, MapPin, IndianRupee, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalVendors: 0,
    approvedVendors: 0,
    pendingVendors: 0,
    totalViolations: 0,
    totalChallans: 0,
    revenue: 0,
    myPendingChallans: 0,
    myTotalFines: 0
  });
  const [vendorInfo, setVendorInfo] = useState(null);
  const [payingRent, setPayingRent] = useState(false);

  const handlePayRent = async () => {
    if (!vendorInfo?.id) return;
    setPayingRent(true);
    try {
      const orderRes = await axios.post(`/api/payments/create-rent-order/${vendorInfo.id}`);
      const { orderId, amount, currency, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "SMC Street Vendor Rent",
        description: `Monthly Rent for ${vendorInfo.name}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            await axios.post('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              vendorId: vendorInfo.id,
              isRent: true
            });
            alert('Rent paid successfully!');
            // Refresh stats or status
          } catch (err) {
            alert('Payment verification failed');
          }
        },
        prefill: {
          name: vendorInfo.name,
          contact: vendorInfo.phone
        },
        theme: {
          color: "#1e40af"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert('Failed to initiate payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setPayingRent(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'ADMIN' || user?.role === 'OFFICER') {
          const [vendors, violations, challans] = await Promise.all([
            axios.get('/api/vendors'),
            axios.get('/api/violations'),
            axios.get('/api/challans')
          ]);

          const vData = Array.isArray(vendors.data) ? vendors.data : [];
          const violationData = Array.isArray(violations.data) ? violations.data : [];
          const challanData = Array.isArray(challans.data) ? challans.data : [];
          
          const paidChallans = challanData.filter(c => c.status === 'PAID');
          
          setStats({
            totalVendors: vData.length,
            approvedVendors: vData.filter(v => v.status === 'APPROVED').length,
            pendingVendors: vData.filter(v => v.status === 'PENDING').length,
            totalViolations: violationData.length,
            totalChallans: challanData.length,
            revenue: paidChallans.reduce((acc, c) => acc + c.fineAmount, 0)
          });
        } else if (user?.role === 'VENDOR') {
          const [challansRes, profileRes] = await Promise.all([
            axios.get('/api/challans/my'),
            axios.get('/api/vendors/me')
          ]);
          const myChallans = Array.isArray(challansRes.data) ? challansRes.data : [];
          setVendorInfo(profileRes.data);
          setStats(prev => ({
            ...prev,
            myPendingChallans: myChallans.filter(c => c.status === 'UNPAID').length,
            myTotalFines: myChallans.reduce((acc, c) => acc + c.fineAmount, 0)
          }));
        }
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      }
    };
    fetchStats();
  }, [user]);

  const StatCard = ({ title, value, icon: Icon, color, subValue }) => (
    <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-l-smc-blue">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold mt-1">{value}</h3>
          {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color} text-white`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  if (user?.role === 'VENDOR') {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Vendor Dashboard</h1>
            <p className="text-gray-500">Welcome back, {user.fullName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Pending Challans" 
            value={stats.myPendingChallans} 
            icon={AlertTriangle} 
            color="bg-red-500" 
            subValue="Immediate action required"
          />
          <StatCard 
            title="Monthly Rent" 
            value={`₹${vendorInfo?.monthlyRent || 0}`} 
            icon={IndianRupee} 
            color="bg-blue-600" 
            subValue="Fixed monthly charge"
          />
          <StatCard 
            title="Account Status" 
            value={vendorInfo?.status || 'PENDING'} 
            icon={CheckCircle} 
            color={vendorInfo?.status === 'APPROVED' ? 'bg-green-600' : 'bg-orange-500'} 
          />
        </div>

        <div className="bg-white p-8 rounded-xl shadow-md flex flex-col md:flex-row items-center gap-8 border border-blue-100">
          <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300">
            {vendorInfo?.qrCodeUrl ? (
              <img 
                src={`${vendorInfo.qrCodeUrl}`} 
                alt="Vending QR" 
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                <QrCode size={64} className="text-gray-300" />
                <p className="text-[10px] text-gray-400 mt-2">QR PENDING APPROVAL</p>
              </div>
            )}
            <p className="text-center text-xs text-gray-500 mt-2 font-bold uppercase">Your Vending QR</p>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold text-gray-800">Digital ID Card</h2>
              {vendorInfo?.status === 'APPROVED' && (
                <button 
                  onClick={handlePayRent}
                  disabled={payingRent || !vendorInfo?.monthlyRent || vendorInfo?.monthlyRent <= 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard size={18} />
                  {payingRent ? 'Processing...' : (!vendorInfo?.monthlyRent || vendorInfo?.monthlyRent <= 0 ? 'No Rent Due' : 'Pay Monthly Rent')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Users size={18} className="text-smc-blue" />
                <span className="text-sm font-medium">{vendorInfo?.name || user.fullName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={18} className="text-smc-blue" />
                <span className="text-sm font-medium">
                  Spot: {vendorInfo?.latitude ? vendorInfo.latitude.toFixed(4) : 'N/A'}, {vendorInfo?.longitude ? vendorInfo.longitude.toFixed(4) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 font-mono">
                <TrendingUp size={18} className="text-smc-blue" />
                <span className="text-sm font-bold">{vendorInfo?.vendorId}</span>
              </div>
              <div className={`flex items-center gap-2 font-bold ${
                vendorInfo?.status === 'APPROVED' ? 'text-green-600' : 'text-orange-500'
              }`}>
                <CheckCircle size={18} />
                <span className="text-sm">{vendorInfo?.status || 'PENDING'}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed border-t pt-4">
              <span className="font-bold text-smc-blue">Registered Address:</span> {vendorInfo?.address || 'Solapur Municipal Corporation'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500">Welcome to SSVMS Solapur Control Panel</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-400">Current Revenue</p>
          <p className="text-2xl font-bold text-green-600">₹{stats.revenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Vendors" 
          value={stats.totalVendors} 
          icon={Users} 
          color="bg-blue-600" 
          subValue={`${stats.approvedVendors} Approved, ${stats.pendingVendors} Pending`}
        />
        <StatCard 
          title="Violations" 
          value={stats.totalViolations} 
          icon={AlertTriangle} 
          color="bg-orange-500" 
        />
        <StatCard 
          title="Total Challans" 
          value={stats.totalChallans} 
          icon={Receipt} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Revenue (Paid)" 
          value={`₹${stats.revenue}`} 
          icon={TrendingUp} 
          color="bg-green-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-500" /> Recent Activities
          </h2>
          <div className="space-y-4">
            <div className="border-l-2 border-blue-500 pl-4 py-1">
              <p className="text-sm font-semibold">New Vendor Registered</p>
              <p className="text-xs text-gray-500">Rajesh Kumar (Vegetables) - 2 mins ago</p>
            </div>
            <div className="border-l-2 border-red-500 pl-4 py-1">
              <p className="text-sm font-semibold">Violation Reported</p>
              <p className="text-xs text-gray-500">Vendor ID: SMC-V-8A2F - Outside zone - 15 mins ago</p>
            </div>
            <div className="border-l-2 border-green-500 pl-4 py-1">
              <p className="text-sm font-semibold">Challan Paid</p>
              <p className="text-xs text-gray-500">₹500 received for Challan #SMC-CH-9281 - 1 hour ago</p>
            </div>
          </div>
        </div>
        
        <div className="bg-smc-blue text-white p-8 rounded-xl shadow-lg flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Zone Management</h2>
            <p className="text-blue-100 mb-6">Manage vending zones across Solapur city. Set restricted and allowed areas with GPS boundaries.</p>
            <button 
              onClick={() => navigate('/zones')}
              className="bg-smc-gold text-smc-blue px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 transition"
            >
              Manage Zones
            </button>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-10">
            <TrendingUp size={200} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
