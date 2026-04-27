package com.smc.svms.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

/**
 * Utility for reverse geocoding - converting coordinates to address/city
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
@Component
public class ReverseGeocodingUtil {

    private static final String NOMINATIM_API = "https://nominatim.openstreetmap.org/reverse";
    private static final String USER_AGENT = "SMC-StreetVendor-System/1.0";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get city name from coordinates
     * @param latitude Latitude
     * @param longitude Longitude
     * @return City name or null if unable to determine
     */
    public String getCityFromCoordinates(double latitude, double longitude) {
        try {
            String encodedLat = URLEncoder.encode(String.valueOf(latitude), "UTF-8");
            String encodedLon = URLEncoder.encode(String.valueOf(longitude), "UTF-8");
            
            String urlString = String.format("%s?format=json&lat=%s&lon=%s&zoom=10", 
                    NOMINATIM_API, encodedLat, encodedLon);
            
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", USER_AGENT);
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
            
            // Try to get city from various possible fields
            JsonNode addressNode = root.path("address");
            String city = null;
            
            if (addressNode.has("city")) {
                city = addressNode.get("city").asText();
            } else if (addressNode.has("town")) {
                city = addressNode.get("town").asText();
            } else if (addressNode.has("village")) {
                city = addressNode.get("village").asText();
            } else if (addressNode.has("county")) {
                city = addressNode.get("county").asText();
            } else if (addressNode.has("state_district")) {
                city = addressNode.get("state_district").asText();
            }
            
            return city;
            
        } catch (Exception e) {
            // Log error but don't fail the scan if geocoding fails
            System.err.println("Reverse geocoding failed: " + e.getMessage());
            return null;
        }
    }

    /**
     * Get full address from coordinates
     * @param latitude Latitude
     * @param longitude Longitude
     * @return Full address or null if unable to determine
     */
    public String getAddressFromCoordinates(double latitude, double longitude) {
        try {
            String encodedLat = URLEncoder.encode(String.valueOf(latitude), "UTF-8");
            String encodedLon = URLEncoder.encode(String.valueOf(longitude), "UTF-8");
            
            String urlString = String.format("%s?format=json&lat=%s&lon=%s&zoom=18", 
                    NOMINATIM_API, encodedLat, encodedLon);
            
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", USER_AGENT);
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
            return root.path("display_name").asText();
            
        } catch (Exception e) {
            System.err.println("Reverse geocoding failed: " + e.getMessage());
            return null;
        }
    }

    /**
     * Validate if coordinates are within expected city
     * @param latitude Latitude
     * @param longitude Longitude
     * @param expectedCity Expected city name (e.g., "Solapur")
     * @return true if coordinates match expected city
     */
    public boolean isValidCity(double latitude, double longitude, String expectedCity) {
        String detectedCity = getCityFromCoordinates(latitude, longitude);
        if (detectedCity == null) {
            // If geocoding fails, assume valid to not block legitimate scans
            return true;
        }
        
        // Case-insensitive comparison
        return detectedCity.toLowerCase().contains(expectedCity.toLowerCase());
    }
}
