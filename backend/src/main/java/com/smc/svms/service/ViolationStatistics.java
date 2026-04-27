package com.smc.svms.service;

import java.time.LocalDateTime;

public class ViolationStatistics {
    private Long totalViolations;
    private Long activeViolations;
    private Long resolvedViolations;
    private Long autoDetectedViolations;
    private Long manualViolations;
    private long autoDetected;
    private double autoDetectionRate;
    private Double averageResolutionTime;
    private LocalDateTime lastUpdated;
    
    public ViolationStatistics() {
        this.lastUpdated = LocalDateTime.now();
    }
    
    public ViolationStatistics(Long totalViolations, Long activeViolations, Long resolvedViolations) {
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
    
    public Long getAutoDetectedViolations() { return autoDetectedViolations; }
    public void setAutoDetectedViolations(Long autoDetectedViolations) { this.autoDetectedViolations = autoDetectedViolations; }
    
    public Long getManualViolations() { return manualViolations; }
    public void setManualViolations(Long manualViolations) { this.manualViolations = manualViolations; }
    
    public Double getAverageResolutionTime() { return averageResolutionTime; }
    public void setAverageResolutionTime(Double averageResolutionTime) { this.averageResolutionTime = averageResolutionTime; }
    
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    
    public long getAutoDetected() { return autoDetected; }
    public void setAutoDetected(long autoDetected) { this.autoDetected = autoDetected; }
    
    public double getAutoDetectionRate() { return autoDetectionRate; }
    public void setAutoDetectionRate(double autoDetectionRate) { this.autoDetectionRate = autoDetectionRate; }
    
    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long totalViolations;
        private Long activeViolations;
        private Long resolvedViolations;
        private Long autoDetectedViolations;
        private Long manualViolations;
        private long autoDetected;
        private double autoDetectionRate;
        private Double averageResolutionTime;
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
        
        public Builder autoDetectedViolations(Long autoDetectedViolations) {
            this.autoDetectedViolations = autoDetectedViolations;
            return this;
        }
        
        public Builder manualViolations(Long manualViolations) {
            this.manualViolations = manualViolations;
            return this;
        }
        
        public Builder autoDetected(long autoDetected) {
            this.autoDetected = autoDetected;
            return this;
        }
        
        public Builder autoDetectionRate(double autoDetectionRate) {
            this.autoDetectionRate = autoDetectionRate;
            return this;
        }
        
        public Builder manualDetected(long manualDetected) {
            this.manualViolations = manualDetected;
            return this;
        }
        
        public Builder averageResolutionTime(Double averageResolutionTime) {
            this.averageResolutionTime = averageResolutionTime;
            return this;
        }
        
        public Builder lastUpdated(LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
            return this;
        }
        
        public ViolationStatistics build() {
            ViolationStatistics stats = new ViolationStatistics();
            stats.totalViolations = this.totalViolations;
            stats.activeViolations = this.activeViolations;
            stats.resolvedViolations = this.resolvedViolations;
            stats.autoDetectedViolations = this.autoDetectedViolations;
            stats.manualViolations = this.manualViolations;
            stats.autoDetected = this.autoDetected;
            stats.autoDetectionRate = this.autoDetectionRate;
            stats.averageResolutionTime = this.averageResolutionTime;
            stats.lastUpdated = this.lastUpdated;
            return stats;
        }
    }
}
