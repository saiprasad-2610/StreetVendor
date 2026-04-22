import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../redux/store';
import { logout } from '../redux/authSlice';

const API_BASE_URL = 'http://10.113.178.31:8080/api'; // Updated to match backend IP from application.properties

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;

export const setApiToken = (token: string | null) => {
  authToken = token;
};

api.interceptors.request.use(
  async (config) => {
    let token = authToken;
    if (!token) {
      token = await AsyncStorage.getItem('token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;
