package com.smc.svms.dto;

import com.smc.svms.enums.AlertSeverity;
import com.smc.svms.enums.AlertStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class AlertRequest {
    
    @NotBlank(message = "Alert type is required")
    @Size(max = 30, message = "Alert type must not exceed 30 characters")
    private String alertType;
    
    @NotNull(message = "Severity is required")
    private AlertSeverity severity;
    
    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;
    
    private String message;
    private Long vendorId;
    private Long zoneId;
    private Long officerId;
    private BigDecimal locationLatitude;
    private BigDecimal locationLongitude;
    private String referenceId;
    private String referenceType;
    private String assignedTo;
    private Integer priorityLevel;
    
    public AlertRequest() {}
    
    public AlertRequest(String alertType, AlertSeverity severity, String title, String message) {
        this.alertType = alertType;
        this.severity = severity;
        this.title = title;
        this.message = message;
    }
    
    // Getters and Setters
    public String getAlertType() { return alertType; }
    public void setAlertType(String alertType) { this.alertType = alertType; }
    
    public AlertSeverity getSeverity() { return severity; }
    public void setSeverity(AlertSeverity severity) { this.severity = severity; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    
    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }
    
    public Long getOfficerId() { return officerId; }
    public void setOfficerId(Long officerId) { this.officerId = officerId; }
    
    public BigDecimal getLocationLatitude() { return locationLatitude; }
    public void setLocationLatitude(BigDecimal locationLatitude) { this.locationLatitude = locationLatitude; }
    
    public BigDecimal getLocationLongitude() { return locationLongitude; }
    public void setLocationLongitude(BigDecimal locationLongitude) { this.locationLongitude = locationLongitude; }
    
    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
    
    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }
    
    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }
    
    public Integer getPriorityLevel() { return priorityLevel; }
    public void setPriorityLevel(Integer priorityLevel) { this.priorityLevel = priorityLevel; }
    
    // Helper methods for backward compatibility
    public Double getLocationLatitudeDouble() {
        return locationLatitude != null ? locationLatitude.doubleValue() : null;
    }
    
    public Double getLocationLongitudeDouble() {
        return locationLongitude != null ? locationLongitude.doubleValue() : null;
    }
}
