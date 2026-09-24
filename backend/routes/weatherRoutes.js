import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import WeatherReport from '../models/WeatherReport.js';

const router = express.Router();

/**
 * POST /api/weather-reports
 * Authenticated via Firebase ID token.
 * Submits a new ground-truth weather report.
 * Reporter identity is strictly retrieved from the authenticated MongoDB user record.
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing authenticated user identity'
      });
    }

    // Lookup authenticated user in MongoDB
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found in database. Please log in or sync your account first.'
      });
    }

    // Extract ONLY permitted user input fields from request body (never trust client for identity/role/status)
    const {
      eventType,
      description,
      city,
      state,
      latitude,
      longitude
    } = req.body;

    // Validate required fields
    if (!eventType || typeof eventType !== 'string' || !eventType.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: eventType is required and must be a non-empty string'
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: description is required and must be a non-empty string'
      });
    }

    // Validate coordinates if provided
    let parsedLatitude = null;
    if (latitude !== undefined && latitude !== null && latitude !== '') {
      parsedLatitude = Number(latitude);
      if (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
        return res.status(400).json({
          success: false,
          message: 'Validation error: latitude must be a valid number between -90 and 90'
        });
      }
    }

    let parsedLongitude = null;
    if (longitude !== undefined && longitude !== null && longitude !== '') {
      parsedLongitude = Number(longitude);
      if (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Validation error: longitude must be a valid number between -180 and 180'
        });
      }
    }

    // Create the weather report using verified MongoDB user credentials
    const report = await WeatherReport.create({
      userId: user.firebaseUid,
      userName: user.name || '',
      userEmail: user.email || '',
      eventType: eventType.trim(),
      description: description.trim(),
      city: typeof city === 'string' ? city.trim() : '',
      state: typeof state === 'string' ? state.trim() : '',
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      reportedAt: new Date(),
      verificationStatus: 'pending',
      aiClassification: null,
      aiConfidence: null,
      isDuplicate: false
    });

    return res.status(201).json({
      success: true,
      message: 'Weather report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Error submitting weather report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while submitting weather report'
    });
  }
});

/**
 * GET /api/weather-reports
 * Public endpoint for viewing crowdsourced weather reports.
 * Sorted newest first, excluding sensitive authentication fields (userId, userEmail).
 */
router.get('/', async (req, res) => {
  try {
    const reports = await WeatherReport.find()
      .sort({ createdAt: -1 })
      .select('-userId -userEmail -__v')
      .lean();

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Error fetching weather reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving weather reports'
    });
  }
});

export default router;
