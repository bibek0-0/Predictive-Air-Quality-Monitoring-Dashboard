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

/**
 * Main function to fetch air quality data for all of Nepal
 * Uses multiple methods to maximize station coverage across the entire country:
 * 1. Known station IDs
 * 2. Bounding box searches covering all regions of Nepal
 * 3. Coordinate-based lookups for major cities across Nepal
 * 4. City feed as fallback
 */
async function fetchWAQINepalData() {
    try {
        const results = [];

        // Method 1: Fetch known station IDs
        const knownStationIds = ['9286'];

        for (const stationId of knownStationIds) {
            try {
                const stationData = await fetchWAQIByStationId(stationId);
                if (stationData) {
                    const transformed = transformWAQIData(stationData);
                    if (transformed && transformed.lat && transformed.lng) {
                        // Check for duplicates 
                        const exists = results.some(r =>
                            Math.abs(r.lat - transformed.lat) < 0.01 &&
                            Math.abs(r.lng - transformed.lng) < 0.01
                        );
                        if (!exists) {
                            results.push(transformed);
                        }
                    }
                }
            } catch (error) {
                // Silently skip unavailable stations
            }
        }

        // Method 2: Fetch stations within multiple bounding box areas covering all of Nepal
        // Nepal's approximate boundaries: 26.0°N to 30.5°N latitude, 80.0°E to 88.5°E longitude
        const boundsAreas = [
            // Western Nepal
            { name: 'Far Western', lat1: 28.5, lng1: 80.0, lat2: 30.5, lng2: 81.5 },
            { name: 'Mid Western', lat1: 28.0, lng1: 81.5, lat2: 29.5, lng2: 83.0 },
            // Central Nepal (Kathmandu Valley and surrounding)
            { name: 'Central Valley', lat1: 27.6, lng1: 85.2, lat2: 27.8, lng2: 85.5 },
            { name: 'Central North', lat1: 27.8, lng1: 84.0, lat2: 28.5, lng2: 85.5 },
            { name: 'Central South', lat1: 26.5, lng1: 84.0, lat2: 27.6, lng2: 85.5 },
            // Eastern Nepal
            { name: 'Eastern Terai', lat1: 26.0, lng1: 86.0, lat2: 27.0, lng2: 88.5 },
            { name: 'Eastern Hills', lat1: 27.0, lng1: 85.5, lat2: 28.0, lng2: 88.0 },
            // Additional coverage areas
            { name: 'Pokhara Region', lat1: 28.0, lng1: 83.5, lat2: 28.5, lng2: 84.5 },
            { name: 'Chitwan Region', lat1: 27.4, lng1: 84.0, lat2: 27.8, lng2: 85.0 },
            { name: 'Biratnagar Region', lat1: 26.3, lng1: 87.0, lat2: 26.6, lng2: 87.5 }
        ];

        for (const area of boundsAreas) {
            try {
                const stations = await fetchWAQIStationsByBounds(area.lat1, area.lng1, area.lat2, area.lng2);
                const transformedStations = transformWAQIStations(stations);

                transformedStations.forEach(station => {
                    if (station && station.lat && station.lng) {
                        // Handle stations with missing or invalid AQI
                        if (!station.aqi || station.aqi === 0 || isNaN(station.aqi)) {
                            station.aqi = 0;
                        }

                        // Check for duplicates before adding
                        const exists = results.some(r =>
                            Math.abs(r.lat - station.lat) < 0.01 &&
                            Math.abs(r.lng - station.lng) < 0.01
                        );
                        if (!exists) {
                            results.push(station);
                        }
                    }
                });
            } catch (error) {
                console.warn(`Could not fetch stations for ${area.name}:`, error.message);
            }
        }

        // Method 3: Fetch by coordinates for major cities across Nepal
        // Covers major urban centers and monitoring locations
        const locations = [
            // Kathmandu Valley
            { name: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
            { name: 'Lalitpur', lat: 27.6588, lng: 85.3244 },
            { name: 'Bhaktapur', lat: 27.6710, lng: 85.4298 },
            { name: 'Kirtipur', lat: 27.6750, lng: 85.2814 },
            { name: 'Thamel', lat: 27.7150, lng: 85.3120 },
            { name: 'Boudha', lat: 27.7214, lng: 85.3617 },
            { name: 'Patan', lat: 27.6766, lng: 85.3244 },
            // Western Nepal
            { name: 'Pokhara', lat: 28.2096, lng: 83.9856 },
            { name: 'Butwal', lat: 27.7000, lng: 83.4500 },
            { name: 'Nepalgunj', lat: 28.0500, lng: 81.6167 },
            { name: 'Dhangadhi', lat: 28.6833, lng: 80.6167 },
            // Central Nepal
            { name: 'Bharatpur', lat: 27.6783, lng: 84.4347 },
            { name: 'Hetauda', lat: 27.4283, lng: 85.0322 },
            { name: 'Birgunj', lat: 27.0000, lng: 84.8667 },
            // Eastern Nepal
            { name: 'Biratnagar', lat: 26.4525, lng: 87.2718 },
            { name: 'Janakpur', lat: 26.7288, lng: 85.9254 },
            { name: 'Dharan', lat: 26.8144, lng: 87.2844 },
            { name: 'Itahari', lat: 26.6667, lng: 87.2833 }
        ];

        for (const location of locations) {
            // Skip if we already have a station near this location
            const nearbyExists = results.some(r =>
                Math.abs(r.lat - location.lat) < 0.05 &&
                Math.abs(r.lng - location.lng) < 0.05
            );

            if (!nearbyExists) {
                try {
                    const coordData = await fetchWAQIByCoordinates(location.lat, location.lng);
                    if (coordData) {
                        const transformed = transformWAQIData(coordData);
                        if (transformed && transformed.lat && transformed.lng) {
                            transformed.name = location.name;  // Use our location name
                            results.push(transformed);
                        }
                    }
                } catch (error) {
                    console.warn(`Could not fetch data for ${location.name}:`, error.message);
                }
            }
        }

        // Method 4: Fallback to city feeds for major cities if no stations found
        if (results.length === 0) {
            const fallbackCities = ['kathmandu', 'pokhara', 'biratnagar'];
            for (const city of fallbackCities) {
                try {
                    const cityData = await fetchWAQICityFeed(city);
                    const transformed = transformWAQIData(cityData);
                    if (transformed && transformed.lat && transformed.lng) {
                        results.push(transformed);
                        break;  // Stop after first successful fetch
                    }
                } catch (error) {
                    console.warn(`Could not fetch ${city} city feed:`, error.message);
                }
            }
        }

        if (results.length > 0) {
            return results;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching WAQI Nepal data:', error);
        throw error;
    }
}

