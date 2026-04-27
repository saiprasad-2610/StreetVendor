package com.smc.svms.dto;

import lombok.Data;

@Data
public class PaymentVerificationRequest {
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private Long challanId;
    private Long vendorId;
    private Boolean isRent;
    
    // Explicit getters for compilation
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public String getRazorpaySignature() { return razorpaySignature; }
    public Boolean getIsRent() { return isRent; }
    public Long getVendorId() { return vendorId; }
    public Long getChallanId() { return challanId; }
}
