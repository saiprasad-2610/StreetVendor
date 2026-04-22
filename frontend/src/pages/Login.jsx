import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, UserPlus } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
        <div className="bg-smc-blue p-8 text-center text-white">
          <div className="inline-block bg-white text-smc-blue text-3xl font-bold p-3 rounded-lg mb-4">
            SMC
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-wider">SSVMS</h2>
          <p className="text-blue-200 mt-2 font-medium">Smart Street Vendor Management System</p>
          <p className="text-xs mt-1 text-blue-300">Solapur Municipal Corporation</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-smc-blue focus:border-transparent outline-none transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-smc-blue focus:border-transparent outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-smc-blue text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition shadow-lg disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'LOGIN'}
          </button>
        </form>
        
        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-500">
          Enforcement Portal - Official Use Only
        </div>
      </div>

      <div className="max-w-md w-full grid grid-cols-1 gap-4">
        <Link 
          to="/register-vendor" 
          className="bg-white p-4 rounded-xl shadow-md border-l-4 border-smc-blue flex items-center gap-4 hover:bg-gray-50 transition"
        >
          <div className="bg-blue-100 p-3 rounded-full text-smc-blue">
            <UserPlus size={24} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800">Register as Vendor</h4>
            <p className="text-xs text-gray-500">Self-register for a vending license</p>
          </div>
        </Link>

        <Link 
          to="/scan" 
          className="bg-white p-4 rounded-xl shadow-md border-l-4 border-red-500 flex items-center gap-4 hover:bg-gray-50 transition"
        >
          <div className="bg-red-100 p-3 rounded-full text-red-500">
            <Camera size={24} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800">Public Complaint</h4>
            <p className="text-xs text-gray-500">Scan QR to report illegal vending</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Login;
