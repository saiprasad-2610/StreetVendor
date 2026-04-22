import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import VendorRegister from './pages/VendorRegister';
import Dashboard from './pages/Dashboard';
import VendorList from './pages/VendorList';
import AddVendor from './pages/AddVendor';
import QRScanner from './pages/QRScanner';
import ViolationList from './pages/ViolationList';
import ChallanList from './pages/ChallanList';
import VendorChallans from './pages/VendorChallans';
import RentManagement from './pages/RentManagement';
import ZoneManagement from './pages/ZoneManagement';
import MapView from './pages/MapView';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register-vendor" element={<VendorRegister />} />
            <Route path="/scan" element={<QRScanner />} />
            
            <Route path="/*" element={
              <ProtectedRoute>
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/vendors" element={<VendorList />} />
                    <Route path="/vendors/add" element={<ProtectedRoute roles={['ADMIN']}><AddVendor /></ProtectedRoute>} />
                    <Route path="/my-challans" element={<ProtectedRoute roles={['VENDOR']}><VendorChallans /></ProtectedRoute>} />
                    <Route path="/violations" element={<ViolationList />} />
                    <Route path="/challans" element={<ChallanList />} />
                    <Route path="/rent" element={<ProtectedRoute roles={['ADMIN', 'OFFICER']}><RentManagement /></ProtectedRoute>} />
                    <Route path="/zones" element={<ProtectedRoute roles={['ADMIN', 'OFFICER']}><ZoneManagement /></ProtectedRoute>} />
                    <Route path="/map" element={<MapView />} />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
