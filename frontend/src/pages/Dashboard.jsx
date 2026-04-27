import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, Receipt, CheckCircle, TrendingUp, QrCode, MapPin, IndianRupee, CreditCard, Activity, Clock, DollarSign, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Row, Col, Statistic, Progress, Tag, Badge, Select, DatePicker, Spin, Alert } from 'antd';

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
  const [recentActivities, setRecentActivities] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [violationData, setViolationData] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

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
      setLoading(true);
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

          // Generate chart data
          generateRevenueData(challanData);
          generateViolationData(violationData);
          generateRecentActivities(vData, violationData, challanData);
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
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user, timeRange]);

  const generateRevenueData = (challanData) => {
    const paidChallans = challanData.filter(c => c.status === 'PAID');
    const revenueByMonth = {};
    paidChallans.forEach(c => {
      const month = new Date(c.createdAt).toLocaleString('default', { month: 'short' });
      revenueByMonth[month] = (revenueByMonth[month] || 0) + c.fineAmount;
    });
    
    setRevenueData(
      Object.entries(revenueByMonth).map(([month, amount]) => ({
        month,
        revenue: amount
      }))
    );
  };

  const generateViolationData = (violationData) => {
    const violationsByType = {};
    violationData.forEach(v => {
      const type = v.type || 'Other';
      violationsByType[type] = (violationsByType[type] || 0) + 1;
    });
    
    setViolationData(
      Object.entries(violationsByType).map(([type, count]) => ({
        type,
        count
      }))
    );
  };

  const generateRecentActivities = (vendors, violations, challans) => {
    const activities = [];
    
    vendors.slice(-5).forEach(v => {
      activities.push({
        type: 'vendor',
        title: `New Vendor Registered`,
        description: `${v.name} (${v.category})`,
        time: new Date(v.createdAt).toLocaleString(),
        icon: <Users className="text-blue-500" />,
        color: 'blue'
      });
    });
    
    violations.slice(-5).forEach(v => {
      activities.push({
        type: 'violation',
        title: 'Violation Reported',
        description: `Vendor ID: ${v.vendorId} - ${v.type}`,
        time: new Date(v.createdAt).toLocaleString(),
        icon: <AlertTriangle className="text-red-500" />,
        color: 'red'
      });
    });
    
    challans.filter(c => c.status === 'PAID').slice(-5).forEach(c => {
      activities.push({
        type: 'payment',
        title: 'Challan Paid',
        description: `₹${c.fineAmount} received`,
        time: new Date(c.updatedAt).toLocaleString(),
        icon: <Receipt className="text-green-500" />,
        color: 'green'
      });
    });
    
    setRecentActivities(activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10));
  };

  const StatCard = ({ title, value, icon: Icon, color, subValue, trend }) => (
    <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-l-smc-blue hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold mt-1">{value}</h3>
          {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
          {trend && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color} text-white`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  if (user?.role === 'VENDOR') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Vendor Dashboard</h1>
            <p className="text-gray-500">Welcome back, {user.fullName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

        <div className="bg-white p-4 sm:p-8 rounded-xl shadow-md flex flex-col lg:flex-row items-center gap-6 lg:gap-8 border border-blue-100">
          <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300">
            {vendorInfo?.qrCodeUrl && vendorInfo?.status === 'APPROVED' ? (
              <img 
                src={`${vendorInfo.qrCodeUrl}`} 
                alt="Vending QR" 
                className="w-36 h-36 sm:w-48 sm:h-48"
              />
            ) : (
              <div className="w-36 h-36 sm:w-48 sm:h-48 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                <QrCode size={48} className="sm:size-64 text-gray-300" />
                <p className="text-[10px] text-gray-400 mt-2">
                  {vendorInfo?.status === 'PENDING' ? 'QR PENDING APPROVAL' : 'QR NOT AVAILABLE'}
                </p>
              </div>
            )}
            <p className="text-center text-xs text-gray-500 mt-2 font-bold uppercase">Your Vending QR</p>
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Digital ID Card</h2>
              {vendorInfo?.status === 'APPROVED' && (
                <button 
                  onClick={handlePayRent}
                  disabled={payingRent || !vendorInfo?.monthlyRent || vendorInfo?.monthlyRent <= 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500">Welcome to SSVMS Solapur Control Panel</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-400">Current Revenue</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">₹{stats.revenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-lg sm:text-xl font-bold">Overview</h2>
        <Select
          value={timeRange}
          onChange={setTimeRange}
          style={{ width: '100%', maxWidth: 150 }}
          options={[
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Total Vendors" 
          value={stats.totalVendors} 
          icon={Users} 
          color="bg-blue-600" 
          subValue={`${stats.approvedVendors} Approved, ${stats.pendingVendors} Pending`}
          trend={12}
        />
        <StatCard 
          title="Violations" 
          value={stats.totalViolations} 
          icon={AlertTriangle} 
          color="bg-orange-500" 
          trend={-5}
        />
        <StatCard 
          title="Total Challans" 
          value={stats.totalChallans} 
          icon={Receipt} 
          color="bg-red-500" 
          trend={8}
        />
        <StatCard 
          title="Revenue (Paid)" 
          value={`₹${stats.revenue}`} 
          icon={TrendingUp} 
          color="bg-green-600" 
          trend={15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Revenue Summary */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="text-green-500" /> Revenue Summary
          </h2>
          {revenueData.length > 0 ? (
            <div className="space-y-3">
              {revenueData.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{item.month}</span>
                  <span className="text-green-600 font-bold">₹{item.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-10">No revenue data available</div>
          )}
        </div>

        {/* Violation Summary */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="text-red-500" /> Violations by Type
          </h2>
          {violationData.length > 0 ? (
            <div className="space-y-3">
              {violationData.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{item.type}</span>
                  <Tag color="red">{item.count}</Tag>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-10">No violation data available</div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
          <Activity className="text-blue-500" /> Recent Activities
        </h2>
        {recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`p-2 rounded-lg bg-${activity.color}-100`}>
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{activity.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={12} /> {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-10">No recent activities</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-smc-blue text-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl font-bold mb-2">Zone Management</h2>
            <p className="text-blue-100 mb-4 text-sm">Manage vending zones across Solapur city</p>
            <button 
              onClick={() => navigate('/zones')}
              className="bg-smc-gold text-smc-blue px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 transition text-sm w-full sm:w-auto"
            >
              Manage Zones
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 hidden sm:block">
            <MapPin size={100} />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl font-bold mb-2">Geofencing</h2>
            <p className="text-purple-100 mb-4 text-sm">Real-time location tracking & alerts</p>
            <button 
              onClick={() => navigate('/geofencing')}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition text-sm w-full sm:w-auto"
            >
              View Geofencing
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 hidden sm:block">
            <Zap size={100} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
