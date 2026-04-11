/**
 * API Service Module for Air Quality Data
 *
 * This module handles fetching and transforming air quality data from the WAQI (World Air Quality Index) API.
 * It provides functions to fetch data by city, coordinates, bounding box, and station IDs.
 * All data is transformed into a consistent format for use in the application.
 */

// API Configuration
// Contains settings for API endpoints, authentication, and update intervals
const API_CONFIG = {
  google: {
    enabled: true, // Enable Google API usage
  },
  updateInterval: 600000, // Data refresh interval in milliseconds ( 10 minutes)
};

/**
 * Get AQI category based on AQI value
 * Uses US EPA AQI standard classification 
 */
function getAQICategory(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

/**
 * Get emoji representation based on AQI value
 */
function getAQIEmoji(aqi) {
  if (aqi <= 50) return "😊";
  if (aqi <= 100) return "😐";
  if (aqi <= 150) return "😷";
  if (aqi <= 200) return "⚠️";
  return "🚨";
}

/**
 * Get health message based on AQI value
 */
function getHealthMessage(aqi) {
  if (aqi <= 50) return "Air quality is satisfactory.";
  if (aqi <= 100) return "Air quality is acceptable for most people.";
  if (aqi <= 150)
    return "Members of sensitive groups may experience health effects.";
  if (aqi <= 200) return "Everyone may begin to experience health effects.";
  if (aqi <= 300) return "Health warnings of emergency conditions.";
  return "Everyone may experience serious health effects.";
}

/**
 * Main function to fetch air quality data from the backend
 * This includes forecast stations and map-only stations
 */
async function fetchAirQualityData() {
  try {
    const HOST =
      window.location.protocol + "//" + window.location.hostname + ":5050";
    const response = await fetch(`${HOST}/api/map-nodes`);

    if (!response.ok) {
      throw new Error(
        `Backend API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const results = [];

    data.forEach((station) => {
      if (station && station.lat && station.lng) {
        const aqi = parseInt(station.aqi) || 0;
        results.push({
          name: station.name,
          lat: parseFloat(station.lat),
          lng: parseFloat(station.lng),
          aqi: aqi,
          category: getAQICategory(aqi),
          emoji: getAQIEmoji(aqi),
          message: getHealthMessage(aqi),
          timestamp: station.timestamp || new Date().toISOString(),
        });
      }
    });

    return results.length > 0 ? results : null;
  } catch (error) {
    console.error("Error fetching map nodes from backend:", error);
    throw error;
  }
}
