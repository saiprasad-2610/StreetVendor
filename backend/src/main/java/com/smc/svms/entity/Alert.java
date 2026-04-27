package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smc.svms.enums.AlertSeverity;
import com.smc.svms.enums.AlertStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerts", indexes = {
    @Index(name = "idx_alerts_status_created", columnList = "status, created_at"),
    @Index(name = "idx_alerts_severity_created", columnList = "severity, created_at"),
    @Index(name = "idx_alerts_priority_created", columnList = "priority_level, created_at"),
    @Index(name = "idx_alerts_officer_created", columnList = "officer_id, created_at"),
    @Index(name = "idx_alerts_vendor_created", columnList = "vendor_id, created_at")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Alert {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "alert_type", nullable = false, length = 30)
    private String alertType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private com.smc.svms.enums.AlertSeverity severity;
    
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    @JsonIgnoreProperties({"location", "qrCode", "createdBy"})
    private Vendor vendor;
    
    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.REMOVE)
    @JoinColumn(name = "zone_id")
    @JsonIgnoreProperties({"vendorLocations", "createdAt", "updatedAt"})
    private Zone zone;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "officer_id")
    @JsonIgnoreProperties({"password", "roles", "createdAt", "updatedAt"})
    private User officer;
    
    @Column(name = "location_latitude")
    private Double locationLatitude;
    
    @Column(name = "location_longitude")
    private Double locationLongitude;
    
    @Column(name = "reference_id", length = 100)
    private String referenceId;
    
    @Column(name = "reference_type", length = 30)
    private String referenceType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private com.smc.svms.enums.AlertStatus status;
    
    @Column(name = "assigned_to", length = 100)
    private String assignedTo;
    
    @Column(name = "priority_level", nullable = false)
    private Integer priorityLevel;
    
    @Column(name = "auto_escalated", nullable = false)
    private Boolean autoEscalated = false;
    
    @Column(name = "escalation_level", nullable = false)
    private Integer escalationLevel = 0;
    
    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;
    
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
    
    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors
    public Alert() {}
    
    public Alert(String alertType, com.smc.svms.enums.AlertSeverity severity, String title, String message) {
        this.alertType = alertType;
        this.severity = severity;
        this.title = title;
        this.message = message;
        this.status = com.smc.svms.enums.AlertStatus.PENDING;
        this.priorityLevel = 50;
        this.autoEscalated = false;
        this.escalationLevel = 0;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getAlertType() { return alertType; }
    public void setAlertType(String alertType) { this.alertType = alertType; }
    
    public com.smc.svms.enums.AlertSeverity getSeverity() { return severity; }
    public void setSeverity(com.smc.svms.enums.AlertSeverity severity) { this.severity = severity; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    
    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }
    
    public User getOfficer() { return officer; }
    public void setOfficer(User officer) { this.officer = officer; }
    
    public Double getLocationLatitude() { return locationLatitude; }
    public void setLocationLatitude(Double locationLatitude) { this.locationLatitude = locationLatitude; }
    
    public Double getLocationLongitude() { return locationLongitude; }
    public void setLocationLongitude(Double locationLongitude) { this.locationLongitude = locationLongitude; }
    
    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
    
    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }
    
    public com.smc.svms.enums.AlertStatus getStatus() { return status; }
    public void setStatus(com.smc.svms.enums.AlertStatus status) { this.status = status; }
    
    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }
    
    public Integer getPriorityLevel() { return priorityLevel; }
    public void setPriorityLevel(Integer priorityLevel) { this.priorityLevel = priorityLevel; }
    
    public Boolean getAutoEscalated() { return autoEscalated; }
    public void setAutoEscalated(Boolean autoEscalated) { this.autoEscalated = autoEscalated; }
    
    public Integer getEscalationLevel() { return escalationLevel; }
    public void setEscalationLevel(Integer escalationLevel) { this.escalationLevel = escalationLevel; }
    
    public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }
    
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    
    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Static builder method
    public static AlertBuilder builder() {
        return new AlertBuilder();
    }
    
    public static class AlertBuilder {
        private String alertType;
        private AlertSeverity severity;
        private String title;
        private String message;
        private Long vendorId;
        private Long zoneId;
        private Double locationLatitude;
        private Double locationLongitude;
        private String referenceId;
        private String referenceType;
        private AlertStatus status = AlertStatus.PENDING;
        private Integer priorityLevel = 1;
        private LocalDateTime createdAt;
        
        public AlertBuilder alertType(String alertType) {
            this.alertType = alertType;
            return this;
        }
        
        public AlertBuilder severity(AlertSeverity severity) {
            this.severity = severity;
            return this;
        }
        
        public AlertBuilder title(String title) {
            this.title = title;
            return this;
        }
        
        public AlertBuilder message(String message) {
            this.message = message;
            return this;
        }
        
        public AlertBuilder vendorId(Long vendorId) {
            this.vendorId = vendorId;
            return this;
        }
        
        public AlertBuilder zoneId(Long zoneId) {
            this.zoneId = zoneId;
            return this;
        }
        
        public AlertBuilder locationLatitude(Double locationLatitude) {
            this.locationLatitude = locationLatitude;
            return this;
        }
        
        public AlertBuilder locationLongitude(Double locationLongitude) {
            this.locationLongitude = locationLongitude;
            return this;
        }
        
        public AlertBuilder referenceId(String referenceId) {
            this.referenceId = referenceId;
            return this;
        }
        
        public AlertBuilder referenceType(String referenceType) {
            this.referenceType = referenceType;
            return this;
        }
        
        public AlertBuilder status(AlertStatus status) {
            this.status = status;
            return this;
        }
        
        public AlertBuilder priorityLevel(Integer priorityLevel) {
            this.priorityLevel = priorityLevel;
            return this;
        }
        
        public AlertBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public Alert build() {
            Alert alert = new Alert();
            alert.alertType = this.alertType;
            alert.severity = this.severity;
            alert.title = this.title;
            alert.message = this.message;
            alert.status = this.status;
            alert.priorityLevel = this.priorityLevel;
            alert.locationLatitude = this.locationLatitude;
            alert.locationLongitude = this.locationLongitude;
            alert.referenceId = this.referenceId;
            alert.referenceType = this.referenceType;
            alert.createdAt = this.createdAt;
            return alert;
        }
    }
    
    // Helper methods
    public boolean isPending() {
        return status == AlertStatus.PENDING;
    }
    
    public boolean isAcknowledged() {
        return status == AlertStatus.ACKNOWLEDGED;
    }
    
    public boolean isInProgress() {
        return status == AlertStatus.IN_PROGRESS;
    }
    
    public boolean isResolved() {
        return status == AlertStatus.RESOLVED;
    }
    
    public boolean isCritical() {
        return severity == AlertSeverity.CRITICAL;
    }
    
    public boolean isHighPriority() {
        return priorityLevel != null && priorityLevel >= 75;
    }
    
    public boolean needsEscalation() {
        return !isResolved() && escalationLevel < 3;
    }
}
