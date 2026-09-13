// Cliente HTTP mínimo hacia el backend. Toda la app pasa por aquí para que
// la base URL y el manejo de errores queden en un solo lugar.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(status, body) {
    super((body && body.message) || `Error de API (${status})`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data;
}

export { API_BASE_URL };
