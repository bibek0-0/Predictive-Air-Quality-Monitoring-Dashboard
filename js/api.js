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

/**
 * Fetch air quality data from WAQI API for a specific city
 */
async function fetchWAQICityFeed(city = 'kathmandu') {
    try {
        const token = API_CONFIG.waqi.token;
        const url = `${API_CONFIG.waqi.baseURL}/feed/${city}/?token=${token}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`WAQI API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Handle different API response statuses
        if (result.status === 'error') {
            throw new Error(`WAQI API error: ${result.data || 'Unknown error'}`);
        }

        if (result.status === 'nope') {
            throw new Error('No data available for this city');
        }

        if (result.status !== 'ok' || !result.data) {
            throw new Error(`Invalid response from WAQI API. Status: ${result.status}`);
        }

        return result.data;
    } catch (error) {
        console.error(`Error fetching WAQI city feed for ${city}:`, error);
        throw error;
    }
}

/**
 * Fetch air quality data from WAQI API by geographic coordinates
 */
async function fetchWAQIByCoordinates(lat, lng) {
    try {
        const token = API_CONFIG.waqi.token;
        // WAQI uses format
        const url = `${API_CONFIG.waqi.baseURL}/feed/geo:${lat};${lng}/?token=${token}`;
        const response = await fetch(url, { method: 'GET', mode: 'cors' });

        if (!response.ok) {
            throw new Error(`WAQI API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status === 'error') {
            throw new Error(`WAQI API error: ${result.data || 'Unknown error'}`);
        }

        // "nope" status means no station at this location return null
        if (result.status === 'nope') {
            return null;
        }

        if (result.status !== 'ok' || !result.data) {
            throw new Error(`Invalid response from WAQI API. Status: ${result.status}`);
        }

        return result.data;
    } catch (error) {
        console.error(`Error fetching WAQI by coordinates (${lat}, ${lng}):`, error);
        throw error;
    }
}

/**
 * Fetch multiple air quality stations within a bounding box
 * Uses WAQI map/bounds endpoint to get all stations in a geographic area
 */
async function fetchWAQIStationsByBounds(lat1, lng1, lat2, lng2) {
    try {
        const token = API_CONFIG.waqi.token;
        // WAQI bounds format
        const url = `${API_CONFIG.waqi.baseURL}/map/bounds/?latlng=${lat1},${lng1},${lat2},${lng2}&token=${token}`;
        const response = await fetch(url, { method: 'GET', mode: 'cors' });

        if (!response.ok) {
            throw new Error(`WAQI API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status === 'error') {
            throw new Error(`WAQI API error: ${result.data || 'Unknown error'}`);
        }

        // "nope" status means no stations in this area 
        if (result.status === 'nope') {
            return [];
        }

        if (result.status !== 'ok' || !result.data) {
            throw new Error(`Invalid response from WAQI API. Status: ${result.status}`);
        }

        // Ensure data is an array 
        if (!Array.isArray(result.data)) {
            return [];
        }

        return result.data;
    } catch (error) {
        console.error(`Error fetching WAQI stations by bounds:`, error);
        throw error;
    }
}

