package com.smc.svms.service;

public class SystemHealth {
    private HealthStatus status;
    private boolean databaseHealthy;
    private double apiResponseTime;
    private double errorRate;
    
    public SystemHealth() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private SystemHealth h = new SystemHealth();
        public Builder status(HealthStatus v) { h.status = v; return this; }
        public Builder databaseHealthy(boolean v) { h.databaseHealthy = v; return this; }
        public Builder apiResponseTime(double v) { h.apiResponseTime = v; return this; }
        public Builder errorRate(double v) { h.errorRate = v; return this; }
        public SystemHealth build() { return h; }
    }
    
    public HealthStatus getStatus() { return status; }
    public boolean isDatabaseHealthy() { return databaseHealthy; }
    public double getApiResponseTime() { return apiResponseTime; }
    public double getErrorRate() { return errorRate; }
    
    public SystemHealth withStatus(HealthStatus status) {
        this.status = status;
        return this;
    }
    
    public SystemHealth withDatabaseHealthy(boolean databaseHealthy) {
        this.databaseHealthy = databaseHealthy;
        return this;
    }
    
    public SystemHealth withApiResponseTime(double apiResponseTime) {
        this.apiResponseTime = apiResponseTime;
        return this;
    }
    
    public SystemHealth withErrorRate(double errorRate) {
        this.errorRate = errorRate;
        return this;
    }
}
