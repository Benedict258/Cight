const API_BASE = '/api';

async function getAuthHeaders() {
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiGet(endpoint) {
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) };
  const res = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(endpoint, body = {}) {
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) };
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete(endpoint) {
  const headers = { ...(await getAuthHeaders()) };
  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
