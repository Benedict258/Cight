const API_BASE = import.meta.env.VITE_API_URL || '/api';

let authToken: string | null = localStorage.getItem('cight_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('cight_token', token);
  } else {
    localStorage.removeItem('cight_token');
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

export async function apiGet(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`, { headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(endpoint: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
