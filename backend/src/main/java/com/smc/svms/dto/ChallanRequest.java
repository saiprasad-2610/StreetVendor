package com.smc.svms.dto;

import java.math.BigDecimal;

public class ChallanRequest {
    private String vendorId;
    private BigDecimal fineAmount;
    private String reason;
    private String location;
    private String imageProofUrl;
    
    public ChallanRequest() {}
    
    // Getters and Setters
    public String getVendorId() { return vendorId; }
    public void setVendorId(String vendorId) { this.vendorId = vendorId; }
    
    public BigDecimal getFineAmount() { return fineAmount; }
    public void setFineAmount(BigDecimal fineAmount) { this.fineAmount = fineAmount; }
    
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    
    public String getImageProofUrl() { return imageProofUrl; }
    public void setImageProofUrl(String imageProofUrl) { this.imageProofUrl = imageProofUrl; }
}
