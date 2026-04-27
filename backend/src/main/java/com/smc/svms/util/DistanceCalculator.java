package com.smc.svms.util;

public class DistanceCalculator {
    
    private static final double EARTH_RADIUS = 6371000; // Earth's radius in meters
    
    /**
     * Calculate the distance between two GPS coordinates using the Haversine formula
     * @param lat1 Latitude of point 1 in degrees
     * @param lon1 Longitude of point 1 in degrees  
     * @param lat2 Latitude of point 2 in degrees
     * @param lon2 Longitude of point 2 in degrees
     * @return Distance in meters with high precision
     */
    public static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        // Convert latitude and longitude from degrees to radians
        double lat1Rad = Math.toRadians(lat1);
        double lon1Rad = Math.toRadians(lon1);
        double lat2Rad = Math.toRadians(lat2);
        double lon2Rad = Math.toRadians(lon2);
        
        // Differences
        double deltaLat = lat2Rad - lat1Rad;
        double deltaLon = lon2Rad - lon1Rad;
        
        // Haversine formula
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                   Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                   Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS * c; // Distance in meters
    }
    
    /**
     * Calculate distance between BigDecimal coordinates (for database values)
     * @param lat1 Latitude of point 1
     * @param lon1 Longitude of point 1
     * @param lat2 Latitude of point 2  
     * @param lon2 Longitude of point 2
     * @return Distance in meters
     */
    public static double calculateDistance(java.math.BigDecimal lat1, java.math.BigDecimal lon1, 
                                          java.math.BigDecimal lat2, java.math.BigDecimal lon2) {
        return calculateDistance(
            lat1.doubleValue(), 
            lon1.doubleValue(), 
            lat2.doubleValue(), 
            lon2.doubleValue()
        );
    }
    
    /**
     * Format distance for display with appropriate precision
     * @param distanceInMeters Distance in meters
     * @return Formatted distance string
     */
    public static String formatDistance(double distanceInMeters) {
        if (distanceInMeters < 1000) {
            return String.format("%.2f meters", distanceInMeters);
        } else {
            return String.format("%.3f km", distanceInMeters / 1000);
        }
    }
    
    /**
     * Get distance with decimal precision for calculations
     * @param distanceInMeters Distance in meters
     * @return Distance rounded to 2 decimal places
     */
    public static double getPreciseDistance(double distanceInMeters) {
        return Math.round(distanceInMeters * 100.0) / 100.0;
    }
}
