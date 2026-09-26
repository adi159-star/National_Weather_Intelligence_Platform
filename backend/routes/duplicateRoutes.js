import express from 'express';
import mongoose from 'mongoose';
import WeatherReport from '../models/WeatherReport.js';
import { findDuplicateInCandidates, evaluatePairDuplicate } from '../services/duplicateDetector.js';

const router = express.Router();

/**
 * POST /api/duplicates/check/:id
 * Evaluates duplicate status of a single report against all other reports in MongoDB.
 */
router.post('/check/:id', async (req, res) => {
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

    // Query candidate reports excluding this report
    const candidates = await WeatherReport.find({
      _id: { $ne: report._id }
    }).lean();

    const result = findDuplicateInCandidates(report, candidates);

    report.isDuplicate = result.isDuplicate;
    report.duplicateOf = result.duplicateOf;
    report.similarityScore = result.similarity;

    await report.save();

    return res.status(200).json({
      success: true,
      isDuplicate: result.isDuplicate,
      duplicateOf: result.duplicateOf,
      similarityScore: result.similarity,
      report
    });
  } catch (error) {
    console.error('Error checking duplicate report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while evaluating duplicate status'
    });
  }
});

/**
 * POST /api/duplicates/check-all
 * Evaluates duplicate status across all weather reports.
 * Processes reports in chronological order so earlier reports serve as primary reference.
 */
router.post('/check-all', async (req, res) => {
  try {
    // Retrieve all reports sorted chronologically
    const allReports = await WeatherReport.find()
      .sort({ reportedAt: 1, createdAt: 1 });

    let processed = 0;
    let duplicatesFound = 0;
    const duplicateSummaries = [];

    // Prior reports act as historical reference set
    const referenceReports = [];

    for (const report of allReports) {
      processed++;

      // Check against earlier processed reports
      const result = findDuplicateInCandidates(report, referenceReports);

      if (result.isDuplicate) {
        duplicatesFound++;
        report.isDuplicate = true;
        report.duplicateOf = result.duplicateOf;
        report.similarityScore = result.similarity;

        await report.save();

        duplicateSummaries.push({
          reportId: report._id,
          duplicateOf: result.duplicateOf,
          similarityScore: result.similarity,
          eventType: report.eventType,
          city: report.city
        });
      } else {
        // Not a duplicate - reset/ensure fields
        if (report.isDuplicate || report.duplicateOf) {
          report.isDuplicate = false;
          report.duplicateOf = null;
          report.similarityScore = 0;
          await report.save();
        }
        // Only non-duplicate reports serve as reference candidates for subsequent reports
        referenceReports.push(report);
      }
    }

    return res.status(200).json({
      success: true,
      processed,
      duplicatesFound,
      duplicateReports: duplicateSummaries
    });
  } catch (error) {
    console.error('Error running batch duplicate check:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during batch duplicate check'
    });
  }
});

export default router;
