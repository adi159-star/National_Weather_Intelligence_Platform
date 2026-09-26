import express from 'express';
import WeatherReport from '../models/WeatherReport.js';

const router = express.Router();

/**
 * GET /api/analytics/summary
 * Aggregate metrics across all weather data streams:
 * totalReports, citizenReports, weatherApiReports, socialReports, publicDatasetReports,
 * verifiedReports, pendingReports, rejectedReports, duplicateReports.
 */
router.get('/summary', async (req, res) => {
  try {
    const [summaryResult] = await WeatherReport.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          citizen: [{ $match: { sourceType: 'citizen' } }, { $count: 'count' }],
          weatherApi: [{ $match: { sourceType: 'weather_api' } }, { $count: 'count' }],
          social: [{ $match: { sourceType: 'social' } }, { $count: 'count' }],
          publicDataset: [{ $match: { sourceType: 'public_dataset' } }, { $count: 'count' }],
          verified: [{ $match: { verificationStatus: 'verified' } }, { $count: 'count' }],
          pending: [{ $match: { verificationStatus: 'pending' } }, { $count: 'count' }],
          rejected: [{ $match: { verificationStatus: 'rejected' } }, { $count: 'count' }],
          duplicate: [{ $match: { isDuplicate: true } }, { $count: 'count' }]
        }
      }
    ]);

    const summary = {
      totalReports: summaryResult?.total[0]?.count || 0,
      citizenReports: summaryResult?.citizen[0]?.count || 0,
      weatherApiReports: summaryResult?.weatherApi[0]?.count || 0,
      socialReports: summaryResult?.social[0]?.count || 0,
      publicDatasetReports: summaryResult?.publicDataset[0]?.count || 0,
      verifiedReports: summaryResult?.verified[0]?.count || 0,
      pendingReports: summaryResult?.pending[0]?.count || 0,
      rejectedReports: summaryResult?.rejected[0]?.count || 0,
      duplicateReports: summaryResult?.duplicate[0]?.count || 0
    };

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics summary'
    });
  }
});

/**
 * GET /api/analytics/events
 * Aggregates reports by eventType sorted descending by frequency.
 */
router.get('/events', async (req, res) => {
  try {
    const events = await WeatherReport.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$eventType', 'other'] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          eventType: '$_id',
          count: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve event statistics'
    });
  }
});

/**
 * GET /api/analytics/sources
 * Aggregates reports grouped by sourceType (citizen, weather_api, social, public_dataset).
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = await WeatherReport.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$sourceType', 'citizen'] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          sourceType: '$_id',
          count: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      sources
    });
  } catch (error) {
    console.error('Error fetching source analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve source statistics'
    });
  }
});

/**
 * GET /api/analytics/locations
 * Aggregates reports grouped by state with city breakdown.
 */
router.get('/locations', async (req, res) => {
  try {
    const rawLocations = await WeatherReport.aggregate([
      {
        $match: {
          state: { $ne: '', $ne: null }
        }
      },
      {
        $project: {
          normalizedState: {
            $trim: { input: '$state' }
          },
          city: '$city'
        }
      },
      {
        $group: {
          _id: { $toLower: '$normalizedState' },
          sampleName: { $first: '$normalizedState' },
          count: { $sum: 1 },
          cities: { $addToSet: '$city' }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          state: '$sampleName',
          count: 1,
          cities: {
            $filter: {
              input: '$cities',
              as: 'c',
              cond: { $and: [{ $ne: ['$$c', ''] }, { $ne: ['$$c', null] }] }
            }
          }
        }
      }
    ]);

    const locations = rawLocations.map((loc) => ({
      ...loc,
      state: loc.state
        ? loc.state
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
        : 'Unknown'
    }));

    return res.status(200).json({
      success: true,
      locations
    });
  } catch (error) {
    console.error('Error fetching location analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve location statistics'
    });
  }
});

/**
 * GET /api/analytics/trends
 * Aggregates report volumes grouped chronologically by date.
 */
router.get('/trends', async (req, res) => {
  try {
    const trends = await WeatherReport.aggregate([
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $ifNull: ['$reportedAt', '$createdAt'] }
            }
          }
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Error fetching trend analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve trend statistics'
    });
  }
});

/**
 * GET /api/analytics/map
 * Delivers geo-spatial weather reports for interactive GIS map visualization.
 * Only returns records with valid latitude and longitude.
 * Strictly excludes private identity tokens or sensitive user credentials.
 */
router.get('/map', async (req, res) => {
  try {
    const reports = await WeatherReport.find({
      latitude: { $ne: null, $gte: -90, $lte: 90 },
      longitude: { $ne: null, $gte: -180, $lte: 180 }
    })
      .select('_id eventType aiClassification aiConfidence city state latitude longitude verificationStatus isDuplicate sourceType reportedAt createdAt description')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Error fetching map data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve map geospatial reports'
    });
  }
});

export default router;
