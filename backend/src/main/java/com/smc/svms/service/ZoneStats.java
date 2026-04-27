package com.smc.svms.service;

import java.time.LocalDateTime;

public class ZoneStats {
    private Long totalZones;
    private Long activeZones;
    private Long inactiveZones;
    private Long zonesWithCapacity;
    private java.util.List<ZoneCapacity> topUtilizedZones;
    private java.util.Map<String, Long> zonesByType;
    private LocalDateTime lastUpdated;
    
    public ZoneStats() {
        this.lastUpdated = LocalDateTime.now();
    }
    
    public ZoneStats(Long totalZones, Long activeZones, Long inactiveZones) {
        this.totalZones = totalZones;
        this.activeZones = activeZones;
        this.inactiveZones = inactiveZones;
        this.lastUpdated = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getTotalZones() { return totalZones; }
    public void setTotalZones(Long totalZones) { this.totalZones = totalZones; }
    
    public Long getActiveZones() { return activeZones; }
    public void setActiveZones(Long activeZones) { this.activeZones = activeZones; }
    
    public Long getInactiveZones() { return inactiveZones; }
    public void setInactiveZones(Long inactiveZones) { this.inactiveZones = inactiveZones; }
    
    public Long getZonesWithCapacity() { return zonesWithCapacity; }
    public void setZonesWithCapacity(Long zonesWithCapacity) { this.zonesWithCapacity = zonesWithCapacity; }
    
    public java.util.List<ZoneCapacity> getTopUtilizedZones() { return topUtilizedZones; }
    public void setTopUtilizedZones(java.util.List<ZoneCapacity> topUtilizedZones) { this.topUtilizedZones = topUtilizedZones; }
    
    public java.util.Map<String, Long> getZonesByType() { return zonesByType; }
    public void setZonesByType(java.util.Map<String, Long> zonesByType) { this.zonesByType = zonesByType; }
    
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    
    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long totalZones;
        private Long activeZones;
        private Long inactiveZones;
        private Long zonesWithCapacity;
        private java.util.List<ZoneCapacity> topUtilizedZones;
        private java.util.Map<String, Long> zonesByType;
        private LocalDateTime lastUpdated;
        
        public Builder totalZones(Long totalZones) {
            this.totalZones = totalZones;
            return this;
        }
        
        public Builder activeZones(Long activeZones) {
            this.activeZones = activeZones;
            return this;
        }
        
        public Builder inactiveZones(Long inactiveZones) {
            this.inactiveZones = inactiveZones;
            return this;
        }
        
        public Builder zonesWithCapacity(Long zonesWithCapacity) {
            this.zonesWithCapacity = zonesWithCapacity;
            return this;
        }
        
        public Builder topUtilizedZones(java.util.List<ZoneCapacity> topUtilizedZones) {
            this.topUtilizedZones = topUtilizedZones;
            return this;
        }
        
        public Builder zonesByType(java.util.Map<String, Long> zonesByType) {
            this.zonesByType = zonesByType;
            return this;
        }
        
        public Builder lastUpdated(LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
            return this;
        }
        
        public ZoneStats build() {
            ZoneStats stats = new ZoneStats();
            stats.totalZones = this.totalZones;
            stats.activeZones = this.activeZones;
            stats.inactiveZones = this.inactiveZones;
            stats.zonesWithCapacity = this.zonesWithCapacity;
            stats.topUtilizedZones = this.topUtilizedZones;
            stats.zonesByType = this.zonesByType;
            stats.lastUpdated = this.lastUpdated;
            return stats;
        }
    }
}
