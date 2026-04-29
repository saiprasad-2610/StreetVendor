package com.smc.svms.controller;

import com.smc.svms.dto.ScanRequest;
import com.smc.svms.dto.ScanValidationResponse;
import com.smc.svms.service.LocationValidationService;
import com.smc.svms.service.ScanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
@Slf4j
public class SecureScanController {

    private final LocationValidationService locationValidationService;
    private final ScanService scanService;

    @PostMapping("/upload-and-validate")
    public ResponseEntity<ScanValidationResponse> uploadAndValidate(
            @RequestParam("vendorId") String vendorId,
            @RequestParam("latitude") double latitude,
            @RequestParam("longitude") double longitude,
            @RequestParam("gpsAccuracy") Double gpsAccuracy,
            @RequestParam("deviceId") String deviceId,
            @RequestParam("weatherCondition") String weatherCondition,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "photoCount", required = false) Integer photoCount,
            @RequestParam(value = "scannerType", required = false) String scannerType,
            @RequestParam(value = "scannerId", required = false) String scannerId,
            @RequestParam(value = "scannerName", required = false) String scannerName,
            @RequestParam(value = "sessionToken", required = false) String sessionToken) {
        
        // Determine scanner type for fraud prevention
        ScanRequest.ScannerType type = determineScannerType(scannerType, scannerId);
        
        log.info("Secure scan validation for vendor: {} at ({}, {}) by scanner: {} (Type: {}) - Photos: {}", 
                vendorId, latitude, longitude, scannerId, type, photoCount);
        
        try {
            // FRAUD PREVENTION: Log scan attempt for audit trail
            log.info("Scan attempt - Vendor: {}, Scanner Type: {}, Scanner ID: {}, Device: {}, Photo Count: {}", 
                    vendorId, type, scannerId, deviceId, photoCount);
            
            // Validate images - support both single 'image' and multiple 'images'
            List<MultipartFile> imageList = new ArrayList<>();
            if (images != null && !images.isEmpty()) {
                imageList.addAll(images);
            } else if (image != null && !image.isEmpty()) {
                imageList.add(image);
            }
            
            // Require at least 2 photos for fraud prevention
            if (imageList.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("❌ FRAUD DETECTED: No photo provided. Real camera capture is mandatory."));
            }
            
            if (imageList.size() < 2) {
                return ResponseEntity.badRequest()
                    .body(createErrorResponse("❌ MINIMUM 2 PHOTOS REQUIRED: Please capture at least 2 photos from different angles for fraud prevention."));
            }
            
            // Validate all images
            for (int i = 0; i < imageList.size(); i++) {
                MultipartFile img = imageList.get(i);
                
                // Check image format
                String contentType = img.getContentType();
                if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
                    return ResponseEntity.badRequest()
                        .body(createErrorResponse("❌ FRAUD DETECTED: Photo " + (i + 1) + " has invalid format. Only JPEG/PNG allowed."));
                }
                
                // Check image size (basic fraud detection)
                if (img.getSize() < 50 * 1024) { // Less than 50KB might be a screenshot
                    return ResponseEntity.badRequest()
                        .body(createErrorResponse("❌ FRAUD DETECTED: Photo " + (i + 1) + " is too small. Real camera capture required."));
                }
            }
            
            // Log all photos received
            log.info("Received {} photos for vendor {} validation", imageList.size(), vendorId);
            
            // Build scan request with scanner info for fraud prevention
            ScanRequest scanRequest = new ScanRequest();
            scanRequest.setVendorId(vendorId);
            scanRequest.setLatitude(latitude);
            scanRequest.setLongitude(longitude);
            scanRequest.setGpsAccuracy(gpsAccuracy);
            scanRequest.setDeviceId(deviceId);
            scanRequest.setScannerType(type);
            scanRequest.setScannerId(scannerId);
            scanRequest.setScannerName(scannerName);
            scanRequest.setSessionToken(sessionToken);
            
            // Use ScanService for full validation with fraud prevention
            ScanValidationResponse response = scanService.validateVendorLocation(scanRequest);
            
            // Add photo count info to response message
            String updatedMessage = response.getMessage() + " [✅ " + imageList.size() + " Photos Verified]";
            return ResponseEntity.ok(ScanValidationResponse.builder()
                .vendorId(response.getVendorId())
                .vendorName(response.getVendorName())
                .category(response.getCategory())
                .validationStatus(response.getValidationStatus())
                .distance(response.getDistance())
                .message(updatedMessage)
                .confidence(response.getConfidence())
                .algorithmUsed(response.getAlgorithmUsed())
                .build());
            
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
    
    /**
     * Determine scanner type from request parameters
     * Defaults to PUBLIC_USER for unauthenticated scans (fraud prevention)
     */
    private ScanRequest.ScannerType determineScannerType(String scannerType, String scannerId) {
        if (scannerType == null || scannerType.isEmpty()) {
            return ScanRequest.ScannerType.PUBLIC_USER;
        }
        
        try {
            ScanRequest.ScannerType type = ScanRequest.ScannerType.valueOf(scannerType.toUpperCase());
            // Validate that authenticated types have proper IDs
            if ((type == ScanRequest.ScannerType.ENFORCEMENT_OFFICER || 
                 type == ScanRequest.ScannerType.VENDOR_SELF) && 
                (scannerId == null || scannerId.isEmpty())) {
                log.warn("Scanner type {} provided without scannerId - treating as PUBLIC_USER", type);
                return ScanRequest.ScannerType.PUBLIC_USER;
            }
            return type;
        } catch (IllegalArgumentException e) {
            log.warn("Invalid scanner type '{}', defaulting to PUBLIC_USER", scannerType);
            return ScanRequest.ScannerType.PUBLIC_USER;
        }
    }
}
