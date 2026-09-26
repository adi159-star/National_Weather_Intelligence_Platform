/**
 * Weather Event AI Classifier (Lightweight Rule & Keyword Engine)
 * Classifies weather descriptions into standardized meteorological event categories
 * with associated confidence scores.
 *
 * Supported Categories:
 * - rainfall
 * - thunderstorm
 * - flooding
 * - heatwave
 * - fog
 * - dust_storm
 * - strong_wind
 * - snowfall
 * - cold_wave
 * - weather_observation
 * - other
 */

export function classifyWeatherText(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      classification: 'other',
      confidence: 0.50
    };
  }

  const normalized = text.toLowerCase();

  const categories = [
    {
      type: 'flooding',
      strong: [
        'waterlogging',
        'waterlogged',
        'water logged',
        'flash flood',
        'flooding',
        'inundation',
        'submerged'
      ],
      regular: ['flood', 'flooded']
    },
    {
      type: 'thunderstorm',
      strong: [
        'thunderstorm',
        'thunder storm',
        'lightning strike',
        'lightning',
        'thunder and lightning',
        'squall'
      ],
      regular: ['thunder']
    },
    {
      type: 'rainfall',
      strong: [
        'heavy rainfall',
        'heavy rain',
        'intense downpour',
        'downpour',
        'torrential rain',
        'cloudburst',
        'rain shower',
        'rain showers',
        'rainstorm',
        'rain storm',
        'precipitation'
      ],
      regular: ['rain', 'rainfall', 'raining', 'drizzle', 'shower', 'showers', 'rainy']
    },
    {
      type: 'heatwave',
      strong: [
        'heatwave',
        'heat wave',
        'extremely hot',
        'scorching',
        'severe heat',
        'sunstroke',
        'heat stroke'
      ],
      regular: ['very hot', 'sweltering', 'burning hot']
    },
    {
      type: 'fog',
      strong: [
        'dense fog',
        'heavy fog',
        'visibility low',
        'low visibility',
        'zero visibility',
        'smog'
      ],
      regular: ['fog', 'foggy', 'mist', 'misty', 'haze', 'hazy']
    },
    {
      type: 'dust_storm',
      strong: [
        'dust storm',
        'duststorm',
        'sand storm',
        'sandstorm',
        'severe dust'
      ],
      regular: ['dust', 'dusty']
    },
    {
      type: 'strong_wind',
      strong: [
        'strong wind',
        'strong winds',
        'high wind',
        'high winds',
        'storm wind',
        'gale force',
        'cyclonic wind',
        'gusty wind'
      ],
      regular: ['wind speed', 'wind gust', 'gust', 'gusts', 'gale', 'blustery']
    },
    {
      type: 'snowfall',
      strong: [
        'snowfall',
        'heavy snow',
        'blizzard',
        'snow storm',
        'snowstorm',
        'hailstorm'
      ],
      regular: ['snow', 'snowing', 'snowy', 'sleet', 'hail']
    },
    {
      type: 'cold_wave',
      strong: [
        'cold wave',
        'coldwave',
        'extremely cold',
        'severe cold',
        'sub-zero',
        'frost'
      ],
      regular: ['freezing cold', 'freezing temperature', 'freezing']
    },
    {
      type: 'weather_observation',
      strong: [
        'weather observation',
        'weather_observation',
        'temperature:',
        'humidity:',
        'precipitation: 0 mm'
      ],
      regular: ['overcast', 'partly cloudy', 'clear sky', 'mainly clear', 'cloudy']
    }
  ];

  let bestMatch = null;
  let highestScore = 0;

  for (const cat of categories) {
    let strongMatches = 0;
    let regularMatches = 0;

    for (const kw of cat.strong) {
      if (normalized.includes(kw)) {
        strongMatches++;
      }
    }

    for (const kw of cat.regular) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(normalized)) {
        regularMatches++;
      }
    }

    const totalMatches = strongMatches + regularMatches;
    if (totalMatches > 0) {
      // Weight strong multi-word phrases more heavily than generic single words
      const score = strongMatches * 3 + regularMatches * 1;
      if (score > highestScore) {
        highestScore = score;
        let confidence;
        if (strongMatches > 0 || totalMatches >= 2) {
          // Strong or multiple matches: confidence 0.85 - 0.95
          confidence = Math.min(0.88 + (totalMatches - 1) * 0.03, 0.95);
        } else {
          // Single weak/regular match: confidence 0.70 - 0.84
          confidence = 0.78;
        }
        bestMatch = {
          classification: cat.type,
          confidence: Number(confidence.toFixed(2))
        };
      }
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  return {
    classification: 'other',
    confidence: 0.50
  };
}

export default classifyWeatherText;
