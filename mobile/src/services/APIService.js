import axios from 'axios';

// Configure base URL based on environment
const BASE_URL = __DEV__ 
  ? 'http://10.113.178.31:8080/api'  // Development server
  : 'https://api.smc.solapur.gov.in/api';  // Production server

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear and redirect to login
      localStorage.removeItem('authToken');
      // You can navigate to login screen here
    }
    return Promise.reject(error);
  }
);

class APIService {
  // Authentication
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, refreshToken, user } = response.data.data;
      
      // Store tokens
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens regardless of API response
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // Vendor operations
  async getAllVendors() {
    try {
      const response = await api.get('/vendors');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getVendorById(vendorId) {
    try {
      const response = await api.get(`/vendors/${vendorId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchVendors(searchTerm) {
    try {
      const response = await api.get(`/vendors/search?q=${searchTerm}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Zone operations
  async getAllZones() {
    try {
      const response = await api.get('/zones');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getZoneCapacity(zoneId) {
    try {
      const response = await api.get(`/zones/${zoneId}/capacity`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // QR scanning and validation
  async scanVendorQR(scanData) {
    try {
      const response = await api.post('/scan/validate', scanData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Violation reporting
  async submitViolationReport(violationData) {
    try {
      const formData = new FormData();
      
      // Add all fields to FormData
      Object.keys(violationData).forEach(key => {
        if (key !== 'imageUri' && key !== 'additionalImages') {
          formData.append(key, violationData[key]);
        }
      });

      // Handle image if provided
      if (violationData.imageUri) {
        const imageFile = {
          uri: violationData.imageUri,
          type: 'image/jpeg',
          name: 'violation_photo.jpg',
        };
        formData.append('imageFile', imageFile);
      }

      const response = await api.post('/violations/report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getViolationsByVendor(vendorId) {
    try {
      const response = await api.get(`/violations/vendor/${vendorId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Citizen reporting
  async submitCitizenReport(reportData) {
    try {
      const formData = new FormData();
      
      // Add all fields to FormData
      Object.keys(reportData).forEach(key => {
        if (key !== 'imageFile' && key !== 'additionalImages') {
          formData.append(key, reportData[key]);
        }
      });

      // Handle images if provided
      if (reportData.imageFile) {
        formData.append('imageFile', reportData.imageFile);
      }

      if (reportData.additionalImages) {
        reportData.additionalImages.forEach((file, index) => {
          formData.append(`additionalImages[${index}]`, file);
        });
      }

      const response = await api.post('/citizen-reports/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMyReports(phoneNumber) {
    try {
      const response = await api.get(`/citizen-reports/my-reports?phoneNumber=${phoneNumber}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getReportStatus(reportId) {
    try {
      const response = await api.get(`/citizen-reports/status/${reportId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Analytics (for officers)
  async getDashboardStats(startDate, endDate) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/analytics/dashboard?${params}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRealTimeStats() {
    try {
      const response = await api.get('/analytics/realtime');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Alerts (for officers)
  async getAlerts(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const response = await api.get(`/alerts?${params}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async acknowledgeAlert(alertId) {
    try {
      const response = await api.put(`/alerts/${alertId}/acknowledge`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resolveAlert(alertId, resolutionNotes) {
    try {
      const response = await api.put(`/alerts/${alertId}/resolve`, {
        resolutionNotes
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Sync operations for offline data
  async syncOfflineData() {
    try {
      const response = await api.post('/sync/upload');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async downloadEssentialData() {
    try {
      const response = await api.get('/sync/download');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Utility methods
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(data.message || 'Bad request');
        case 401:
          return new Error('Authentication required');
        case 403:
          return new Error('Access denied');
        case 404:
          return new Error('Resource not found');
        case 429:
          return new Error('Too many requests');
        case 500:
          return new Error('Server error');
        default:
          return new Error(data.message || 'Request failed');
      }
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error - please check your connection');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  // Check network connectivity
  async checkConnectivity() {
    try {
      await api.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get current user info
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }

  // Get auth token
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Refresh token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {
        refreshToken
      });

      const { token } = response.data.data;
      localStorage.setItem('authToken', token);
      
      return token;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default new APIService();
