import axios from 'axios';

const apiHost = window.location.hostname || 'localhost';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? `http://${apiHost}:8080/api/v1`;
export const AI_API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL ?? `http://${apiHost}:8000/api/v1`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding the bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('accessToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
