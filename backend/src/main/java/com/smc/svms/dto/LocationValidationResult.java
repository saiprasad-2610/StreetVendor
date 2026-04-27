package com.smc.svms.dto;

import com.smc.svms.entity.ZoneCategory;
import com.smc.svms.enums.ZoneType;

public class LocationValidationResult {
    private boolean valid;
    private String message;
    private double distance;
    private String zoneName;
    private ZoneType zoneType;
    private ZoneCategory zoneCategory;
    
    // Advanced geofencing fields
    private Double confidence;
    private String algorithmUsed;
    private Double gpsAccuracy;
    
    public LocationValidationResult() {}
    
    public LocationValidationResult(boolean valid, String message, double distance, String zoneName, ZoneType zoneType, ZoneCategory zoneCategory) {
        this.valid = valid;
        this.message = message;
        this.distance = distance;
        this.zoneName = zoneName;
        this.zoneType = zoneType;
        this.zoneCategory = zoneCategory;
    }
    
    // Getters and Setters
    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public double getDistance() { return distance; }
    public void setDistance(double distance) { this.distance = distance; }
    
    public String getZoneName() { return zoneName; }
    public void setZoneName(String zoneName) { this.zoneName = zoneName; }
    
    public ZoneType getZoneType() { return zoneType; }
    public void setZoneType(ZoneType zoneType) { this.zoneType = zoneType; }
    
    public ZoneCategory getZoneCategory() { return zoneCategory; }
    public void setZoneCategory(ZoneCategory zoneCategory) { this.zoneCategory = zoneCategory; }
    
    // Advanced geofencing getters and setters
    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }
    
    public String getAlgorithmUsed() { return algorithmUsed; }
    public void setAlgorithmUsed(String algorithmUsed) { this.algorithmUsed = algorithmUsed; }
    
    public Double getGpsAccuracy() { return gpsAccuracy; }
    public void setGpsAccuracy(Double gpsAccuracy) { this.gpsAccuracy = gpsAccuracy; }
}
