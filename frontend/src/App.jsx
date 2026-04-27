import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import VendorRegister from './pages/VendorRegister';
import Dashboard from './pages/Dashboard';
import VendorList from './pages/VendorList';
import VendorDetail from './pages/VendorDetail';
import AddVendor from './pages/AddVendor';
import QRScanner from './pages/QRScanner';
import ViolationList from './pages/ViolationList';
import ChallanList from './pages/ChallanList';
import VendorChallans from './pages/VendorChallans';
import RentManagement from './pages/RentManagement';
import ZoneManagement from './pages/ZoneManagement';
import MapView from './pages/MapView';
import Navbar from './components/Navbar';

// Phase 1 Enhanced Components
import EnhancedZoneManager from './components/ZoneManagement/EnhancedZoneManager';
import AnalyticsDashboard from './components/Analytics/Dashboard';
import CitizenReportForm from './components/CitizenReporting/CitizenReportForm';
import AlertManagement from './components/Alerts/AlertManagement';
import GeofencingDashboard from './components/Geofencing/GeofencingDashboard';
import VendorLocationTracker from './components/Geofencing/VendorLocationTracker';
import GeofencingTest from './components/Geofencing/GeofencingTest';
import CitizenEngagementDashboard from './components/CitizenReporting/CitizenEngagementDashboard';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;

  return children;
};

function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register-vendor" element={<VendorRegister />} />
              <Route path="/citizen-reports" element={<CitizenEngagementDashboard />} />
              
              {/* Public QR Scanner - No authentication required */}
              <Route path="/scan" element={<QRScanner />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <Dashboard />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/vendors" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <VendorList />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/vendors/:id" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <VendorDetail />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/vendors/add" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <AddVendor />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/violations" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <ViolationList />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/challans" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <ChallanList />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/my-challans" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <VendorChallans />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/rent" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <RentManagement />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/rent-management" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <RentManagement />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/zones" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <ZoneManagement />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/zones/enhanced" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <EnhancedZoneManager />
                  </div>
                </ProtectedRoute>
              } />
                            <Route path="/map" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <MapView />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <AnalyticsDashboard />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/citizen-reports" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <CitizenReportForm />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/alerts" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <AlertManagement />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/geofencing" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <GeofencingDashboard />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/my-location" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <VendorLocationTracker />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/geofencing-test" element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <GeofencingTest />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/scan" />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
