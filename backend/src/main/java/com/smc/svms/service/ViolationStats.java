package com.smc.svms.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import com.smc.svms.entity.ViolationType;
import com.smc.svms.enums.ValidationStatus;

public class ViolationStats {
    private Long totalViolations;
    private Long activeViolations;
    private Long resolvedViolations;
    private Long autoDetectedViolations;
    private Long manualViolations;
    private Double averageResolutionTime;
    private Map<ViolationType, Long> violationsByType;
    private Map<ValidationStatus, Long> violationsByStatus;
    private long autoDetected;
    private long manualDetected;
    private double resolutionRate;
    private List<VendorViolationCount> topViolatingVendors;
    private LocalDateTime lastUpdated;
    
    public ViolationStats() {
        this.lastUpdated = LocalDateTime.now();
    }
    
    public ViolationStats(Long totalViolations, Long activeViolations, Long resolvedViolations) {
        this.totalViolations = totalViolations;
        this.activeViolations = activeViolations;
        this.resolvedViolations = resolvedViolations;
        this.lastUpdated = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getTotalViolations() { return totalViolations; }
    public void setTotalViolations(Long totalViolations) { this.totalViolations = totalViolations; }
    
    public Long getActiveViolations() { return activeViolations; }
    public void setActiveViolations(Long activeViolations) { this.activeViolations = activeViolations; }
    
    public Long getResolvedViolations() { return resolvedViolations; }
    public void setResolvedViolations(Long resolvedViolations) { this.resolvedViolations = resolvedViolations; }
    
    public Map<ViolationType, Long> getViolationsByType() { return violationsByType; }
    public void setViolationsByType(Map<ViolationType, Long> violationsByType) { this.violationsByType = violationsByType; }
    
    public Map<ValidationStatus, Long> getViolationsByStatus() { return violationsByStatus; }
    public void setViolationsByStatus(Map<ValidationStatus, Long> violationsByStatus) { this.violationsByStatus = violationsByStatus; }
    
    public long getAutoDetected() { return autoDetected; }
    public void setAutoDetected(long autoDetected) { this.autoDetected = autoDetected; }
    
    public long getManualDetected() { return manualDetected; }
    public void setManualDetected(long manualDetected) { this.manualDetected = manualDetected; }
    
    public double getResolutionRate() { return resolutionRate; }
    public void setResolutionRate(double resolutionRate) { this.resolutionRate = resolutionRate; }
    
    public List<VendorViolationCount> getTopViolatingVendors() { return topViolatingVendors; }
    public void setTopViolatingVendors(List<VendorViolationCount> topViolatingVendors) { this.topViolatingVendors = topViolatingVendors; }
    
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    
    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long totalViolations;
        private Long activeViolations;
        private Long resolvedViolations;
        private Map<ViolationType, Long> violationsByType;
        private Map<ValidationStatus, Long> violationsByStatus;
        private long autoDetected;
        private long manualDetected;
        private double resolutionRate;
        private List<VendorViolationCount> topViolatingVendors;
        private LocalDateTime lastUpdated;
        
        public Builder totalViolations(Long totalViolations) {
            this.totalViolations = totalViolations;
            return this;
        }
        
        public Builder activeViolations(Long activeViolations) {
            this.activeViolations = activeViolations;
            return this;
        }
        
        public Builder resolvedViolations(Long resolvedViolations) {
            this.resolvedViolations = resolvedViolations;
            return this;
        }
        
        public Builder violationsByType(Map<ViolationType, Long> violationsByType) {
            this.violationsByType = violationsByType;
            return this;
        }
        
        public Builder violationsByStatus(Map<ValidationStatus, Long> violationsByStatus) {
            this.violationsByStatus = violationsByStatus;
            return this;
        }
        
        public Builder autoDetected(long autoDetected) {
            this.autoDetected = autoDetected;
            return this;
        }
        
        public Builder manualDetected(long manualDetected) {
            this.manualDetected = manualDetected;
            return this;
        }
        
        public Builder resolutionRate(double resolutionRate) {
            this.resolutionRate = resolutionRate;
            return this;
        }
        
        public Builder topViolatingVendors(List<VendorViolationCount> topViolatingVendors) {
            this.topViolatingVendors = topViolatingVendors;
            return this;
        }
        
        public Builder lastUpdated(LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
            return this;
        }
        
        public ViolationStats build() {
            ViolationStats stats = new ViolationStats();
            stats.totalViolations = this.totalViolations;
            stats.activeViolations = this.activeViolations;
            stats.resolvedViolations = this.resolvedViolations;
            stats.violationsByType = this.violationsByType;
            stats.violationsByStatus = this.violationsByStatus;
            stats.autoDetected = this.autoDetected;
            stats.manualDetected = this.manualDetected;
            stats.resolutionRate = this.resolutionRate;
            stats.topViolatingVendors = this.topViolatingVendors;
            stats.lastUpdated = this.lastUpdated;
            return stats;
        }
    }
}
