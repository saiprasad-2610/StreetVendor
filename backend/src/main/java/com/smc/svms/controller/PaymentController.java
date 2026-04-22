package com.smc.svms.controller;

import com.razorpay.RazorpayException;
import com.smc.svms.dto.PaymentOrderResponse;
import com.smc.svms.dto.PaymentVerificationRequest;
import com.smc.svms.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create-order/{challanId}")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<PaymentOrderResponse> createOrder(@PathVariable Long challanId) throws RazorpayException {
        return ResponseEntity.ok(paymentService.createOrder(challanId));
    }

    @PostMapping("/create-rent-order/{vendorId}")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<PaymentOrderResponse> createRentOrder(@PathVariable Long vendorId) throws RazorpayException {
        return ResponseEntity.ok(paymentService.createRentOrder(vendorId));
    }

    @PostMapping("/verify")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Boolean> verifyPayment(@RequestBody PaymentVerificationRequest request) {
        return ResponseEntity.ok(paymentService.verifyPayment(request));
    }

    @GetMapping("/rent-payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<java.util.List<com.smc.svms.entity.RentPayment>> getAllRentPayments() {
        return ResponseEntity.ok(paymentService.getAllRentPayments());
    }

    @GetMapping("/my-rent-payments")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<java.util.List<com.smc.svms.entity.RentPayment>> getMyRentPayments(java.security.Principal principal) {
        return ResponseEntity.ok(paymentService.getMyRentPayments(principal.getName()));
    }
}
