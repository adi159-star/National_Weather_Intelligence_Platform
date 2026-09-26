import express from 'express';
import WeatherReport from '../models/WeatherReport.js';
import { processWeatherReport } from '../services/processWeatherReport.js';

const router = express.Router();

/**
 * POST /api/social-data
 * Ingests external social-media or public weather dataset reports.
 * Expected JSON payload:
 * {
 *   "sourceType": "social" | "public_dataset" (optional, default: "social"),
 *   "sourceName": string (optional),
 *   "sourceId": string (optional),
 *   "text": string (required),
 *   "city": string (required),
 *   "state": string (required),
 *   "latitude": number (optional),
 *   "longitude": number (optional)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      sourceType: rawSourceType,
      sourceName: rawSourceName,
      sourceId: rawSourceId,
      text,
      city,
      state,
      latitude,
      longitude
    } = req.body || {};

    // 1. Validate and resolve sourceType
    let resolvedSourceType = 'social';
    if (rawSourceType !== undefined && rawSourceType !== null && rawSourceType !== '') {
      if (typeof rawSourceType !== 'string' || !['social', 'public_dataset'].includes(rawSourceType.trim())) {
        return res.status(400).json({
          success: false,
          message: "Validation error: sourceType must be either 'social' or 'public_dataset'"
        });
      }
      resolvedSourceType = rawSourceType.trim();
    }

    // 2. Validate required string fields
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: text is required and must be a non-empty string'
      });
    }

    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: city is required and must be a non-empty string'
      });
    }

    if (!state || typeof state !== 'string' || !state.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: state is required and must be a non-empty string'
      });
    }

    // 3. Validate coordinates (optional, but must be valid numbers if provided)
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

    // 4. Resolve sourceName default based on sourceType
    let resolvedSourceName;
    if (typeof rawSourceName === 'string' && rawSourceName.trim()) {
      resolvedSourceName = rawSourceName.trim();
    } else {
      resolvedSourceName = resolvedSourceType === 'public_dataset'
        ? 'Public Weather Dataset'
        : 'Social Media Feed';
    }

    const resolvedSourceId = (typeof rawSourceId === 'string' && rawSourceId.trim())
      ? rawSourceId.trim()
      : null;

    const trimmedText = text.trim();

    // 5. Create document in existing WeatherReport collection
    const report = await WeatherReport.create({
      userId: null,
      userName: 'External Source',
      userEmail: '',
      sourceType: resolvedSourceType,
      sourceName: resolvedSourceName,
      sourceId: resolvedSourceId,
      eventType: 'unclassified',
      description: trimmedText,
      content: {
        text: trimmedText,
        mediaUrl: ''
      },
      city: city.trim(),
      state: state.trim(),
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
      message: 'External weather data ingested successfully',
      report: processedReport
    });
  } catch (error) {
    console.error('Error ingesting external weather data:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while ingesting external weather data'
    });
  }
});

export default router;
