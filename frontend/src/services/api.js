import axios from 'axios';
import { useAuth } from '../context/AuthContext';

/**
 * API service with authentication interceptors
 * Automatically adds JWT token to requests and handles 401 responses
 */

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 30000,
});

// Flag to prevent infinite redirect loops
let isRedirecting = false;

/**
 * Request interceptor: Add auth token to headers
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trinetra_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle 401 Unauthorized
 * Redirect to login if token is invalid or expired
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      const hadToken = !!localStorage.getItem('trinetra_token');
      isRedirecting = true;
      localStorage.removeItem('trinetra_token');
      localStorage.removeItem('trinetra_user');
      localStorage.removeItem('trinetra_auth');
      const path = window.location.pathname;
      const isPublic = path === '/' || path === '/landing' || path === '/login';
      if (hadToken && !isPublic) {
        window.location.href = '/login';
      }
      setTimeout(() => {
        isRedirecting = false;
      }, 2000);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
