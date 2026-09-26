/**
 * National Weather Intelligence Platform - API Configuration
 * 
 * Provides centralized API endpoint resolution with intelligent fallback:
 * 1. import.meta.env.VITE_API_URL (if provided, trailing slashes trimmed)
 * 2. Defaults to 'http://localhost:5000' in local development
 */

import { auth } from '../services/firebase.js';

const envApiUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : (typeof process !== 'undefined' && process.env?.VITE_API_URL ? process.env.VITE_API_URL : null);

export const API_BASE_URL = (
  envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim() !== ''
    ? envApiUrl.trim().replace(/\/+$/, '')
    : 'http://localhost:5000'
);


/**
 * Safely decodes base64url or base64 strings in both browser and Node runtimes.
 */
function safeDecodeBase64(str) {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    if (typeof atob === 'function') {
      return atob(base64);
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

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

/**
 * Reusable Authenticated Fetch Helper
 * 
 * Features:
 * 1. Automatically obtains a valid Firebase ID token using the existing Firebase Auth instance.
 * 2. Proactively checks if the cached ID token has expired or is nearing expiration (within 60s),
 *    triggering a forced refresh via `getIdToken(true)`.
 * 3. Injects `Authorization: Bearer <token>` and `Content-Type: application/json` headers.
 * 4. Automatically catches 401 Unauthorized responses (due to server-side expiration/clock drift),
 *    forces a token refresh (`getIdToken(true)`), and retries the request ONCE.
 * 5. Rejects with a clear friendly error message if the retry also fails with 401, preventing infinite loops.
 * 6. Never permanently stores ID tokens in localStorage.
 * 
 * @param {string} url - Request target URL
 * @param {RequestInit & { firebaseUser?: any, user?: any, forceRefresh?: boolean }} options - Fetch options
 * @param {number} retryCount - Internal retry counter (capped at 1)
 * @returns {Promise<Response>}
 */
export async function authenticatedFetch(url, options = {}, retryCount = 0) {
  const firebaseUser = auth?.currentUser || options.firebaseUser || options.user?.firebaseUser;

  if (!firebaseUser) {
    throw new Error('User is not authenticated. Please sign in to submit reports.');
  }

  // Obtain token — force refresh if explicitly requested, on retry, or if token is stale
  let token = null;
  try {
    if (options.forceRefresh || retryCount > 0) {
      token = await firebaseUser.getIdToken(true);
    } else {
      token = await firebaseUser.getIdToken(false);
      // Proactive client-side expiration check (JWT payload exp claim)
      if (token && typeof token === 'string' && token.includes('.')) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const rawPayload = safeDecodeBase64(parts[1]);
            if (rawPayload) {
              const payload = JSON.parse(rawPayload);
              const nowSec = Math.floor(Date.now() / 1000);
              if (payload.exp && nowSec >= payload.exp - 60) {
                // Token is expired or expiring within 60s -> obtain fresh token immediately
                token = await firebaseUser.getIdToken(true);
              }
            }
          }
        } catch {
          // Proceed with current token if payload parse fails
        }
      }
    }
  } catch (tokenErr) {
    console.error('[authenticatedFetch] Failed to retrieve Firebase ID token:', tokenErr);
    throw new Error('Authentication token could not be retrieved. Please sign in again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle 401 Unauthorized: Refresh token and retry ONCE
  if (response.status === 401 && retryCount === 0) {
    console.warn('[authenticatedFetch] Received 401 Unauthorized. Refreshing token and retrying once...');
    try {
      const freshToken = await firebaseUser.getIdToken(true);
      const retryHeaders = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${freshToken}`
      };

      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders
      });

      if (retryResponse.status === 401) {
        console.error('[authenticatedFetch] Retry attempt also returned 401. Session has expired.');
        throw new Error('Your session has expired. Please sign in again.');
      }

      return retryResponse;
    } catch (retryErr) {
      if (retryErr.message?.includes('session has expired')) {
        throw retryErr;
      }
      console.error('[authenticatedFetch] Token refresh retry failed:', retryErr);
      throw new Error('Your session has expired. Please sign in again.');
    }
  }

  if (response.status === 401 && retryCount > 0) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return response;
}

