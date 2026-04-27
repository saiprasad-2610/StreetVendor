package com.smc.svms.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smc.svms.entity.*;
import com.smc.svms.enums.ZoneType;
import com.smc.svms.repository.*;
import com.smc.svms.dto.ZoneCapacityInfo;
import com.smc.svms.dto.LocationValidationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnhancedGeofencingService {

    private final ZoneRepository zoneRepository;
    private final VendorLocationRepository vendorLocationRepository;
    private final VendorRepository vendorRepository;
    private final ObjectMapper objectMapper;

    private static final double EARTH_RADIUS = 6371000; // meters

    /**
     * Check if vendor is within their assigned zone
     */
    public LocationValidationResult validateVendorLocation(Long vendorId, double latitude, double longitude) {
        
        try {
            // Get vendor's assigned location
            java.util.List<VendorLocation> vendorLocations = vendorLocationRepository.findByVendorId(vendorId);
            if (vendorLocations.isEmpty()) {
                LocationValidationResult result = new LocationValidationResult();
                result.setValid(false);
                result.setMessage("Vendor location not assigned");
                return result;
            }
            VendorLocation vendorLocation = vendorLocations.get(0);
            
            if (vendorLocation == null) {
                LocationValidationResult result = new LocationValidationResult();
                result.setValid(false);
                result.setMessage("Vendor location not assigned");
                return result;
            }
            
            Zone zone = vendorLocation.getZone();
            
            if (zone == null) {
                LocationValidationResult result = new LocationValidationResult();
                result.setValid(false);
                result.setMessage("Vendor not assigned to any zone");
                return result;
            }
            
            // Check zone type
            if (zone.getZoneType() == ZoneType.RESTRICTED) {
                LocationValidationResult result = new LocationValidationResult();
                result.setValid(false);
                result.setMessage("Vendor assigned to restricted zone");
                return result;
            }
            
            // Check time restrictions
            if (zone.hasTimeRestrictions() && !isWithinTimeRestrictions(zone)) {
                LocationValidationResult result = new LocationValidationResult();
                result.setValid(false);
                result.setMessage("Vendor not allowed at this time");
                return result;
            }
            
            // Validate location
            boolean isWithinZone = false;
            double distance = 0;
            
            if (zone.hasPolygon()) {
                // Use polygon validation
                isWithinZone = isPointInPolygon(latitude, longitude, zone.getPolygonCoordinatesJson());
            } else if (zone.getRadiusMeters() != null) {
                // Use existing radius validation (backward compatibility)
                distance = calculateHaversineDistance(
                    latitude, longitude,
                    zone.getLatitude().doubleValue(), 
                    zone.getLongitude().doubleValue()
                );
                isWithinZone = distance <= zone.getRadiusMeters();
            } else {
                LocationValidationResult result = new LocationValidationResult();
                result.setValid(false);
                result.setMessage("Zone has no valid boundaries");
                return result;
            }
            
            LocationValidationResult finalResult = new LocationValidationResult();
            finalResult.setValid(isWithinZone);
            finalResult.setDistance(distance);
            finalResult.setZoneName(zone.getName());
            finalResult.setZoneType(zone.getZoneType());
            finalResult.setZoneCategory(zone.getZoneCategory());
            finalResult.setMessage(isWithinZone ? "Vendor within assigned zone" : "Vendor outside assigned zone");
            return finalResult;
                
        } catch (Exception e) {
            LocationValidationResult result = new LocationValidationResult();
            result.setValid(false);
            result.setMessage("Error validating location");
            return result;
        }
    }
    
    /**
     * Check if point is within polygon using ray casting algorithm
     */
    private boolean isPointInPolygon(double latitude, double longitude, String polygonJson) {
        
        try {
            // Parse polygon coordinates
            List<Coordinate> polygon = parsePolygonCoordinates(polygonJson);
            
            if (polygon.size() < 3) {
                return false;
            }
            
            // Ray casting algorithm
            boolean inside = false;
            int intersections = 0;
            
            for (int i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
                
                Coordinate pi = polygon.get(i);
                Coordinate pj = polygon.get(j);
                
                if (((pi.getLatitude() <= latitude && latitude < pj.getLatitude()) ||
                     (pj.getLatitude() <= latitude && latitude < pi.getLatitude())) &&
                    (longitude < (pj.getLongitude() - pi.getLongitude()) * 
                     (latitude - pi.getLatitude()) / 
                     (pj.getLatitude() - pi.getLatitude()) + pi.getLongitude())) {
                    intersections++;
                }
            }
            
            return intersections % 2 == 1;
            
        } catch (Exception e) {
            // Error checking point in polygon
            return false;
        }
    }
    
    /**
     * Parse polygon coordinates from JSON
     */
    public List<Coordinate> parsePolygonCoordinates(String polygonJson) {
        
        try {
            return objectMapper.readValue(polygonJson, 
                new TypeReference<List<Coordinate>>(){});
        } catch (Exception e) {
            // Error parsing polygon coordinates
            return new ArrayList<>();
        }
    }
    
    /**
     * Check time restrictions
     */
    public boolean isWithinTimeRestrictions(Zone zone) {
        
        try {
            Map<String, Object> restrictions = objectMapper.readValue(
                zone.getTimeRestrictions(), 
                new TypeReference<Map<String, Object>>(){});
            
            LocalTime currentTime = LocalTime.now();
            DayOfWeek currentDay = LocalDate.now().getDayOfWeek();
            
            // Check if current day is allowed
            List<String> allowedDays = (List<String>) restrictions.get("allowedDays");
            if (allowedDays != null && !allowedDays.isEmpty()) {
                if (!allowedDays.contains(currentDay.name())) {
                    return false;
                }
            }
            
            // Check time range
            Map<String, Object> timeRange = (Map<String, Object>) restrictions.get("timeRange");
            if (timeRange != null) {
                String startTimeStr = (String) timeRange.get("start");
                String endTimeStr = (String) timeRange.get("end");
                
                if (startTimeStr != null && endTimeStr != null) {
                    LocalTime startTime = LocalTime.parse(startTimeStr);
                    LocalTime endTime = LocalTime.parse(endTimeStr);
                    
                    return !currentTime.isBefore(startTime) && !currentTime.isAfter(endTime);
                }
            }
            
            return true;
            
        } catch (Exception e) {
            // Error checking time restrictions
            return true; // Allow if restrictions are invalid
        }
    }
    
    /**
     * Calculate distance between two points (Haversine formula)
     */
    public double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS * c; // Distance in meters
    }
    
    /**
     * Get zone capacity information
     */
    @Cacheable(value = "zoneCapacity", key = "#zoneId")
    public ZoneCapacityInfo getZoneCapacity(Long zoneId) {
        
        Zone zone = zoneRepository.findById(zoneId)
            .orElseThrow(() -> new RuntimeException("Zone not found"));
        
        if (!zone.hasCapacityLimit()) {
            return ZoneCapacityInfo.builder()
                .zoneId(zoneId)
                .zoneName(zone.getName())
                .currentVendors(0)
                .maxVendors(null)
                .utilizationRate(0.0)
                .isFull(false)
                .build();
        }
        
        int currentVendors = vendorRepository.countByZoneId(zoneId);
        int maxVendors = zone.getMaxVendors();
        double utilizationRate = maxVendors > 0 ? (double) currentVendors / maxVendors : 0.0;
        
        return ZoneCapacityInfo.builder()
            .zoneId(zoneId)
            .zoneName(zone.getName())
            .currentVendors(currentVendors)
            .maxVendors(maxVendors)
            .utilizationRate(utilizationRate)
            .isFull(currentVendors >= maxVendors)
            .build();
    }
    
    /**
     * Check if zone is at capacity
     */
    public boolean isZoneAtCapacity(Long zoneId) {
        ZoneCapacityInfo capacity = getZoneCapacity(zoneId);
        return capacity.getIsFull();
    }
    
    /**
     * Find nearest zone for a point
     */
    public Optional<Zone> findNearestZone(double latitude, double longitude, double maxDistance) {
        
        List<Zone> allActiveZones = zoneRepository.findAllActiveZones();
        Zone nearestZone = null;
        double minDistance = Double.MAX_VALUE;
        
        for (Zone zone : allActiveZones) {
            double distance;
            
            if (zone.hasPolygon()) {
                // Check if point is inside polygon first
                if (isPointInPolygon(latitude, longitude, zone.getPolygonCoordinatesJson())) {
                    return Optional.of(zone); // Point is inside zone
                }
                
                // Calculate distance to polygon boundary (simplified - use center)
                distance = calculateHaversineDistance(
                    latitude, longitude,
                    zone.getLatitude().doubleValue(),
                    zone.getLongitude().doubleValue()
                );
            } else {
                // Use radius-based zones
                distance = calculateHaversineDistance(
                    latitude, longitude,
                    zone.getLatitude().doubleValue(),
                    zone.getLongitude().doubleValue()
                );
            }
            
            if (distance < minDistance && distance <= maxDistance) {
                minDistance = distance;
                nearestZone = zone;
            }
        }
        
        return Optional.ofNullable(nearestZone);
    }
    
    /**
     * Get all zones within a radius
     */
    public List<Zone> getZonesWithinRadius(double latitude, double longitude, double radius) {
        
        List<Zone> allActiveZones = zoneRepository.findAllActiveZones();
        List<Zone> zonesWithinRadius = new ArrayList<>();
        
        for (Zone zone : allActiveZones) {
            double distance;
            
            if (zone.hasPolygon()) {
                // Check if center point is within radius
                distance = calculateHaversineDistance(
                    latitude, longitude,
                    zone.getLatitude().doubleValue(),
                    zone.getLongitude().doubleValue()
                );
            } else {
                distance = calculateHaversineDistance(
                    latitude, longitude,
                    zone.getLatitude().doubleValue(),
                    zone.getLongitude().doubleValue()
                );
            }
            
            if (distance <= radius) {
                zonesWithinRadius.add(zone);
            }
        }
        
        return zonesWithinRadius;
    }
    
    /**
     * Validate zone boundary coordinates
     */
    public boolean validateZoneBoundary(String polygonCoordinates) {
        
        try {
            List<Coordinate> coordinates = parsePolygonCoordinates(polygonCoordinates);
            
            // Must have at least 3 points for a polygon
            if (coordinates.size() < 3) {
                return false;
            }
            
            // Check if polygon is valid (not self-intersecting)
            // For simplicity, just check basic validity
            for (Coordinate coord : coordinates) {
                if (coord.getLatitude() < -90 || coord.getLatitude() > 90 ||
                    coord.getLongitude() < -180 || coord.getLongitude() > 180) {
                    return false;
                }
            }
            
            return true;
            
        } catch (Exception e) {
            // Error validating zone boundary
            return false;
        }
    }
}

// LocationValidationResult is now defined in dto package

// ZoneCapacityInfo is now defined in dto package

class Coordinate {
    private double latitude;
    private double longitude;
    
    public Coordinate() {}
    
    public Coordinate(double latitude, double longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
    
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
}
