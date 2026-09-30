import axios from 'axios';
import { auth } from './firebase.js';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Every request gets a fresh Firebase ID token. getIdToken() returns the
// cached token and silently refreshes it in the background when it's close
// to expiring, so callers never need to think about token lifetime.
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
