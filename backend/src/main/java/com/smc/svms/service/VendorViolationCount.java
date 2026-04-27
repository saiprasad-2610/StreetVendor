package com.smc.svms.service;

public class VendorViolationCount {
    private Long vendorId;
    private String vendorName;
    private Long violationCount;
    
    public VendorViolationCount() {}
    
    public VendorViolationCount(Long vendorId, String vendorName, Long violationCount) {
        this.vendorId = vendorId;
        this.vendorName = vendorName;
        this.violationCount = violationCount;
    }
    
    // Getters and Setters
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    
    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }
    
    public Long getViolationCount() { return violationCount; }
    public void setViolationCount(Long violationCount) { this.violationCount = violationCount; }
}
