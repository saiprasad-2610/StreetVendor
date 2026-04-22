import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, AlertTriangle, Receipt, LogOut, QrCode, Map as MapIcon, CreditCard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-smc-blue text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/dashboard" className="text-xl font-bold flex items-center gap-2">
            <span className="bg-white text-smc-blue p-1 rounded">SMC</span>
            SSVMS
          </Link>

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
              </>
            )}

            {user?.role === 'VENDOR' && (
              <Link to="/my-challans" className="flex items-center gap-1 hover:text-smc-gold transition">
                <Receipt size={18} /> My Challans
              </Link>
            )}

            <Link to="/scan" className="bg-smc-gold text-smc-blue px-3 py-1 rounded-full font-semibold flex items-center gap-1 hover:bg-yellow-400 transition">
              <QrCode size={18} /> Scan QR
            </Link>
          </div>

          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
