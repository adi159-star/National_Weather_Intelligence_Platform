import express from 'express';
import mongoose from 'mongoose';
import { verifyFirebaseToken, requireAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import WeatherReport from '../models/WeatherReport.js';
import { processWeatherReport } from '../services/processWeatherReport.js';

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
    let user = await User.findOne({ firebaseUid });

    if (!user) {
      try {
        user = await User.create({
          firebaseUid,
          name: req.user?.name || 'Observer',
          email: req.user?.email || '',
          photoURL: req.user?.picture || '',
          role: 'user'
        });
      } catch (_userErr) {
        user = await User.findOne({ firebaseUid });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User profile not found in database. Please log in or sync your account first.'
          });
        }
      }
    }


    // Extract permitted user input fields from request body (never trust client for identity/role/status)
    const {
      eventType,
      description,
      city,
      state,
      latitude,
      longitude,
      content,
      sourceName,
      sourceId
    } = req.body;

    // Validate required fields
    if (!eventType || typeof eventType !== 'string' || !eventType.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: eventType is required and must be a non-empty string'
      });
    }

    const reportText = (typeof description === 'string' && description.trim())
      ? description.trim()
      : (content && typeof content.text === 'string' ? content.text.trim() : '');

    if (!reportText) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: description is required and must be a non-empty string'
      });
    }

    const mediaUrl = (content && typeof content.mediaUrl === 'string')
      ? content.mediaUrl.trim()
      : '';

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
      sourceType: 'citizen',
      sourceName: (typeof sourceName === 'string' && sourceName.trim()) ? sourceName.trim() : 'Citizen Report',
      sourceId: (typeof sourceId === 'string' && sourceId.trim()) ? sourceId.trim() : null,
      eventType: eventType.trim(),
      description: reportText,
      content: {
        text: reportText,
        mediaUrl: mediaUrl
      },
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

    // Run automatic AI classification and duplicate detection pipeline
    const processedReport = await processWeatherReport(report);

    return res.status(201).json({
      success: true,
      message: 'Weather report submitted successfully',
      report: processedReport
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

    // Ensure backward compatibility defaults for legacy reports in database
    const sanitizedReports = reports.map((report) => ({
      ...report,
      sourceType: report.sourceType || 'citizen',
      sourceName: report.sourceName || 'Citizen Report',
      sourceId: report.sourceId ?? null,
      content: report.content || {
        text: report.description || '',
        mediaUrl: ''
      }
    }));

    return res.status(200).json({
      success: true,
      count: sanitizedReports.length,
      reports: sanitizedReports
    });
  } catch (error) {
    console.error('Error fetching weather reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving weather reports'
    });
  }
});

/**
 * PATCH /api/weather-reports/:id/status
 * Protected by Firebase authentication + MongoDB admin role authorization.
 * Updates verification status of a report (pending | verified | rejected).
 */
router.patch('/:id/status', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format'
      });
    }

    // Validate status parameter (strictly pending | verified | rejected)
    if (!status || !['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, verified, or rejected.'
      });
    }

    const report = await WeatherReport.findByIdAndUpdate(
      id,
      { verificationStatus: status },
      { returnDocument: 'after' }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Weather report not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Report marked as ${status}`,
      report
    });
  } catch (error) {
    console.error('Error updating weather report status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating status'
    });
  }
});

export default router;

