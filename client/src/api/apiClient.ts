import axios from 'axios';

export const TOKEN_KEY = 'frms_token';
let authToken: string | null = null;

function clearLegacyStoredTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Auth is intentionally in memory only; blocked storage should not break the app.
  }
}

clearLegacyStoredTokens();

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
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
  clearLegacyStoredTokens();
}

export function getAuthToken() {
  clearLegacyStoredTokens();
  return authToken;
}
