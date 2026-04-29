package com.smc.svms.controller;

import com.smc.svms.dto.RentHistoryDTO;
import com.smc.svms.entity.RentPayment;
import com.smc.svms.repository.RentPaymentRepository;
import com.smc.svms.service.RentService;
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
    private final RentService rentService;

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

    /**
     * Get complete rent history from registration date to now
     * Shows all months with paid/pending status
     */
    @GetMapping("/history/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER', 'VENDOR')")
    public ResponseEntity<List<RentHistoryDTO>> getRentHistory(@PathVariable String vendorId) {
        return ResponseEntity.ok(rentService.getRentHistory(vendorId));
    }

    /**
     * Get rent summary with totals and pending amounts
     */
    @GetMapping("/summary/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER', 'VENDOR')")
    public ResponseEntity<RentService.RentSummaryDTO> getRentSummary(@PathVariable String vendorId) {
        return ResponseEntity.ok(rentService.getRentSummary(vendorId));
    }
}
