package com.smc.svms.service;

import java.time.LocalDateTime;

public class VendorStats {
    private Long totalVendors;
    private Long activeVendors;
    private Long pendingVendors;
    private Long inactiveVendors;
    private java.util.Map<String, Long> vendorsByCategory;
    private long newVendorsThisMonth;
    private LocalDateTime lastUpdated;
    
    public VendorStats() {
        this.lastUpdated = LocalDateTime.now();
    }
    
    public VendorStats(Long totalVendors, Long activeVendors, Long pendingVendors) {
        this.totalVendors = totalVendors;
        this.activeVendors = activeVendors;
        this.pendingVendors = pendingVendors;
        this.lastUpdated = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getTotalVendors() { return totalVendors; }
    public void setTotalVendors(Long totalVendors) { this.totalVendors = totalVendors; }
    
    public Long getActiveVendors() { return activeVendors; }
    public void setActiveVendors(Long activeVendors) { this.activeVendors = activeVendors; }
    
    public Long getPendingVendors() { return pendingVendors; }
    public void setPendingVendors(Long pendingVendors) { this.pendingVendors = pendingVendors; }
    
    public Long getInactiveVendors() { return inactiveVendors; }
    public void setInactiveVendors(Long inactiveVendors) { this.inactiveVendors = inactiveVendors; }
    
    public java.util.Map<String, Long> getVendorsByCategory() { return vendorsByCategory; }
    public void setVendorsByCategory(java.util.Map<String, Long> vendorsByCategory) { this.vendorsByCategory = vendorsByCategory; }
    
    public long getNewVendorsThisMonth() { return newVendorsThisMonth; }
    public void setNewVendorsThisMonth(long newVendorsThisMonth) { this.newVendorsThisMonth = newVendorsThisMonth; }
    
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    
    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long totalVendors;
        private Long activeVendors;
        private Long pendingVendors;
        private Long inactiveVendors;
        private java.util.Map<String, Long> vendorsByCategory;
        private long newVendorsThisMonth;
        private LocalDateTime lastUpdated;
        
        public Builder totalVendors(Long totalVendors) {
            this.totalVendors = totalVendors;
            return this;
        }
        
        public Builder activeVendors(Long activeVendors) {
            this.activeVendors = activeVendors;
            return this;
        }
        
        public Builder pendingVendors(Long pendingVendors) {
            this.pendingVendors = pendingVendors;
            return this;
        }
        
        public Builder inactiveVendors(Long inactiveVendors) {
            this.inactiveVendors = inactiveVendors;
            return this;
        }
        
        public Builder suspendedVendors(long suspendedVendors) {
            this.inactiveVendors = suspendedVendors;
            return this;
        }
        
        public Builder vendorsByCategory(java.util.Map<String, Long> vendorsByCategory) {
            this.vendorsByCategory = vendorsByCategory;
            return this;
        }
        
        public Builder newVendorsThisMonth(long newVendorsThisMonth) {
            this.newVendorsThisMonth = newVendorsThisMonth;
            return this;
        }
        
        public Builder lastUpdated(LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
            return this;
        }
        
        public VendorStats build() {
            VendorStats stats = new VendorStats();
            stats.totalVendors = this.totalVendors;
            stats.activeVendors = this.activeVendors;
            stats.pendingVendors = this.pendingVendors;
            stats.inactiveVendors = this.inactiveVendors;
            stats.vendorsByCategory = this.vendorsByCategory;
            stats.newVendorsThisMonth = this.newVendorsThisMonth;
            stats.lastUpdated = this.lastUpdated;
            return stats;
        }
    }
}
