import WeatherReport from '../models/WeatherReport.js';
import { classifyWeatherText } from './weatherClassifier.js';
import { findDuplicateInCandidates } from './duplicateDetector.js';

/**
 * Automates post-ingestion processing pipeline for weather reports:
 * 1. AI Event Classification (eventType, aiClassification, aiConfidence)
 * 2. Duplicate Detection (isDuplicate, duplicateOf, similarityScore)
 * 3. Persists updates to MongoDB
 *
 * Fault Tolerance:
 * If AI classification or duplicate detection encounters an unexpected error,
 * the original created report remains safely preserved in MongoDB and is returned
 * without failing or interrupting the ingestion API response.
 *
 * @param {import('mongoose').Document} report - The newly created WeatherReport document
 * @returns {Promise<import('mongoose').Document>} The updated WeatherReport document
 */
export async function processWeatherReport(report) {
  if (!report || !report._id) {
    return report;
  }

  try {
    const textToClassify = report.content?.text || report.description || '';

    // Step 1: Automatic AI Classification
    try {
      const { classification, confidence } = classifyWeatherText(textToClassify);
      report.eventType = classification;
      report.aiClassification = classification;
      report.aiConfidence = confidence;
    } catch (aiError) {
      console.error(`[Pipeline Error] AI classification failed for report ${report._id}:`, aiError);
    }

    // Step 2: Automatic Duplicate Detection (excluding the newly created report itself)
    try {
      const candidates = await WeatherReport.find({
        _id: { $ne: report._id }
      }).lean();

      const dupResult = findDuplicateInCandidates(report, candidates);
      report.isDuplicate = dupResult.isDuplicate;
      report.duplicateOf = dupResult.duplicateOf;
      report.similarityScore = dupResult.similarity;
    } catch (dupError) {
      console.error(`[Pipeline Error] Duplicate detection failed for report ${report._id}:`, dupError);
    }

    // Step 3: Persist pipeline enrichments
    await report.save();
  } catch (pipelineError) {
    console.error(`[Pipeline Error] Weather report pipeline failed for ${report._id}:`, pipelineError);
  }

  return report;
}

export default processWeatherReport;
