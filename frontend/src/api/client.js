const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const TOKEN_STORAGE_KEY = 'studyabroad_token';

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Thin wrapper the whole app calls through instead of using fetch() directly, so auth
 * headers, base URL, and error shape are handled in exactly one place. On failure it
 * throws an ApiError carrying the backend's structured {code, message, ...} envelope so
 * UI code (e.g. a 403 TIER_UPGRADE_REQUIRED) can branch on `err.code` / `err.upgrade`.
 */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message ?? 'Request failed');
    this.status = status;
    this.code = body?.error?.code;
    this.upgrade = body?.error?.upgrade;
    this.details = body?.error?.details;
  }
}

async function request(path, { method = 'GET', body, auth = true, isFormData = false } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  // FormData sets its own multipart Content-Type (with boundary) — setting it manually
  // here would drop the boundary and break parsing on the server.
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  getProfile: () => request('/profile'),
  saveProfile: (payload) => request('/profile', { method: 'POST', body: payload }),

  uploadDocument: ({ rawText, file, essayType }) => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (essayType) formData.append('essayType', essayType);
      return request('/documents', { method: 'POST', body: formData, isFormData: true });
    }
    return request('/documents', { method: 'POST', body: { rawText, essayType } });
  },
  listDocuments: () => request('/documents'),
  getFeedback: (documentId) => request(`/feedback/${documentId}`),

  getMatches: () => request('/matches'),
  getScholarships: () => request('/scholarships'),

  getVisaChecklist: (destination) => request(`/visa-checklist?destination=${encodeURIComponent(destination)}`),

  getCostOfLiving: (city) => request(`/cost-of-living?city=${encodeURIComponent(city)}`),
};
