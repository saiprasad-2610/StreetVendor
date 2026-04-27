package com.smc.svms.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Utility for IP-based geolocation as fallback when GPS fails
 * Uses free IP geolocation services (ip-api.com, ipinfo.io)
 */
@Component
public class IPGeolocationUtil {

    private static final String IP_API_URL = "http://ip-api.com/json/";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get location from IP address (fallback when GPS fails)
     * Note: IP geolocation is less accurate (city-level, ~50km radius)
     * @return Location with lat, lng, and accuracy (approximate)
     */
    public LocationResult getLocationFromIP() {
        try {
            URL url = new URL(IP_API_URL);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            int responseCode = connection.getResponseCode();
            if (responseCode != 200) {
                return null;
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();

            JsonNode root = objectMapper.readTree(response.toString());

            if (root.has("status") && root.get("status").asText().equals("success")) {
                double lat = root.get("lat").asDouble();
                double lng = root.get("lon").asDouble();
                String city = root.get("city").asText();
                String country = root.get("country").asText();

                // IP geolocation accuracy is roughly city-level
                // Estimate accuracy based on city size (conservative estimate)
                double estimatedAccuracy = 5000; // 5km as default

                return new LocationResult(lat, lng, estimatedAccuracy, city, country);
            }

        } catch (Exception e) {
            System.err.println("IP geolocation failed: " + e.getMessage());
        }

        return null;
    }

    public static class LocationResult {
        public final double latitude;
        public final double longitude;
        public final double accuracy; // in meters
        public final String city;
        public final String country;

        public LocationResult(double latitude, double longitude, double accuracy, String city, String country) {
            this.latitude = latitude;
            this.longitude = longitude;
            this.accuracy = accuracy;
            this.city = city;
            this.country = country;
        }
    }
}
