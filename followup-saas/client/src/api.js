import axios from 'axios';
import { auth } from './firebase.js';

// Ensure it never picks an empty string from Vercel env variables
const backendUrl =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== ''
    ? import.meta.env.VITE_API_URL
    : 'https://fah-flow.vercel.app';

const api = axios.create({ baseURL: backendUrl });

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