import axios from 'axios';

export const TOKEN_KEY = 'frms_token';
let authToken: string | null = readStoredToken();

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed.';
    return Promise.reject(new Error(message));
  }
);

export function setAuthToken(token?: string) {
  authToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // In-memory auth still works if browser storage is blocked.
  }
}

export function getAuthToken() {
  return authToken;
}
