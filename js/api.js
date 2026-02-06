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

/**
 * Transform single WAQI data object to application format
 * Handles coordinate format variations (WAQI can return [lat,lng] or [lng,lat])
 */
function transformWAQIData(waqiData) {
    if (!waqiData) return null;

    const aqi = parseInt(waqiData.aqi || 0);
    const geo = waqiData.city?.geo || [];
    let lat, lng;

    // WAQI can return coordinates in different formats
    // Check if first value is > 80 or < 80 
    if (geo.length >= 2) {
        const first = parseFloat(geo[0]);
        const second = parseFloat(geo[1]);
        // For Nepal: longitude is ~85, latitude is ~27
        if (first > 80) {
            // GeoJSON format: [lng, lat]
            lng = first;
            lat = second;
        } else {
            // Standard format: [lat, lng]
            lat = first;
            lng = second;
        }
    } else {
        lat = 0;
        lng = 0;
    }

    // Extract city name 
    const cityName = waqiData.city?.name || 'Unknown';
    const nameMatch = cityName.match(/^([^(]+)/);
    const name = nameMatch ? nameMatch[1].trim() : cityName;

    // Extract PM2.5 and PM10 from iaqi 
    const pm25 = waqiData.iaqi?.pm25?.v || 0;
    const pm10 = waqiData.iaqi?.pm10?.v || 0;

    return {
        name: name,
        nepali: '',
        lat: lat,
        lng: lng,
        aqi: aqi,
        category: getAQICategory(aqi),
        emoji: getAQIEmoji(aqi),
        message: getHealthMessage(aqi),
        timestamp: waqiData.time?.iso || new Date().toISOString(),
        pm25: pm25,
        pm10: pm10,
        rawData: waqiData  // Store raw data for detailed view
    };
}

/**
 * Transform array of WAQI station data to application format
 * Handles multiple coordinate format variations and filters invalid stations
 */
function transformWAQIStations(stations) {
    if (!Array.isArray(stations)) return [];

    return stations
        .filter(station => station)  // Remove null/undefined entries
        .map(station => {
            // handle string values like "-", "N/A", or empty strings
            let aqi = 0;
            if (station.aqi !== undefined && station.aqi !== null) {
                if (station.aqi === "-" || station.aqi === "" || station.aqi === "N/A") {
                    aqi = 0;  // No data available
                } else {
                    aqi = parseInt(station.aqi) || 0;
                }
            }

            // Extract coordinates
            let lat = 0;
            let lng = 0;

            // Format 1: Direct lat/lon properties 
            if (station.lat !== undefined && (station.lon !== undefined || station.lng !== undefined)) {
                lat = parseFloat(station.lat);
                lng = parseFloat(station.lon || station.lng);
            }
            // Format 2: Geo array [lng, lat] GeoJSON format (longitude first)
            else if (Array.isArray(station.geo) && station.geo.length >= 2) {
                lng = parseFloat(station.geo[0]);
                lat = parseFloat(station.geo[1]);
            }
            // Format 3: UID format "geo:lat;lng" 
            else if (station.uid && typeof station.uid === 'string' && station.uid.startsWith('geo:')) {
                const geoMatch = station.uid.match(/geo:([\d.]+);([\d.]+)/);
                if (geoMatch) {
                    lat = parseFloat(geoMatch[1]);
                    lng = parseFloat(geoMatch[2]);
                }
            }
            // Format 4: Nested station.geo array [lng, lat]
            else if (station.station?.geo && Array.isArray(station.station.geo)) {
                lng = parseFloat(station.station.geo[0]);
                lat = parseFloat(station.station.geo[1]);
            }

            const stationName = station.station?.name || station.name || 'Air Quality Station';

            // Filter out stations with invalid coordinates
            if (!lat || !lng || lat === 0 || lng === 0 || isNaN(lat) || isNaN(lng)) {
                return null;
            }

            // Extract PM2.5 and PM10 from station data
            const pm25 = station.iaqi?.pm25?.v || station.station?.iaqi?.pm25?.v || 0;
            const pm10 = station.iaqi?.pm10?.v || station.station?.iaqi?.pm10?.v || 0;

            return {
                name: stationName,
                nepali: '',
                lat: lat,
                lng: lng,
                aqi: aqi,
                category: aqi > 0 ? getAQICategory(aqi) : 'No Data',
                emoji: aqi > 0 ? getAQIEmoji(aqi) : '📊',
                message: aqi > 0 ? getHealthMessage(aqi) : 'No recent data available for this station.',
                timestamp: station.time?.iso || station.time?.s || station.station?.time || new Date().toISOString(),
                pm25: pm25,
                pm10: pm10,
                rawData: station  // Store raw data for detailed view
            };
        })
        .filter(station => station !== null);  // Remove any null entries
}

/**
 * Fetch air quality data from WAQI API by station ID
 * Station IDs are numeric identifiers for specific monitoring stations
 */
async function fetchWAQIByStationId(stationId) {
    try {
        const token = API_CONFIG.waqi.token;
        // WAQI station format: @stationId
        const url = `${API_CONFIG.waqi.baseURL}/feed/@${stationId}/?token=${token}`;
        const response = await fetch(url, { method: 'GET', mode: 'cors' });

        if (!response.ok) {
            return null;
        }

        const result = await response.json();

        if (result.status === 'ok' && result.data) {
            return result.data;
        }

        return null;
    } catch (error) {
        return null;  // Silently return null for unavailable stations
    }
}

