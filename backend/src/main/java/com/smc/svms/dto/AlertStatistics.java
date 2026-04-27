package com.smc.svms.dto;

import java.time.LocalDateTime;
import java.util.Map;

public class AlertStatistics {
    private long totalAlerts;
    private Map<String, Long> statusCounts;
    private Map<String, Long> severityCounts;
    private Map<String, Long> typeCounts;
    private double averageResolutionTime;
    private LocalDateTime generatedAt;
    
    public AlertStatistics() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private AlertStatistics stats = new AlertStatistics();
        public Builder totalAlerts(long v) { stats.totalAlerts = v; return this; }
        public Builder statusCounts(Map<String, Long> v) { stats.statusCounts = v; return this; }
        public Builder severityCounts(Map<String, Long> v) { stats.severityCounts = v; return this; }
        public Builder typeCounts(Map<String, Long> v) { stats.typeCounts = v; return this; }
        public Builder averageResolutionTime(double v) { stats.averageResolutionTime = v; return this; }
        public Builder generatedAt(LocalDateTime v) { stats.generatedAt = v; return this; }
        public AlertStatistics build() { return stats; }
    }
    
    // Getters
    public long getTotalAlerts() { return totalAlerts; }
    public Map<String, Long> getStatusCounts() { return statusCounts; }
    public Map<String, Long> getSeverityCounts() { return severityCounts; }
    public Map<String, Long> getTypeCounts() { return typeCounts; }
    public double getAverageResolutionTime() { return averageResolutionTime; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
}
