package com.smc.svms.dto;

public class ZoneCapacityInfo {
    private Long zoneId;
    private String zoneName;
    private Integer currentVendors;
    private Integer maxVendors;
    private Double utilizationRate;
    private Boolean isFull;
    private Boolean hasCapacityLimit;
    
    public ZoneCapacityInfo() {}
    
    public ZoneCapacityInfo(Long zoneId, String zoneName, Integer currentVendors, Integer maxVendors, Double utilizationRate, Boolean isFull, Boolean hasCapacityLimit) {
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.currentVendors = currentVendors;
        this.maxVendors = maxVendors;
        this.utilizationRate = utilizationRate;
        this.isFull = isFull;
        this.hasCapacityLimit = hasCapacityLimit;
    }
    
    // Getters and Setters
    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }
    
    public String getZoneName() { return zoneName; }
    public void setZoneName(String zoneName) { this.zoneName = zoneName; }
    
    public Integer getCurrentVendors() { return currentVendors; }
    public void setCurrentVendors(Integer currentVendors) { this.currentVendors = currentVendors; }
    
    public Integer getMaxVendors() { return maxVendors; }
    public void setMaxVendors(Integer maxVendors) { this.maxVendors = maxVendors; }
    
    public Double getUtilizationRate() { return utilizationRate; }
    public void setUtilizationRate(Double utilizationRate) { this.utilizationRate = utilizationRate; }
    
    public Boolean getIsFull() { return isFull; }
    public void setIsFull(Boolean isFull) { this.isFull = isFull; }
    
    public Boolean getHasCapacityLimit() { return hasCapacityLimit; }
    public void setHasCapacityLimit(Boolean hasCapacityLimit) { this.hasCapacityLimit = hasCapacityLimit; }
    
    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long zoneId;
        private String zoneName;
        private Integer currentVendors;
        private Integer maxVendors;
        private Double utilizationRate;
        private Boolean isFull;
        private Boolean hasCapacityLimit;
        
        public Builder zoneId(Long zoneId) {
            this.zoneId = zoneId;
            return this;
        }
        
        public Builder zoneName(String zoneName) {
            this.zoneName = zoneName;
            return this;
        }
        
        public Builder currentVendors(Integer currentVendors) {
            this.currentVendors = currentVendors;
            return this;
        }
        
        public Builder maxVendors(Integer maxVendors) {
            this.maxVendors = maxVendors;
            return this;
        }
        
        public Builder utilizationRate(Double utilizationRate) {
            this.utilizationRate = utilizationRate;
            return this;
        }
        
        public Builder isFull(Boolean isFull) {
            this.isFull = isFull;
            return this;
        }
        
        public Builder hasCapacityLimit(Boolean hasCapacityLimit) {
            this.hasCapacityLimit = hasCapacityLimit;
            return this;
        }
        
        public ZoneCapacityInfo build() {
            return new ZoneCapacityInfo(zoneId, zoneName, currentVendors, maxVendors, utilizationRate, isFull, hasCapacityLimit);
        }
    }
}
