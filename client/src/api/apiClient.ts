import axios from 'axios';

export class ApiRequestError extends Error {
  constructor(message: string, public status?: number, public retryAfterMs = 0) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

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
    const status = error.response?.status;
    const retryAfter = error.response?.headers?.['retry-after'];
    const retryAfterMs = retryAfter
      ? Math.max(0, Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now())
      : 0;
    const message = error.response?.data?.message
      || (!error.response && error.code === 'ERR_NETWORK' ? 'Cannot reach the server. Please check your connection and that the backend is running.' : '')
      || (status === 429 ? 'Too many requests. Please wait a moment and try again.' : error.message)
      || 'Request failed.';
    return Promise.reject(new ApiRequestError(message, status, Number.isFinite(retryAfterMs) ? retryAfterMs : 0));
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
