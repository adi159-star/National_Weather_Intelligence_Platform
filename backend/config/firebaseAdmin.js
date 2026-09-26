import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let app = null;

export function parseServiceAccount(rawInput) {
  if (!rawInput) return null;
  if (typeof rawInput === 'object') return rawInput;

  let str = String(rawInput).trim();

  // If wrapped in external quotes (e.g. from Render dashboard pasting "{\"type\":...}")
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    try {
      str = JSON.parse(str);
    } catch {
      str = str.slice(1, -1);
    }
  }

  // Decode base64 if provided in base64 format
  if (typeof str === 'string' && !str.startsWith('{') && !str.startsWith('[')) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf8');
      if (decoded.startsWith('{')) {
        str = decoded;
      }
    } catch {
      // not base64, keep original
    }
  }

  try {
    let parsed = typeof str === 'string' ? JSON.parse(str) : str;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }
    if (parsed && typeof parsed === 'object') {
      const key = parsed.private_key || parsed.privateKey;
      if (key && typeof key === 'string') {
        const normalizedKey = key.replace(/\\n/g, '\n');
        parsed.private_key = normalizedKey;
        parsed.privateKey = normalizedKey;
      }
      return parsed;
    }
    return null;
  } catch (err) {
    console.error(`Firebase Admin: Error parsing service account JSON: ${err.message}`);
    return null;
  }
}

if (!getApps().length) {
  let credential = null;

  // 1. Try FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS
  const rawEnvSA =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (rawEnvSA) {
    // Check if it's a file path
    if (typeof rawEnvSA === 'string' && existsSync(rawEnvSA)) {
      try {
        const fileContent = readFileSync(rawEnvSA, 'utf8');
        const sa = parseServiceAccount(fileContent);
        if (sa && (sa.project_id || sa.projectId) && (sa.private_key || sa.privateKey)) {
          credential = cert(sa);
          console.log(`Firebase Admin: Loaded credentials from file path in env (${rawEnvSA})`);
        }
      } catch (e) {
        console.error(`Firebase Admin: Error reading file from env path: ${e.message}`);
      }
    }

    if (!credential) {
      const sa = parseServiceAccount(rawEnvSA);
      if (sa && (sa.project_id || sa.projectId) && (sa.private_key || sa.privateKey)) {
        credential = cert(sa);
        console.log('Firebase Admin: Loaded credentials from FIREBASE_SERVICE_ACCOUNT environment variable');
      }
    }
  }

  // 2. Try individual environment variables
  if (!credential && (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID) && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      });
      console.log('Firebase Admin: Loaded credentials from individual environment variables');
    } catch (err) {
      console.error(`Firebase Admin: Error loading individual env variables: ${err.message}`);
    }
  }

  // 3. Fallback to local serviceAccountKey.json file (local development)
  if (!credential && existsSync(serviceAccountPath)) {
    try {
      const sa = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      if (sa.private_key) {
        sa.private_key = sa.private_key.replace(/\\n/g, '\n');
      }
      credential = cert(sa);
      console.log('Firebase Admin: Loaded credentials from local serviceAccountKey.json');
    } catch (error) {
      console.error(`Firebase Admin: Error reading serviceAccountKey.json: ${error.message}`);
    }
  }

  if (credential) {
    try {
      app = initializeApp({ credential });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error(`Firebase Admin initialization error: ${error.message}`);
    }
  } else {
    console.warn(
      '⚠️ Warning: No Firebase Admin credentials found. ' +
      'Please set FIREBASE_SERVICE_ACCOUNT environment variable on Render, ' +
      'or provide backend/config/serviceAccountKey.json.'
    );
  }
} else {
  app = getApps()[0];
}

const auth = app ? getAuth(app) : null;

const admin = {
  app,
  auth: () => {
    if (auth) return auth;
    if (getApps().length > 0) return getAuth(getApps()[0]);
    throw new Error('Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT.');
  },
  verifyIdToken: async (token) => {
    if (auth) {
      return auth.verifyIdToken(token);
    }
    if (getApps().length > 0) {
      return getAuth(getApps()[0]).verifyIdToken(token);
    }
    throw new Error('Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT.');
  }
};

export { auth, admin };
export default admin;

