package com.smc.svms.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class RealTimeStats {
    private long activeVendors;
    private long todayViolations;
    private BigDecimal todayRevenue;
    private long pendingReports;
    private SystemHealth systemHealth;
    private LocalDateTime timestamp;
    
    public RealTimeStats() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private RealTimeStats stats = new RealTimeStats();
        public Builder activeVendors(long v) { stats.activeVendors = v; return this; } 
        public Builder todayViolations(long v) { stats.todayViolations = v; return this; }
        public Builder todayRevenue(BigDecimal v) { stats.todayRevenue = v; return this; }
        public Builder pendingReports(long v) { stats.pendingReports = v; return this; }
        public Builder systemHealth(SystemHealth v) { stats.systemHealth = v; return this; }
        public Builder timestamp(LocalDateTime v) { stats.timestamp = v; return this; }
        public RealTimeStats build() { return stats; }
    }
    
    public long getActiveVendors() { return activeVendors; }
    public long getTodayViolations() { return todayViolations; }
    public BigDecimal getTodayRevenue() { return todayRevenue; }
    public long getPendingReports() { return pendingReports; }
    public SystemHealth getSystemHealth() { return systemHealth; }
    public LocalDateTime getTimestamp() { return timestamp; }
    
    public RealTimeStats withActiveVendors(long activeVendors) {
        this.activeVendors = activeVendors;
        return this;
    }
    
    public RealTimeStats withTodayViolations(long todayViolations) {
        this.todayViolations = todayViolations;
        return this;
    }
    
    public RealTimeStats withTodayRevenue(BigDecimal todayRevenue) {
        this.todayRevenue = todayRevenue;
        return this;
    }
    
    public RealTimeStats withPendingReports(long pendingReports) {
        this.pendingReports = pendingReports;
        return this;
    }
    
    public RealTimeStats withSystemHealth(SystemHealth systemHealth) {
        this.systemHealth = systemHealth;
        return this;
    }
    
    public RealTimeStats withTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
        return this;
    }
}
