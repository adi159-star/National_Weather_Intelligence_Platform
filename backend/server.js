import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import './config/firebaseAdmin.js';
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

