function getApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  // If missing, or pointing to local loopback (e.g. localhost:8080) from a hosted origin, use relative '/api'
  if (
    !envUrl ||
    envUrl.includes('localhost') ||
    envUrl.includes('127.0.0.1') ||
    envUrl.includes(':8080')
  ) {
    return '/api';
  }
  return envUrl.replace(/\/+$/, '');
}

const API_BASE = getApiBase();

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('cight_token') : null;

export function setToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('cight_token', token);
    } else {
      localStorage.removeItem('cight_token');
    }
  }
}

export function getToken() {
  return authToken;
}

function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    h['Authorization'] = `Bearer ${authToken}`;
  }
  return h;
}

async function handleResponseError(res: Response): Promise<never> {
  let errorMsg = `Request failed with status ${res.status}`;
  try {
    const data = await res.json();
    errorMsg = data.error || data.message || JSON.stringify(data);
  } catch {
    try {
      const text = await res.text();
      if (text) errorMsg = text;
    } catch {
      // ignore
    }
  }
  throw new Error(errorMsg);
}

export async function apiGet(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`, { headers: headers() });
  if (!res.ok) await handleResponseError(res);
  return res.json();
}

export async function apiPost(endpoint: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleResponseError(res);
  return res.json();
}

export async function apiPut(endpoint: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleResponseError(res);
  return res.json();
}

export async function apiDelete(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) await handleResponseError(res);
  return res.json();
}
