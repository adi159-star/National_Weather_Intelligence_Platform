import express from 'express';
import WeatherReport from '../models/WeatherReport.js';
import { processWeatherReport } from '../services/processWeatherReport.js';

const router = express.Router();

/**
 * Maps WMO Weather interpretation codes to human-readable descriptions.
 * Reference: Open-Meteo / WMO weather interpretation codes.
 */
const getWeatherCondition = (code) => {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return map[code] || 'Weather observation';
};

/**
 * GET /api/weather-api/current
 * Fetches real-time weather from Open-Meteo and stores it in MongoDB as a WeatherReport document.
 * Query Parameters:
 *   - city: string (required)
 *   - state: string (required)
 *   - latitude: number between -90 and 90 (required)
 *   - longitude: number between -180 and 180 (required)
 */
router.get('/current', async (req, res) => {
  const { city, state, latitude, longitude } = req.query;

  // Validation
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

  if (latitude === undefined || latitude === null || latitude === '') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: latitude is required'
    });
  }

  const parsedLatitude = Number(latitude);
  if (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: latitude must be a valid number between -90 and 90'
    });
  }

  if (longitude === undefined || longitude === null || longitude === '') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: longitude is required'
    });
  }

  const parsedLongitude = Number(longitude);
  if (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: longitude must be a valid number between -180 and 180'
    });
  }

  console.log('[Weather API] Request received');
  console.log(`[Weather API] Coordinates: ${parsedLatitude}, ${parsedLongitude}`);

  // Task 2: Call Open-Meteo
  let weatherData;
  try {
    const openMeteoUrl = new URL('https://api.open-meteo.com/v1/forecast');
    openMeteoUrl.searchParams.set('latitude', parsedLatitude.toString());
    openMeteoUrl.searchParams.set('longitude', parsedLongitude.toString());
    openMeteoUrl.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m'
    );

    const response = await fetch(openMeteoUrl.toString(), {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Open-Meteo API returned status ${response.status}:`, errText);
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch weather data from external provider (Open-Meteo)'
      });
    }

    weatherData = await response.json();
    console.log('[Weather API] Open-Meteo request succeeded');
  } catch (apiError) {
    console.error('Error connecting to Open-Meteo API:', apiError);
    return res.status(502).json({
      success: false,
      message: 'Bad gateway: Unable to connect to Open-Meteo weather service'
    });
  }

  // Task 3 & 4: Normalize response and save to MongoDB
  try {
    const current = weatherData.current || {};
    const units = weatherData.current_units || {};

    const condition = getWeatherCondition(current.weather_code);
    const temp = current.temperature_2m !== undefined ? `${current.temperature_2m}${units.temperature_2m || '°C'}` : 'N/A';
    const humidity = current.relative_humidity_2m !== undefined ? `${current.relative_humidity_2m}${units.relative_humidity_2m || '%'}` : 'N/A';
    const windSpeed = current.wind_speed_10m !== undefined ? `${current.wind_speed_10m} ${units.wind_speed_10m || 'km/h'}` : 'N/A';
    const precipitation = current.precipitation !== undefined ? `${current.precipitation} ${units.precipitation || 'mm'}` : '0 mm';

    const summary = `${condition}, Temperature: ${temp}, Humidity: ${humidity}, Wind Speed: ${windSpeed}, Precipitation: ${precipitation}`;

    // Observation time from Open-Meteo or fallback to current timestamp
    let reportedAt = new Date();
    if (current.time) {
      const parsedTime = new Date(current.time);
      if (!isNaN(parsedTime.getTime())) {
        reportedAt = parsedTime;
      }
    }

    console.log('[Weather API] MongoDB save started');
    const report = await WeatherReport.create({
      userId: null,
      userName: 'Weather API',
      userEmail: '',
      sourceType: 'weather_api',
      sourceName: 'Open-Meteo',
      sourceId: null,
      eventType: 'weather_observation',
      description: summary,
      content: {
        text: summary,
        mediaUrl: ''
      },
      city: city.trim(),
      state: state.trim(),
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      reportedAt,
      verificationStatus: 'pending',
      aiClassification: null,
      aiConfidence: null,
      isDuplicate: false
    });

    console.log('[Weather API] MongoDB save succeeded');
    console.log(`[Weather API] Saved report ID: ${report._id}`);

    // Run automatic AI classification and duplicate detection pipeline
    const processedReport = await processWeatherReport(report);

    return res.status(200).json({
      success: true,
      message: 'Weather data fetched and stored successfully',
      report: processedReport
    });
  } catch (dbError) {
    console.error('Error saving weather data to MongoDB:', dbError);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: Failed to store weather report in database'
    });
  }
});

export default router;
