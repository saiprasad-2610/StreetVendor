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
}
