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
    waqi: {
        baseURL: 'https://api.waqi.info',  // WAQI API base URL
        token: 'c5bc29e77f6d4cf5d13513dcb27b9dbe6f8967e9',  // API authentication token
        enabled: true  // Enable/disable WAQI API usage
    },
    updateInterval: 60000  // Data refresh interval in milliseconds (60 seconds = 1 minute)
};

/**
 * Get AQI category based on AQI value
 * Uses US EPA AQI standard classification
 */
function getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

/**
 * Get emoji representation based on AQI value
 */
function getAQIEmoji(aqi) {
    if (aqi <= 50) return '😊';
    if (aqi <= 100) return '😐';
    if (aqi <= 150) return '😷';
    if (aqi <= 200) return '⚠️';
    return '🚨';
}

/**
 * Get health message based on AQI value
 */
function getHealthMessage(aqi) {
    if (aqi <= 50) return 'Air quality is satisfactory.';
    if (aqi <= 100) return 'Air quality is acceptable for most people.';
    if (aqi <= 150) return 'Members of sensitive groups may experience health effects.';
    if (aqi <= 200) return 'Everyone may begin to experience health effects.';
    if (aqi <= 300) return 'Health warnings of emergency conditions.';
    return 'Everyone may experience serious health effects.';
}

