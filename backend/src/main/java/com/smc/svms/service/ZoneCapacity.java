package com.smc.svms.service;

public class ZoneCapacity {
    private Long zoneId;
    private String zoneName;
    private int currentVendors;
    private int maxVendors;
    private double utilizationRate;
    private boolean isFull;
    
    public ZoneCapacity() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private ZoneCapacity c = new ZoneCapacity();
        public Builder zoneId(Long v) { c.zoneId = v; return this; }
        public Builder zoneName(String v) { c.zoneName = v; return this; }
        public Builder currentVendors(int v) { c.currentVendors = v; return this; }
        public Builder maxVendors(int v) { c.maxVendors = v; return this; }
        public Builder utilizationRate(double v) { c.utilizationRate = v; return this; }
        public Builder isFull(boolean v) { c.isFull = v; return this; }
        public ZoneCapacity build() { return c; }
    }
    
    public Long getZoneId() { return zoneId; }
    public String getZoneName() { return zoneName; }
    public int getCurrentVendors() { return currentVendors; }
    public int getMaxVendors() { return maxVendors; }
    public double getUtilizationRate() { return utilizationRate; }
    public boolean isFull() { return isFull; }
}
