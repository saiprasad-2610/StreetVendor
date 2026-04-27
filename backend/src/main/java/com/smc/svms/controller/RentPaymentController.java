package com.smc.svms.controller;

import com.smc.svms.entity.RentPayment;
import com.smc.svms.repository.RentPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rent-payments")
@RequiredArgsConstructor
public class RentPaymentController {

    private final RentPaymentRepository rentPaymentRepository;

    @GetMapping("/vendor/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER', 'VENDOR')")
    public ResponseEntity<List<RentPayment>> getPaymentsByVendorId(@PathVariable Long vendorId) {
        return ResponseEntity.ok(rentPaymentRepository.findByVendorId(vendorId));
    }

    @GetMapping("/vendor/vendor-id/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER', 'VENDOR')")
    public ResponseEntity<List<RentPayment>> getPaymentsByVendorVendorId(@PathVariable String vendorId) {
        return ResponseEntity.ok(rentPaymentRepository.findByVendorVendorId(vendorId));
    }
}
