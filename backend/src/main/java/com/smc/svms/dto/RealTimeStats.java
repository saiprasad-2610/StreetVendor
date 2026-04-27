package com.smc.svms.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class RealTimeStats {
    
    private Long activeVendors;
    private Long vendorsInZones;
    private Long vendorsInTransit;
    private Long activeViolations;
    private Long pendingAlerts;
    private Long activeOfficers;
    private List<Map<String, Object>> zoneActivity;
    private List<Map<String, Object>> recentViolations;
    private List<Map<String, Object>> systemAlerts;
    private BigDecimal systemLoad;
    private LocalDateTime timestamp;
    
    public RealTimeStats() {
        this.timestamp = LocalDateTime.now();
    }
    
    public RealTimeStats(Long activeVendors, Long vendorsInZones, Long activeViolations) {
        this.activeVendors = activeVendors;
        this.vendorsInZones = vendorsInZones;
        this.activeViolations = activeViolations;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getActiveVendors() { return activeVendors; }
    public void setActiveVendors(Long activeVendors) { this.activeVendors = activeVendors; }
    
    public Long getVendorsInZones() { return vendorsInZones; }
    public void setVendorsInZones(Long vendorsInZones) { this.vendorsInZones = vendorsInZones; }
    
    public Long getVendorsInTransit() { return vendorsInTransit; }
    public void setVendorsInTransit(Long vendorsInTransit) { this.vendorsInTransit = vendorsInTransit; }
    
    public Long getActiveViolations() { return activeViolations; }
    public void setActiveViolations(Long activeViolations) { this.activeViolations = activeViolations; }
    
    public Long getPendingAlerts() { return pendingAlerts; }
    public void setPendingAlerts(Long pendingAlerts) { this.pendingAlerts = pendingAlerts; }
    
    public Long getActiveOfficers() { return activeOfficers; }
    public void setActiveOfficers(Long activeOfficers) { this.activeOfficers = activeOfficers; }
    
    public List<Map<String, Object>> getZoneActivity() { return zoneActivity; }
    public void setZoneActivity(List<Map<String, Object>> zoneActivity) { this.zoneActivity = zoneActivity; }
    
    public List<Map<String, Object>> getRecentViolations() { return recentViolations; }
    public void setRecentViolations(List<Map<String, Object>> recentViolations) { this.recentViolations = recentViolations; }
    
    public List<Map<String, Object>> getSystemAlerts() { return systemAlerts; }
    public void setSystemAlerts(List<Map<String, Object>> systemAlerts) { this.systemAlerts = systemAlerts; }
    
    public BigDecimal getSystemLoad() { return systemLoad; }
    public void setSystemLoad(BigDecimal systemLoad) { this.systemLoad = systemLoad; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
