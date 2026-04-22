package com.smc.svms.controller;

import com.smc.svms.dto.ScanRequest;
import com.smc.svms.dto.ScanValidationResponse;
import com.smc.svms.service.ScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
public class ScanController {

    private final ScanService scanService;

    @PostMapping("/validate")
    public ResponseEntity<ScanValidationResponse> validateLocation(@RequestBody ScanRequest request) {
        return ResponseEntity.ok(scanService.validateVendorLocation(request));
    }
}
