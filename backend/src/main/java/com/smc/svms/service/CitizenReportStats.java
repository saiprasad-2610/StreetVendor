package com.smc.svms.service;

import java.time.LocalDateTime;

public class CitizenReportStats {
    private Long totalReports;
    private Long pendingReports;
    private Long resolvedReports;
    private Long verifiedReports;
    private java.util.Map<com.smc.svms.entity.ReportType, Long> reportsByType;
    private LocalDateTime lastUpdated;
    
    public CitizenReportStats() {
        this.lastUpdated = LocalDateTime.now();
    }
    
    public CitizenReportStats(Long totalReports, Long pendingReports, Long resolvedReports) {
        this.totalReports = totalReports;
        this.pendingReports = pendingReports;
        this.resolvedReports = resolvedReports;
        this.lastUpdated = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getTotalReports() { return totalReports; }
    public void setTotalReports(Long totalReports) { this.totalReports = totalReports; }
    
    public Long getPendingReports() { return pendingReports; }
    public void setPendingReports(Long pendingReports) { this.pendingReports = pendingReports; }
    
    public Long getResolvedReports() { return resolvedReports; }
    public void setResolvedReports(Long resolvedReports) { this.resolvedReports = resolvedReports; }
    
    public Long getVerifiedReports() { return verifiedReports; }
    public void setVerifiedReports(Long verifiedReports) { this.verifiedReports = verifiedReports; }
    
    public java.util.Map<com.smc.svms.entity.ReportType, Long> getReportsByType() { return reportsByType; }
    public void setReportsByType(java.util.Map<com.smc.svms.entity.ReportType, Long> reportsByType) { this.reportsByType = reportsByType; }
    
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    
    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long totalReports;
        private Long pendingReports;
        private Long resolvedReports;
        private Long verifiedReports;
        private java.util.Map<com.smc.svms.entity.ReportType, Long> reportsByType;
        private java.util.Map<com.smc.svms.entity.ReportStatus, Long> reportsByStatus;
        private long confirmedReports;
        private double confirmationRate;
        private java.util.Map<java.time.LocalDate, Long> reportsByDay;
        private LocalDateTime lastUpdated;
        
        public Builder totalReports(Long totalReports) {
            this.totalReports = totalReports;
            return this;
        }
        
        public Builder pendingReports(Long pendingReports) {
            this.pendingReports = pendingReports;
            return this;
        }
        
        public Builder resolvedReports(Long resolvedReports) {
            this.resolvedReports = resolvedReports;
            return this;
        }
        
        public Builder verifiedReports(Long verifiedReports) {
            this.verifiedReports = verifiedReports;
            return this;
        }
        
        public Builder reportsByType(java.util.Map<com.smc.svms.entity.ReportType, Long> reportsByType) {
            this.reportsByType = reportsByType;
            return this;
        }
        
        public Builder reportsByStatus(java.util.Map<com.smc.svms.entity.ReportStatus, Long> reportsByStatus) {
            this.reportsByStatus = reportsByStatus;
            return this;
        }
        
        public Builder confirmedReports(long confirmedReports) {
            this.confirmedReports = confirmedReports;
            return this;
        }
        
        public Builder confirmationRate(double confirmationRate) {
            this.confirmationRate = confirmationRate;
            return this;
        }
        
        public Builder reportsByDay(java.util.Map<java.time.LocalDate, Long> reportsByDay) {
            this.reportsByDay = reportsByDay;
            return this;
        }
        
        public Builder lastUpdated(LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
            return this;
        }
        
        public CitizenReportStats build() {
            CitizenReportStats stats = new CitizenReportStats();
            stats.totalReports = this.totalReports;
            stats.pendingReports = this.pendingReports;
            stats.resolvedReports = this.resolvedReports;
            stats.verifiedReports = this.verifiedReports;
            stats.reportsByType = this.reportsByType;
            stats.lastUpdated = this.lastUpdated;
            return stats;
        }
    }
}
