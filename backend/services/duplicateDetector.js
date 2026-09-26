/**
 * Duplicate Weather Report Detector
 * Identifies duplicate or near-duplicate meteorological reports using multi-factor comparison:
 * 1. Normalized Jaccard Word Similarity
 * 2. Haversine Geographic Distance / City-State Matching
 * 3. Temporal Proximity (reportedAt / createdAt delta)
 * 4. Weather Event Type Correlation
 */

const STOP_WORDS = new Set([
  'the', 'is', 'a', 'an', 'in', 'of', 'and', 'to', 'at', 'for', 'on', 'with', 'by', 'from', 'near', 'reported'
]);

/**
 * Normalizes text by lowercasing, stripping punctuation, extra whitespace, and common stop words.
 * @param {string} text 
 * @returns {string[]} array of normalized words
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return [];

  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Calculates Jaccard similarity score between two texts:
 * intersection(wordsA, wordsB) / union(wordsA, wordsB)
 * @param {string} textA 
 * @param {string} textB 
 * @returns {number} score between 0 and 1
 */
export function calculateTextSimilarity(textA, textB) {
  if (!textA || !textB) return 0;

  // Exact match fast-path
  if (textA.trim().toLowerCase() === textB.trim().toLowerCase()) {
    return 1.0;
  }

  const wordsA = new Set(normalizeText(textA));
  const wordsB = new Set(normalizeText(textB));

  if (wordsA.size === 0 || wordsB.size === 0) {
    return 0;
  }

  let intersectionCount = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      intersectionCount++;
    }
  }

  const unionSize = new Set([...wordsA, ...wordsB]).size;
  if (unionSize === 0) return 0;

  return Number((intersectionCount / unionSize).toFixed(2));
}

/**
 * Calculates geographic distance in kilometers using the Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in km
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates whether two reports are in the same or nearby geographical vicinity.
 * - If coordinates exist on both: distance <= 10 km.
 * - Otherwise: fallback to city and state string comparison.
 * @param {object} reportA 
 * @param {object} reportB 
 * @returns {boolean}
 */
export function areLocationsSimilar(reportA, reportB) {
  const hasCoordsA =
    reportA.latitude !== null &&
    reportA.latitude !== undefined &&
    reportA.longitude !== null &&
    reportA.longitude !== undefined;

  const hasCoordsB =
    reportB.latitude !== null &&
    reportB.latitude !== undefined &&
    reportB.longitude !== null &&
    reportB.longitude !== undefined;

  if (hasCoordsA && hasCoordsB) {
    const distanceKm = calculateHaversineDistance(
      reportA.latitude,
      reportA.longitude,
      reportB.latitude,
      reportB.longitude
    );
    return distanceKm <= 10;
  }

  // Fallback: compare city and state strings
  const cityA = (reportA.city || '').trim().toLowerCase();
  const cityB = (reportB.city || '').trim().toLowerCase();
  const stateA = (reportA.state || '').trim().toLowerCase();
  const stateB = (reportB.state || '').trim().toLowerCase();

  if (cityA && cityB && cityA === cityB) {
    if (stateA && stateB) {
      return stateA === stateB;
    }
    return true;
  }

  return false;
}

/**
 * Calculates absolute time difference in hours between two reports.
 * @param {object} reportA 
 * @param {object} reportB 
 * @returns {number} difference in hours
 */
export function getTimeDifferenceHours(reportA, reportB) {
  const timeA = new Date(reportA.reportedAt || reportA.createdAt || Date.now()).getTime();
  const timeB = new Date(reportB.reportedAt || reportB.createdAt || Date.now()).getTime();

  const diffMs = Math.abs(timeA - timeB);
  return diffMs / (1000 * 60 * 60);
}

/**
 * Compares two weather reports and decides if reportA is a duplicate of reportB.
 * @param {object} targetReport 
 * @param {object} candidateReport 
 * @returns {{ isDuplicate: boolean, duplicateOf: string|null, similarity: number }}
 */
export function evaluatePairDuplicate(targetReport, candidateReport) {
  const textA = targetReport.content?.text || targetReport.description || '';
  const textB = candidateReport.content?.text || candidateReport.description || '';

  const textSimilarity = calculateTextSimilarity(textA, textB);
  const locationSimilar = areLocationsSimilar(targetReport, candidateReport);
  const diffHours = getTimeDifferenceHours(targetReport, candidateReport);

  const sameEventType = Boolean(
    targetReport.eventType &&
      candidateReport.eventType &&
      targetReport.eventType !== 'unclassified' &&
      targetReport.eventType !== 'other' &&
      targetReport.eventType.toLowerCase() === candidateReport.eventType.toLowerCase()
  );

  // Condition 1:
  // textSimilarity >= 0.6 AND same/similar location AND within 2 hours
  const cond1 = textSimilarity >= 0.6 && locationSimilar && diffHours <= 2;

  // Condition 2:
  // same event type AND same/similar location AND within 1 hour AND textSimilarity >= 0.4
  const cond2 = sameEventType && locationSimilar && diffHours <= 1 && textSimilarity >= 0.4;

  if (cond1 || cond2) {
    return {
      isDuplicate: true,
      duplicateOf: candidateReport._id,
      similarity: textSimilarity
    };
  }

  return {
    isDuplicate: false,
    duplicateOf: null,
    similarity: textSimilarity
  };
}

/**
 * Evaluates a target report against an array of candidate reports,
 * returning the highest-confidence duplicate match if one exists.
 * @param {object} targetReport 
 * @param {object[]} candidates 
 * @returns {{ isDuplicate: boolean, duplicateOf: string|null, similarity: number }}
 */
export function findDuplicateInCandidates(targetReport, candidates) {
  let bestMatch = null;
  let highestSimilarity = 0;

  for (const candidate of candidates) {
    if (String(candidate._id) === String(targetReport._id)) {
      continue;
    }

    const result = evaluatePairDuplicate(targetReport, candidate);
    if (result.isDuplicate) {
      if (result.similarity > highestSimilarity || !bestMatch) {
        highestSimilarity = result.similarity;
        bestMatch = result;
      }
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  return {
    isDuplicate: false,
    duplicateOf: null,
    similarity: 0
  };
}

export default {
  normalizeText,
  calculateTextSimilarity,
  calculateHaversineDistance,
  areLocationsSimilar,
  getTimeDifferenceHours,
  evaluatePairDuplicate,
  findDuplicateInCandidates
};
