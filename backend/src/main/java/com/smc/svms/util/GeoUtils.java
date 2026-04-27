package com.smc.svms.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;

public class GeoUtils {

    private static final double EARTH_RADIUS = 6371000; // in meters

    /**
     * Calculates the distance between two points in meters using Haversine formula.
     */
    public static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS * c;
    }

    /**
     * Checks if a point is inside a polygon using ray-casting algorithm.
     * @param lat Latitude of the point
     * @param lon Longitude of the point
     * @param polygonJson JSON string containing polygon coordinates
     * @return true if point is inside polygon, false otherwise
     */
    public static boolean isPointInPolygon(double lat, double lon, String polygonJson) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Double>> points = mapper.readValue(polygonJson, new TypeReference<List<Map<String, Double>>>() {});
            
            int n = points.size();
            if (n < 3) return false;
            
            boolean inside = false;
            for (int i = 0, j = n - 1; i < n; j = i++) {
                double xi = points.get(i).get("lat");
                double yi = points.get(i).get("lng");
                double xj = points.get(j).get("lat");
                double yj = points.get(j).get("lng");
                
                boolean intersect = ((yi > lon) != (yj > lon)) &&
                    (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            
            return inside;
        } catch (Exception e) {
            // If parsing fails, assume point is outside
            return false;
        }
    }
}
