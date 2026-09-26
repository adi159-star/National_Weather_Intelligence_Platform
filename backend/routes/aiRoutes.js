import express from 'express';
import mongoose from 'mongoose';
import WeatherReport from '../models/WeatherReport.js';
import { classifyWeatherText } from '../services/weatherClassifier.js';

const router = express.Router();

/**
 * POST /api/ai/classify/:id
 * Classifies an individual weather report by its MongoDB document ID.
 */
router.post('/classify/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID format'
      });
    }

    const report = await WeatherReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Weather report not found'
      });
    }

    const textToClassify = report.content?.text || report.description || '';
    const { classification, confidence } = classifyWeatherText(textToClassify);

    report.aiClassification = classification;
    report.aiConfidence = confidence;
    report.eventType = classification;

    await report.save();

    return res.status(200).json({
      success: true,
      message: 'Weather report classified successfully',
      report
    });
  } catch (error) {
    console.error('Error classifying weather report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while classifying report'
    });
  }
});

/**
 * POST /api/ai/classify-all
 * Batch classifies all weather reports that currently have aiClassification as null or missing.
 */
router.post('/classify-all', async (req, res) => {
  try {
    const unclassifiedReports = await WeatherReport.find({
      $or: [
        { aiClassification: null },
        { aiClassification: { $exists: false } }
      ]
    });

    let processed = 0;

    for (const report of unclassifiedReports) {
      const textToClassify = report.content?.text || report.description || '';
      const { classification, confidence } = classifyWeatherText(textToClassify);

      report.aiClassification = classification;
      report.aiConfidence = confidence;
      report.eventType = classification;

      await report.save();
      processed++;
    }

    return res.status(200).json({
      success: true,
      processed,
      message: `Successfully classified ${processed} reports`
    });
  } catch (error) {
    console.error('Error batch classifying reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during batch classification'
    });
  }
});

export default router;
