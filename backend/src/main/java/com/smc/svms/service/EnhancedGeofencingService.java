package com.smc.svms.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smc.svms.algorithm.AdvancedGeofencingAlgorithms;
import com.smc.svms.algorithm.AdvancedGeofencingAlgorithms.*;
import com.smc.svms.entity.*;
import com.smc.svms.enums.ZoneType;
import com.smc.svms.repository.*;
import com.smc.svms.dto.ZoneCapacityInfo;
import com.smc.svms.dto.LocationValidationResult;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    
    // R-tree index for complex polygon zones
    private RTreeIndexing.PolygonRTree polygonRTree;
    
    // Cache for zone characteristics
    private final Map<Long, ZoneCharacteristics> zoneCharacteristicsCache = new HashMap<>();
    
    // Adaptive algorithm selector
    private final AdaptiveAlgorithmSelector algorithmSelector = new AdaptiveAlgorithmSelector();
    
    @Value("${geofencing.use-advanced-algorithms:true}")
    private boolean useAdvancedAlgorithms;
    
    @Value("${geofencing.default-gps-accuracy:10.0}")
    private double defaultGpsAccuracy;

    /**
     * Check if vendor is within their assigned zone (legacy method for backward compatibility)
     */
    public LocationValidationResult validateVendorLocation(Long vendorId, double latitude, double longitude) {
        return validateVendorLocationWithAccuracy(vendorId, latitude, longitude, defaultGpsAccuracy);
    }
    
    /**
     * Check if vendor is within their assigned zone with GPS accuracy awareness
     * Uses advanced algorithms for improved accuracy and performance
     */
    public LocationValidationResult validateVendorLocationWithAccuracy(Long vendorId, double latitude, double longitude, double gpsAccuracy) {
        
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
            
            // Validate location using advanced algorithms if enabled
            boolean isWithinZone = false;
            double distance = 0;
            double confidence = 1.0;
            String algorithmUsed = "HAVERSINE";
            
            if (useAdvancedAlgorithms) {
                // Use advanced algorithms with adaptive selection
                AdvancedLocationValidationResult advancedResult = validateLocationAdvanced(
                    latitude, longitude, zone, gpsAccuracy);
                isWithinZone = advancedResult.isWithinZone();
                distance = advancedResult.getDistance();
                confidence = advancedResult.getConfidence();
                algorithmUsed = advancedResult.getAlgorithmUsed();
            } else {
                // Use legacy algorithms for backward compatibility
                if (zone.hasPolygon()) {
                    isWithinZone = isPointInPolygon(latitude, longitude, zone.getPolygonCoordinatesJson());
                } else if (zone.getRadiusMeters() != null) {
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
            }
            
            LocationValidationResult finalResult = new LocationValidationResult();
            finalResult.setValid(isWithinZone);
            finalResult.setDistance(distance);
            finalResult.setZoneName(zone.getName());
            finalResult.setZoneType(zone.getZoneType());
            finalResult.setZoneCategory(zone.getZoneCategory());
            finalResult.setMessage(isWithinZone ? "Vendor within assigned zone" : "Vendor outside assigned zone");
            
            // Add confidence and algorithm info if using advanced algorithms
            if (useAdvancedAlgorithms) {
                finalResult.setConfidence(confidence);
                finalResult.setAlgorithmUsed(algorithmUsed);
                finalResult.setGpsAccuracy(gpsAccuracy);
            }
            
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
     * Calculate distance between two points (Haversine formula) - Legacy method
     */
    public double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        return ImprovedHaversine.calculateDistance(lat1, lon1, lat2, lon2);
    }
    
    /**
     * Advanced location validation using adaptive algorithms
     */
    private AdvancedLocationValidationResult validateLocationAdvanced(
            double latitude, double longitude, Zone zone, double gpsAccuracy) {
        
        long startTime = System.nanoTime();
        
        // Analyze zone characteristics
        ZoneCharacteristics characteristics = analyzeZoneCharacteristics(zone);
        
        // Select optimal algorithm
        AlgorithmChoice algorithmChoice = algorithmSelector.selectOptimalAlgorithm(characteristics);
        
        boolean isWithinZone = false;
        double distance = 0.0;
        String algorithmUsed = algorithmChoice.getDistanceAlgorithm().name();
        
        if (zone.hasPolygon()) {
            // Use polygon validation with selected algorithm
            List<Coordinate> coordinates = parsePolygonCoordinates(zone.getPolygonCoordinatesJson());
            
            if (coordinates.isEmpty()) {
                return new AdvancedLocationValidationResult(false, 0.0, 0.0, "ERROR");
            }
            
            ContainmentResult containmentResult;
            
            switch (algorithmChoice.getContainmentAlgorithm()) {
                case RTREE_INDEXED:
                    containmentResult = performRTreeContainment(latitude, longitude, coordinates);
                    break;
                case WINDING_NUMBER:
                    containmentResult = PolygonContainment.isPointInPolygon(latitude, longitude, coordinates);
                    break;
                case OPTIMIZED_RAY_CASTING:
                default:
                    containmentResult = PolygonContainment.simpleRayCasting(latitude, longitude, coordinates);
                    break;
            }
            
            isWithinZone = containmentResult.isInside();
            distance = containmentResult.getDistance();
            algorithmUsed = algorithmChoice.getContainmentAlgorithm().name();
            
        } else if (zone.getRadiusMeters() != null) {
            // Use radius-based validation with selected distance algorithm
            switch (algorithmChoice.getDistanceAlgorithm()) {
                case VINCENTY:
                    GeodesicResult vincentyResult = VincentyDistance.calculateDistance(
                        latitude, longitude,
                        zone.getLatitude().doubleValue(),
                        zone.getLongitude().doubleValue());
                    distance = vincentyResult.getDistance();
                    break;
                case FAST_EUCLIDEAN:
                    distance = FastEuclidean.calculateDistance(
                        latitude, longitude,
                        zone.getLatitude().doubleValue(),
                        zone.getLongitude().doubleValue());
                    break;
                case IMPROVED_HAVERSINE:
                default:
                    distance = ImprovedHaversine.calculateDistance(
                        latitude, longitude,
                        zone.getLatitude().doubleValue(),
                        zone.getLongitude().doubleValue());
                    break;
            }
            
            // Apply GPS accuracy-aware threshold
            double adaptiveThreshold = calculateAdaptiveThreshold(zone.getRadiusMeters(), gpsAccuracy);
            isWithinZone = distance <= adaptiveThreshold;
        }
        
        // Calculate confidence based on GPS accuracy and algorithm
        double confidence = calculateConfidence(isWithinZone, distance, gpsAccuracy, characteristics);
        
        long processingTime = (System.nanoTime() - startTime) / 1_000_000;
        log.debug("Advanced validation completed in {}ms using {} algorithm. Confidence: {}", 
                   processingTime, algorithmUsed, confidence);
        
        return new AdvancedLocationValidationResult(isWithinZone, distance, confidence, algorithmUsed);
    }
    
    /**
     * Calculate adaptive threshold based on GPS accuracy
     */
    private double calculateAdaptiveThreshold(double baseThreshold, double gpsAccuracy) {
        // Adjust threshold based on GPS accuracy
        // Poor GPS accuracy (high value) = more lenient threshold
        // Excellent GPS accuracy (low value) = stricter threshold
        
        if (gpsAccuracy <= 3.0) {
            // Excellent GPS - use 80% of threshold
            return baseThreshold * 0.8;
        } else if (gpsAccuracy <= 10.0) {
            // Good GPS - use 90% of threshold
            return baseThreshold * 0.9;
        } else if (gpsAccuracy <= 20.0) {
            // Fair GPS - use 100% of threshold
            return baseThreshold;
        } else if (gpsAccuracy <= 50.0) {
            // Poor GPS - use 120% of threshold
            return baseThreshold * 1.2;
        } else {
            // Very poor GPS - use 150% of threshold
            return baseThreshold * 1.5;
        }
    }
    
    /**
     * Calculate confidence score based on multiple factors
     */
    private double calculateConfidence(boolean isWithinZone, double distance, 
                                       double gpsAccuracy, ZoneCharacteristics characteristics) {
        double confidence = 1.0;
        
        // Adjust for GPS accuracy
        if (gpsAccuracy > 50.0) {
            confidence *= 0.5; // Very poor GPS
        } else if (gpsAccuracy > 20.0) {
            confidence *= 0.7; // Poor GPS
        } else if (gpsAccuracy > 10.0) {
            confidence *= 0.85; // Fair GPS
        } else if (gpsAccuracy <= 3.0) {
            confidence *= 1.1; // Excellent GPS
        }
        
        // Adjust for zone complexity
        if (characteristics.getVertexCount() > 100) {
            confidence *= 0.95; // Complex zones
        }
        
        // Adjust for distance from boundary
        if (!isWithinZone && distance < 5.0) {
            confidence *= 0.7; // Near boundary, less certain
        } else if (!isWithinZone && distance > 50.0) {
            confidence *= 1.05; // Far from boundary, more certain
        }
        
        // Ensure confidence is within bounds
        return Math.max(0.1, Math.min(1.0, confidence));
    }
    
    /**
     * Analyze zone characteristics for algorithm selection
     */
    private ZoneCharacteristics analyzeZoneCharacteristics(Zone zone) {
        return zoneCharacteristicsCache.computeIfAbsent(zone.getId(), id -> {
            ZoneCharacteristics characteristics = new ZoneCharacteristics();
            
            int vertexCount = zone.hasPolygon() ? 
                parsePolygonCoordinates(zone.getPolygonCoordinatesJson()).size() : 2;
            characteristics.setVertexCount(vertexCount);
            
            characteristics.setZoneCount((int) zoneRepository.countActiveZones());
            
            double maxDistance = zone.getRadiusMeters() != null ? 
                zone.getRadiusMeters() : 1000.0;
            characteristics.setMaxDistance(maxDistance);
            
            characteristics.setRequiresHighPrecision(maxDistance > 1000);
            characteristics.setSimpleZone(vertexCount <= 10);
            
            return characteristics;
        });
    }
    
    /**
     * R-tree based containment for complex polygons
     */
    private ContainmentResult performRTreeContainment(double latitude, double longitude, 
                                                       List<Coordinate> coordinates) {
        // Initialize R-tree if not already done
        if (polygonRTree == null) {
            initializeRTree();
        }
        
        // For containment check, we use the polygon directly
        ContainmentResult result = PolygonContainment.isPointInPolygon(latitude, longitude, coordinates);
        
        return result;
    }
    
    /**
     * Initialize R-tree index for all zones
     */
    private void initializeRTree() {
        log.info("Initializing R-tree index for polygon zones");
        polygonRTree = new RTreeIndexing.PolygonRTree();
        
        List<Zone> allZones = zoneRepository.findAllActiveZones();
        
        for (Zone zone : allZones) {
            if (zone.hasPolygon()) {
                List<Coordinate> coordinates = parsePolygonCoordinates(zone.getPolygonCoordinatesJson());
                if (!coordinates.isEmpty()) {
                    RTreeIndexing.PolygonZone polygonZone = new RTreeIndexing.PolygonZone(zone.getId().toString(), coordinates);
                    polygonRTree.insert(polygonZone);
                }
            }
        }
        
        log.info("R-tree index initialized with {} polygon zones", allZones.size());
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

    /**
     * Check if a new zone overlaps with any existing active zones
     * Supports both circular and polygon zones
     */
    public boolean checkZoneOverlap(Zone newZone) {
        try {
            log.info("Checking overlap for zone: {} at ({}, {})", newZone.getName(), newZone.getLatitude(), newZone.getLongitude());
            List<Zone> existingZones = zoneRepository.findAllActiveZones();
            log.info("Found {} existing active zones", existingZones.size());

            for (Zone existingZone : existingZones) {
                // Skip if same zone (for updates)
                if (newZone.getId() != null && newZone.getId().equals(existingZone.getId())) {
                    continue;
                }

                log.info("Checking overlap with existing zone: {} at ({}, {})", existingZone.getName(), existingZone.getLatitude(), existingZone.getLongitude());
                if (zonesOverlap(newZone, existingZone)) {
                    log.warn("Zone '{}' overlaps with existing zone '{}'", newZone.getName(), existingZone.getName());
                    return true;
                }
            }
            log.info("No overlap detected for zone: {}", newZone.getName());
            return false;
        } catch (Exception e) {
            log.error("Error checking zone overlap: {}", e.getMessage(), e);
            // Return true to prevent creation if check fails (fail-secure)
            return true;
        }
    }

    /**
     * Check if two zones overlap
     * Handles circle-circle, polygon-polygon, and circle-polygon overlaps
     */
    private boolean zonesOverlap(Zone zone1, Zone zone2) {
        // Both circular zones
        if (!zone1.hasPolygon() && !zone2.hasPolygon()) {
            return circularZonesOverlap(zone1, zone2);
        }

        // Both polygon zones
        if (zone1.hasPolygon() && zone2.hasPolygon()) {
            return polygonZonesOverlap(zone1, zone2);
        }

        // One circular, one polygon - check if circle center is inside polygon
        // or if any polygon point is inside circle
        if (zone1.hasPolygon()) {
            return circlePolygonOverlap(zone2, zone1); // zone2 is circle, zone1 is polygon
        } else {
            return circlePolygonOverlap(zone1, zone2); // zone1 is circle, zone2 is polygon
        }
    }

    /**
     * Check if two circular zones overlap
     */
    private boolean circularZonesOverlap(Zone zone1, Zone zone2) {
        double distance = calculateHaversineDistance(
            zone1.getLatitude().doubleValue(), zone1.getLongitude().doubleValue(),
            zone2.getLatitude().doubleValue(), zone2.getLongitude().doubleValue()
        );

        double radius1 = zone1.getRadiusMeters() != null ? zone1.getRadiusMeters() : 0;
        double radius2 = zone2.getRadiusMeters() != null ? zone2.getRadiusMeters() : 0;

        // Zones overlap if distance between centers is less than sum of radii
        return distance < (radius1 + radius2);
    }

    /**
     * Check if a circular zone overlaps with a polygon zone
     */
    private boolean circlePolygonOverlap(Zone circleZone, Zone polygonZone) {
        // Get polygon coordinates
        List<Map<String, Double>> polygonCoords = polygonZone.getPolygonCoordinatesList();
        if (polygonCoords == null || polygonCoords.isEmpty()) {
            return false;
        }

        double circleLat = circleZone.getLatitude().doubleValue();
        double circleLng = circleZone.getLongitude().doubleValue();
        double radius = circleZone.getRadiusMeters() != null ? circleZone.getRadiusMeters() : 0;

        // Check if circle center is inside polygon
        if (isPointInPolygon(circleLat, circleLng, polygonZone.getPolygonCoordinatesJson())) {
            return true;
        }

        // Check if any polygon vertex is inside the circle
        for (Map<String, Double> coord : polygonCoords) {
            double pointLat = coord.get("latitude");
            double pointLng = coord.get("longitude");
            double distance = calculateHaversineDistance(circleLat, circleLng, pointLat, pointLng);
            if (distance <= radius) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if two polygon zones overlap (simplified bounding box check)
     */
    private boolean polygonZonesOverlap(Zone zone1, Zone zone2) {
        List<Map<String, Double>> coords1 = zone1.getPolygonCoordinatesList();
        List<Map<String, Double>> coords2 = zone2.getPolygonCoordinatesList();

        if (coords1 == null || coords2 == null) {
            return false;
        }

        // Check if any point of zone1 is inside zone2
        for (Map<String, Double> coord : coords1) {
            if (isPointInPolygon(coord.get("latitude"), coord.get("longitude"), zone2.getPolygonCoordinatesJson())) {
                return true;
            }
        }

        // Check if any point of zone2 is inside zone1
        for (Map<String, Double> coord : coords2) {
            if (isPointInPolygon(coord.get("latitude"), coord.get("longitude"), zone1.getPolygonCoordinatesJson())) {
                return true;
            }
        }

        return false;
    }
}

// LocationValidationResult is now defined in dto package

// ZoneCapacityInfo is now defined in dto package

// Use Coordinate from AdvancedGeofencingAlgorithms instead of local class
// class Coordinate is now imported from com.smc.svms.algorithm.AdvancedGeofencingAlgorithms

/**
 * Result of advanced location validation
 */
class AdvancedLocationValidationResult {
    private boolean isWithinZone;
    private double distance;
    private double confidence;
    private String algorithmUsed;
    
    public AdvancedLocationValidationResult(boolean isWithinZone, double distance, 
                                            double confidence, String algorithmUsed) {
        this.isWithinZone = isWithinZone;
        this.distance = distance;
        this.confidence = confidence;
        this.algorithmUsed = algorithmUsed;
    }
    
    public boolean isWithinZone() { return isWithinZone; }
    public double getDistance() { return distance; }
    public double getConfidence() { return confidence; }
    public String getAlgorithmUsed() { return algorithmUsed; }
}
