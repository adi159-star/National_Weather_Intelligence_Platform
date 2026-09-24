import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let app = null;

if (!getApps().length) {
  if (existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      app = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error(`Firebase Admin initialization error: ${error.message}`);
    }
  } else {
    console.warn('⚠️ Warning: backend/config/serviceAccountKey.json not found. Firebase Admin is not initialized.');
  }
} else {
  app = getApps()[0];
}

const auth = app ? getAuth(app) : null;

const admin = {
  app,
  auth: () => auth || getAuth(),
  verifyIdToken: (token) => (auth || getAuth()).verifyIdToken(token)
};

export { auth, admin };
export default admin;
