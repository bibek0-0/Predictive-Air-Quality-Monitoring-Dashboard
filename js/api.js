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
