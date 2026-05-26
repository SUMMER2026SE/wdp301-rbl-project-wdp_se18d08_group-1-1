/**
 * Base API configuration and fetch wrapper.
 * All service files should import from here.
 */

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

/**
 * Thin fetch wrapper that always resolves (never throws on HTTP errors).
 * Returns { ok, status, data } so callers can branch on `ok`.
 *
 * @param {string} endpoint  - path after API_BASE, e.g. '/auth/login'
 * @param {RequestInit} options  - standard fetch options (method, body, headers…)
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export async function apiFetch(endpoint, options = {}) {
  const { headers = {}, ...rest } = options;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest,
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}
