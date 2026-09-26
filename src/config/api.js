/**
 * National Weather Intelligence Platform - API Configuration
 * 
 * Provides centralized API endpoint resolution with intelligent fallback:
 * 1. import.meta.env.VITE_API_URL (if provided, trailing slashes trimmed)
 * 2. Defaults to 'http://localhost:5000' in local development
 */

const envApiUrl = import.meta.env.VITE_API_URL;

export const API_BASE_URL = (
  envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim() !== ''
    ? envApiUrl.trim().replace(/\/+$/, '')
    : 'http://localhost:5000'
);

/**
 * Helper to safely extract JSON or error message from a fetch Response.
 * Avoids uncaught syntax errors like "Unexpected token '<'" or "Unexpected end of JSON input".
 * 
 * @param {Response} response - The fetch Response object
 * @returns {Promise<{ ok: boolean, status: number, data: any, error?: string }>}
 */
export async function safeFetchJson(response) {
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  let text = '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      text = await response.text();
    } catch {
      text = '';
    }
  }

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (text && !text.includes('<!doctype') ? text.slice(0, 150) : `Server responded with status ${response.status}`);
    return { ok: false, status: response.status, data, error: errorMsg };
  }

  return { ok: true, status: response.status, data };
}
