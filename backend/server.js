import 'dotenv/config';
import { existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { getApps } from 'firebase-admin/app';
import { parseServiceAccount } from './config/firebaseAdmin.js';
import WeatherReport from './models/WeatherReport.js';
import userRoutes from './routes/userRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import weatherApiRoutes from './routes/weatherApiRoutes.js';
import socialDataRoutes from './routes/socialDataRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import duplicateRoutes from './routes/duplicateRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed Frontend Origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://national-weather-intelligence-platf-snowy.vercel.app'
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((url) => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check exact match in configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any Vercel deployment preview / production domain for this application
      try {
        const parsed = new URL(origin);
        if (
          parsed.protocol === 'https:' &&
          (parsed.hostname.endsWith('.vercel.app') || parsed.hostname === 'national-weather-intelligence-platf-snowy.vercel.app')
        ) {
          return callback(null, true);
        }
      } catch {
        // invalid URL format
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/weather-reports', weatherRoutes);
app.use('/api/weather-api', weatherApiRoutes);
app.use('/api/social-data', socialDataRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/duplicates', duplicateRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health-check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Weather Analytics API is running'
  });
});

// TEMPORARY DIAGNOSTIC ENDPOINT (Remove after debugging)
app.get('/api/debug/db', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const count = await WeatherReport.countDocuments();
    const weatherApiCount = await WeatherReport.countDocuments({ sourceType: 'weather_api' });
    const citizenCount = await WeatherReport.countDocuments({ sourceType: 'citizen' });

    res.status(200).json({
      connected: isConnected,
      database: mongoose.connection.name || 'weather_platform',
      weatherReportCount: count,
      sourceBreakdown: {
        citizen: citizenCount,
        weather_api: weatherApiCount
      }
    });
  } catch (err) {
    res.status(500).json({
      connected: false,
      error: err.message
    });
  }
});

// TEMPORARY DIAGNOSTIC ENDPOINT FOR FIREBASE ADMIN STATUS (No secrets exposed)
app.get('/api/debug/auth', (req, res) => {
  const apps = getApps();
  const rawSA =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  let parsedDetails = null;
  let parseError = null;

  if (rawSA) {
    try {
      const sa = parseServiceAccount(rawSA);
      if (sa) {
        parsedDetails = {
          project_id: sa.project_id || sa.projectId || null,
          client_email: sa.client_email || sa.clientEmail || null,
          has_private_key: Boolean(sa.private_key || sa.privateKey),
          private_key_length: (sa.private_key || sa.privateKey || '').length
        };
      } else {
        parseError = 'parseServiceAccount returned null';
      }
    } catch (err) {
      parseError = err.message;
    }
  }

  res.status(200).json({
    firebaseAdminInitialized: apps.length > 0,
    appsCount: apps.length,
    appName: apps.length > 0 ? apps[0].name : null,
    envVarsPresent: {
      FIREBASE_SERVICE_ACCOUNT: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
      FIREBASE_SERVICE_ACCOUNT_length: process.env.FIREBASE_SERVICE_ACCOUNT ? process.env.FIREBASE_SERVICE_ACCOUNT.length : 0,
      FIREBASE_SERVICE_ACCOUNT_KEY: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
      GOOGLE_APPLICATION_CREDENTIALS: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID),
      FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      FIREBASE_PRIVATE_KEY: Boolean(process.env.FIREBASE_PRIVATE_KEY)
    },
    parsedDetails,
    parseError,
    expectedProjectId: 'national-weather-platform',
    envPreview: rawSA ? `${rawSA.slice(0, 10)}...${rawSA.slice(-10)}` : null,
    envType: typeof rawSA,
    pathExists: rawSA && typeof rawSA === 'string' ? existsSync(rawSA) : false,
    renderSecretFiles: [
      '/etc/secrets/serviceAccountKey.json',
      '/etc/secrets/backend/config/serviceAccountKey.json',
      './serviceAccountKey.json',
      '../serviceAccountKey.json'
    ].filter(p => existsSync(p))
  });
});


// Connect to MongoDB Atlas before starting server
try {
  await connectDB();
} catch (dbErr) {
  console.error('Initial MongoDB connection error:', dbErr.message);
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error('Server listen error:', err);
  }
});

