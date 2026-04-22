package com.smc.svms.controller;

import com.smc.svms.dto.ViolationRequest;
import com.smc.svms.entity.Violation;
import com.smc.svms.service.ViolationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/violations")
@RequiredArgsConstructor
public class ViolationController {

    private final ViolationService violationService;

    @PostMapping("/report")
    public ResponseEntity<?> reportViolation(
            @RequestParam("vendorId") String vendorId,
            @RequestParam("description") String description,
            @RequestParam("gpsLatitude") Double gpsLatitude,
            @RequestParam("gpsLongitude") Double gpsLongitude,
            @RequestParam(value = "reporterName", required = false) String reporterName,
            @RequestParam(value = "reporterPhone", required = false) String reporterPhone,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        
        ViolationRequest request = new ViolationRequest();
        request.setVendorId(vendorId);
        request.setDescription(description);
        request.setGpsLatitude(gpsLatitude);
        request.setGpsLongitude(gpsLongitude);
        request.setReporterName(reporterName);
        request.setReporterPhone(reporterPhone);
        request.setCapturedAt(LocalDateTime.now());

        violationService.reportViolation(request, image);
        return ResponseEntity.ok(Collections.singletonMap("message", "Violation reported successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<List<Violation>> getAllViolations() {
        return ResponseEntity.ok(violationService.getAllViolations());
    }

    @GetMapping("/vendor/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<List<Violation>> getViolationsByVendorId(@PathVariable String vendorId) {
        return ResponseEntity.ok(violationService.getViolationsByVendorId(vendorId));
    }
}
