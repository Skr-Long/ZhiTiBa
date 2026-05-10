import axios from 'axios';
import { getToken, clearAuth } from '../utils/storage';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        clearAuth();
        window.location.href = '/login';
      }

      if (error.response.data && error.response.data.message) {
        return Promise.reject(new Error(error.response.data.message));
      }
    }
    return Promise.reject(error);
  }
);

export default api;