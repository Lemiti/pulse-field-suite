import axios from 'axios';

// Create a central Axios client pointing to the Rust backend
export const api = axios.create({
  baseURL: 'http://127.0.0.1:8080/api',
});

// 🛡️ API SECURITY & AUTO-AUTH INTERCEPTOR
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('token');

  // seamless auto-auth for developer local convenience
  if (!token) {
    try {
      console.log("No JWT found. Fetching mock developer token...");
      const res = await axios.get('http://127.0.0.1:8080/api/auth/mock-login');
      token = res.data;
      if (token) {
        localStorage.setItem('token', token);
      }
    } catch (e) {
      console.error("Auto-Authentication failed:", e);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
