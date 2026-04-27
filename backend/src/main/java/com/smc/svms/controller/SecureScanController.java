package com.smc.svms.controller;

import com.smc.svms.dto.ScanValidationResponse;
import com.smc.svms.service.LocationValidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
@Slf4j
public class SecureScanController {

    private final LocationValidationService locationValidationService;

    @PostMapping("/upload-and-validate")
    public ResponseEntity<ScanValidationResponse> uploadAndValidate(
            @RequestParam("vendorId") String vendorId,
            @RequestParam("latitude") double latitude,
            @RequestParam("longitude") double longitude,
            @RequestParam("gpsAccuracy") Double gpsAccuracy,
            @RequestParam("deviceId") String deviceId,
            @RequestParam("weatherCondition") String weatherCondition,
            @RequestParam("image") MultipartFile image) {
        
        log.info("Secure scan validation with photo upload for vendor: {} at ({}, {}) with accuracy {}m", 
                vendorId, latitude, longitude, gpsAccuracy);
        
        try {
            // Basic image validation
            if (image == null || image.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("❌ FRAUD DETECTED: No photo provided. Real camera capture is mandatory."));
            }
            
            // Check image format
            String contentType = image.getContentType();
            if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("❌ FRAUD DETECTED: Invalid image format. Only JPEG/PNG allowed."));
            }
            
            // Check image size (basic fraud detection)
            if (image.getSize() < 50 * 1024) { // Less than 50KB might be a screenshot
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("❌ FRAUD DETECTED: Image too small. Real camera capture required."));
            }
            
            // Calculate real distance and validate vendor location
            LocationValidationService.LocationValidationResult validationResult = 
                locationValidationService.validateVendorLocation(vendorId, latitude, longitude);
            
            // Convert validation result to response DTO
            ScanValidationResponse response = ScanValidationResponse.builder()
                .vendorId(validationResult.getVendorId())
                .vendorName(validationResult.getVendorName())
                .category(validationResult.getCategory())
                .validationStatus(validationResult.getValidationStatus())
                .distance(validationResult.getDistance())
                .message(validationResult.getMessage())
                .build();
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error in secure scan validation", e);
            return ResponseEntity.badRequest()
                .body(createErrorResponse("Validation failed: " + e.getMessage()));
        }
    }

    @GetMapping("/algorithm-info")
    public ResponseEntity<String> getAlgorithmInfo() {
        return ResponseEntity.ok("Secure Photo Validation System Active - Real-time camera capture required");
    }
    
    private ScanValidationResponse createErrorResponse(String message) {
        return ScanValidationResponse.builder()
            .validationStatus(com.smc.svms.enums.ValidationStatus.INVALID)
            .message(message)
            .build();
    }
}
