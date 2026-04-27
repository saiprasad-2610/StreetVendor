import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://10.62.25.31:8080/api', // Backend API base URL
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};

export const vendorAPI = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (vendorData) => api.post('/vendors', vendorData),
  update: (id, vendorData) => api.put(`/vendors/${id}`, vendorData),
  delete: (id) => api.delete(`/vendors/${id}`),
  approve: (id) => api.post(`/vendors/${id}/approve`),
  reject: (id) => api.post(`/vendors/${id}/reject`),
  getByVendorId: (vendorId) => api.get(`/vendors/by-vendor-id/${vendorId}`),
};

export const violationAPI = {
  getAll: (params) => api.get('/violations', { params }),
  getById: (id) => api.get(`/violations/${id}`),
  create: (violationData) => api.post('/violations', violationData),
  createManual: (violationData) => api.post('/violations/manual', violationData),
  update: (id, violationData) => api.put(`/violations/${id}`, violationData),
  delete: (id) => api.delete(`/violations/${id}`),
  resolve: (id, resolutionData) => api.post(`/violations/${id}/resolve`, resolutionData),
};

export const zoneAPI = {
  getAll: (params) => api.get('/zones', { params }),
  getById: (id) => api.get(`/zones/${id}`),
  create: (zoneData) => api.post('/zones', zoneData),
  update: (id, zoneData) => api.put(`/zones/${id}`, zoneData),
  delete: (id) => api.delete(`/zones/${id}`),
  getVendors: (id) => api.get(`/zones/${id}/vendors`),
  checkCapacity: (id) => api.get(`/zones/${id}/capacity`),
  // Advanced Geofencing APIs
  validateLocation: (vendorId, latitude, longitude) => api.post('/zones/validate-location', {
    vendorId,
    latitude,
    longitude
  }),
  getAllCapacity: () => api.get('/zones/capacity/all'),
  findNearestZone: (latitude, longitude, maxDistance = 1000) => 
    api.get('/zones/nearest', { params: { latitude, longitude, maxDistance } }),
  getZonesWithinRadius: (latitude, longitude, radius = 500) =>
    api.get('/zones/within-radius', { params: { latitude, longitude, radius } }),
  deactivate: (id) => api.put(`/zones/${id}/deactivate`),
};

export const alertAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  getById: (id) => api.get(`/alerts/${id}`),
  create: (alertData) => api.post('/alerts', alertData),
  acknowledge: (id) => api.post(`/alerts/${id}/acknowledge`),
  resolve: (id, resolutionData) => api.post(`/alerts/${id}/resolve`, resolutionData),
  getStatistics: (params) => api.get('/alerts/statistics', { params }),
  getForOfficer: (officerId) => api.get(`/alerts/officer/${officerId}`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRealTimeStats: () => api.get('/analytics/realtime'),
  getVendorStats: (params) => api.get('/analytics/vendors', { params }),
  getViolationStats: (params) => api.get('/analytics/violations', { params }),
  getRevenueStats: (params) => api.get('/analytics/revenue', { params }),
  getZoneUtilization: (params) => api.get('/analytics/zones', { params }),
};

export const citizenReportingAPI = {
  createReport: (reportData) => api.post('/citizen-reports', reportData),
  getAll: (params) => api.get('/citizen-reports', { params }),
  getById: (id) => api.get(`/citizen-reports/${id}`),
  update: (id, reportData) => api.put(`/citizen-reports/${id}`, reportData),
  delete: (id) => api.delete(`/citizen-reports/${id}`),
  uploadImage: (id, imageData) => api.post(`/citizen-reports/${id}/upload`, imageData),
};

export const scanAPI = {
  validate: (scanData) => api.post('/scans/validate', scanData),
  create: (scanData) => api.post('/scans', scanData),
  getByVendor: (vendorId) => api.get(`/scans/vendor/${vendorId}`),
  getByOfficer: (officerId) => api.get(`/scans/officer/${officerId}`),
};

export const reportAPI = {
  submitCitizenReport: (reportData) => api.post('/citizen-reports', reportData),
  getAll: (params) => api.get('/citizen-reports', { params }),
  getById: (id) => api.get(`/citizen-reports/${id}`),
  update: (id, reportData) => api.put(`/citizen-reports/${id}`, reportData),
  delete: (id) => api.delete(`/citizen-reports/${id}`),
  uploadImage: (id, imageData) => api.post(`/citizen-reports/${id}/upload`, imageData),
};

export default api;
