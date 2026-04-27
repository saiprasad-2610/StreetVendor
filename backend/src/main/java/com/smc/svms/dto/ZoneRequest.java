package com.smc.svms.dto;

import com.smc.svms.entity.ZoneCategory;
import com.smc.svms.enums.ZoneType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class ZoneRequest {

    @NotBlank(message = "Zone name is required")
    @Size(max = 100, message = "Zone name must not exceed 100 characters")
    private String name;

    @NotNull(message = "Zone type is required")
    private ZoneType zoneType;

    private ZoneCategory zoneCategory;

    @NotNull(message = "Center latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal centerLatitude;

    @NotNull(message = "Center longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal centerLongitude;

    @Positive(message = "Radius must be positive")
    private Integer radiusMeters;

    private String polygonCoordinates;

    @Positive(message = "Max vendors must be positive")
    private Integer maxVendors;

    private String timeRestrictions;

    @Email(message = "Invalid email format")
    private String managerEmail;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid phone number format")
    private String managerPhone;

    @Positive(message = "Monthly rent must be positive")
    private BigDecimal monthlyRent;

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public ZoneType getZoneType() { return zoneType; }
    public void setZoneType(ZoneType zoneType) { this.zoneType = zoneType; }
    
    public ZoneCategory getZoneCategory() { return zoneCategory; }
    public void setZoneCategory(ZoneCategory zoneCategory) { this.zoneCategory = zoneCategory; }
    
    public BigDecimal getCenterLatitude() { return centerLatitude; }
    public void setCenterLatitude(BigDecimal centerLatitude) { this.centerLatitude = centerLatitude; }
    
    public BigDecimal getCenterLongitude() { return centerLongitude; }
    public void setCenterLongitude(BigDecimal centerLongitude) { this.centerLongitude = centerLongitude; }
    
    public Integer getRadiusMeters() { return radiusMeters; }
    public void setRadiusMeters(Integer radiusMeters) { this.radiusMeters = radiusMeters; }
    
    public String getPolygonCoordinates() { return polygonCoordinates; }
    public void setPolygonCoordinates(String polygonCoordinates) { this.polygonCoordinates = polygonCoordinates; }
    
    public Integer getMaxVendors() { return maxVendors; }
    public void setMaxVendors(Integer maxVendors) { this.maxVendors = maxVendors; }
    
    public String getTimeRestrictions() { return timeRestrictions; }
    public void setTimeRestrictions(String timeRestrictions) { this.timeRestrictions = timeRestrictions; }
    
    public String getManagerEmail() { return managerEmail; }
    public void setManagerEmail(String managerEmail) { this.managerEmail = managerEmail; }
    
    public String getManagerPhone() { return managerPhone; }
    public void setManagerPhone(String managerPhone) { this.managerPhone = managerPhone; }

    public BigDecimal getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(BigDecimal monthlyRent) { this.monthlyRent = monthlyRent; }

    // Helper method for backward compatibility
    public java.util.List<java.util.Map<String, Double>> getPolygonCoordinatesList() {
        if (polygonCoordinates == null || polygonCoordinates.isEmpty()) {
            return null;
        }
        try {
            // Parse JSON string to list of coordinates
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(polygonCoordinates, 
                mapper.getTypeFactory().constructCollectionType(java.util.List.class, 
                    mapper.getTypeFactory().constructMapType(java.util.Map.class, String.class, Double.class)));
        } catch (Exception e) {
            return null;
        }
    }
    
    // Helper method for backward compatibility
    public String getZoneCategoryString() {
        return zoneCategory != null ? zoneCategory.toString() : null;
    }
    
    // Helper method for backward compatibility
    public Double getCenterLatitudeDouble() {
        return centerLatitude != null ? centerLatitude.doubleValue() : null;
    }
    
    // Helper method for backward compatibility
    public Double getCenterLongitudeDouble() {
        return centerLongitude != null ? centerLongitude.doubleValue() : null;
    }
}
