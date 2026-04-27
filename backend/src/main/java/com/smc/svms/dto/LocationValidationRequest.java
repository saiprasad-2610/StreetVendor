package com.smc.svms.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class LocationValidationRequest {

    @NotNull(message = "Vendor ID is required")
    private Long vendorId;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;
    
    // Getters and Setters
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    
    // Helper methods for backward compatibility
    public Double getLatitudeDouble() {
        return latitude != null ? latitude.doubleValue() : null;
    }
    
    public Double getLongitudeDouble() {
        return longitude != null ? longitude.doubleValue() : null;
    }
}
