package com.smc.svms.service;

import com.smc.svms.util.IPGeolocationUtil;
import com.smc.svms.util.IPGeolocationUtil.LocationResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for enhanced location detection using multiple methods
 * Acts as fallback when client-side GPS fails
 */
@Service
@RequiredArgsConstructor
public class LocationService {

    private final IPGeolocationUtil ipGeolocationUtil;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.google.geolocation.api-key:}")
    private String googleApiKey;

    @Value("${app.google.geolocation.enabled:false}")
    private boolean googleGeolocationEnabled;

    /**
     * Get location from client IP address (server-side fallback)
     * @return Location data with coordinates and accuracy
     */
    public Map<String, Object> getLocationFromClientIP(String clientIP) {
        LocationResult result = ipGeolocationUtil.getLocationFromIP();

        if (result != null) {
            Map<String, Object> response = new HashMap<>();
            response.put("latitude", result.latitude);
            response.put("longitude", result.longitude);
            response.put("accuracy", result.accuracy);
            response.put("city", result.city);
            response.put("country", result.country);
            response.put("method", "IP_GEOLOCATION");
            response.put("note", "IP-based location (city-level accuracy ~5km)");
            return response;
        }

        return null;
    }

    /**
     * Use Google Geolocation API for enhanced location
     * Requires Wi-Fi/cell tower data from client
     * @param wifiAccessPoints List of nearby Wi-Fi access points
     * @param cellTowers List of nearby cell towers
     * @return Location data
     */
    public Map<String, Object> getGoogleGeolocation(
            Object wifiAccessPoints,
            Object cellTowers) {

        if (!googleGeolocationEnabled || googleApiKey == null || googleApiKey.isEmpty()) {
            return null;
        }

        try {
            String url = "https://www.googleapis.com/geolocation/v1/geolocate?key=" + googleApiKey;

            Map<String, Object> requestBody = new HashMap<>();
            if (wifiAccessPoints != null) {
                requestBody.put("wifiAccessPoints", wifiAccessPoints);
            }
            if (cellTowers != null) {
                requestBody.put("cellTowers", cellTowers);
            }

            Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);

            if (response != null && response.containsKey("location")) {
                Map<String, Object> location = (Map<String, Object>) response.get("location");
                Map<String, Object> result = new HashMap<>();
                result.put("latitude", location.get("lat"));
                result.put("longitude", location.get("lng"));
                result.put("accuracy", response.get("accuracy"));
                result.put("method", "GOOGLE_GEOLOCATION");
                result.put("note", "Google Geolocation API (Wi-Fi/Cell tower based)");
                return result;
            }

        } catch (Exception e) {
            System.err.println("Google Geolocation API failed: " + e.getMessage());
        }

        return null;
    }

    /**
     * Get best available location using all available methods
     * @param clientIP Client IP address
     * @param wifiData Optional Wi-Fi data from client
     * @param cellData Optional cell tower data from client
     * @return Best available location
     */
    public Map<String, Object> getBestLocation(String clientIP, Object wifiData, Object cellData) {
        // Try Google Geolocation first if enabled and data available
        if (googleGeolocationEnabled && (wifiData != null || cellData != null)) {
            Map<String, Object> googleLoc = getGoogleGeolocation(wifiData, cellData);
            if (googleLoc != null) {
                return googleLoc;
            }
        }

        // Fallback to IP geolocation
        if (clientIP != null) {
            Map<String, Object> ipLoc = getLocationFromClientIP(clientIP);
            if (ipLoc != null) {
                return ipLoc;
            }
        }

        return null;
    }
}
