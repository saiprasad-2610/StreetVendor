import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, AlertTriangle, Receipt, LogOut, QrCode, Map as MapIcon, CreditCard, Zap, MapPin, Menu, X } from 'lucide-react';
import NotificationCenter from './Notifications/NotificationCenter';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-smc-blue text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/dashboard" className="text-xl font-bold flex items-center gap-2" onClick={closeMobileMenu}>
            <span className="bg-white text-smc-blue p-1 rounded">SMC</span>
            <span className="hidden sm:inline">SSVMS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-1 hover:text-smc-gold transition">
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            
            {(user?.role === 'ADMIN' || user?.role === 'OFFICER') && (
              <>
                <Link to="/vendors" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <Users size={18} /> Vendors
                </Link>
                <Link to="/violations" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <AlertTriangle size={18} /> Violations
                </Link>
                <Link to="/challans" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <Receipt size={18} /> Challans
                </Link>
                <Link to="/rent" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <CreditCard size={18} /> Rent
                </Link>
                <Link to="/map" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <MapIcon size={18} /> Live Map
                </Link>
                <Link to="/geofencing" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <Zap size={18} /> Geofencing
                </Link>
              </>
            )}

            {user?.role === 'VENDOR' && (
              <>
                <Link to="/my-location" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <MapPin size={18} /> My Location
                </Link>
                <Link to="/my-challans" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <Receipt size={18} /> My Challans
                </Link>
                <Link to="/my-rent-history" className="flex items-center gap-1 hover:text-smc-gold transition">
                  <CreditCard size={18} /> Rent History
                </Link>
              </>
            )}

            <Link to="/scan" className="bg-smc-gold text-smc-blue px-3 py-1 rounded-full font-semibold flex items-center gap-1 hover:bg-yellow-400 transition">
              <QrCode size={18} /> Scan QR
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user?.fullName}</p>
              <p className="text-xs text-blue-200">{user?.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 p-2 rounded-full transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-blue-700 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-blue-700 mt-4 pt-4">
            <div className="flex flex-col gap-3">
              <Link to="/dashboard" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              
              {(user?.role === 'ADMIN' || user?.role === 'OFFICER') && (
                <>
                  <Link to="/vendors" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <Users size={18} /> Vendors
                  </Link>
                  <Link to="/violations" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <AlertTriangle size={18} /> Violations
                  </Link>
                  <Link to="/challans" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <Receipt size={18} /> Challans
                  </Link>
                  <Link to="/rent" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <CreditCard size={18} /> Rent
                  </Link>
                  <Link to="/map" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <MapIcon size={18} /> Live Map
                  </Link>
                  <Link to="/geofencing" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <Zap size={18} /> Geofencing
                  </Link>
                </>
              )}

              {user?.role === 'VENDOR' && (
                <>
                  <Link to="/my-location" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <MapPin size={18} /> My Location
                  </Link>
                  <Link to="/my-challans" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <Receipt size={18} /> My Challans
                  </Link>
                  <Link to="/my-rent-history" className="flex items-center gap-2 hover:text-smc-gold transition px-2 py-2 rounded-lg hover:bg-blue-700" onClick={closeMobileMenu}>
                    <CreditCard size={18} /> Rent History
                  </Link>
                </>
              )}

              <Link to="/scan" className="bg-smc-gold text-smc-blue px-3 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-yellow-400 transition" onClick={closeMobileMenu}>
                <QrCode size={18} /> Scan QR
              </Link>
              
              <div className="sm:hidden border-t border-blue-700 pt-3 mt-2">
                <p className="text-sm font-semibold">{user?.fullName}</p>
                <p className="text-xs text-blue-200">{user?.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
