package com.smc.svms.service;

import com.smc.svms.dto.ScanRequest;
import com.smc.svms.dto.ScanValidationResponse;
import com.smc.svms.entity.Vendor;
import com.smc.svms.enums.ValidationStatus;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.util.GeoUtils;
import com.smc.svms.util.ReverseGeocodingUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScanServiceImpl implements ScanService {

    private final VendorRepository vendorRepository;
    private final ChallanService challanService;
    private final ReverseGeocodingUtil reverseGeocodingUtil;

    @Value("${app.location.threshold-meters}")
    private double thresholdMeters;

    @Value("${app.expected-city:Solapur}")
    private String expectedCity;

    @Override
    @Transactional
    public ScanValidationResponse validateVendorLocation(ScanRequest request) {
        Vendor vendor = vendorRepository.findByVendorId(request.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + request.getVendorId()));

        if (vendor.getLocation() == null) {
            throw new RuntimeException("Vendor has no registered location");
        }

        // Validate city using reverse geocoding to prevent location spoofing
        String detectedCity = reverseGeocodingUtil.getCityFromCoordinates(
                request.getLatitude(), request.getLongitude());

        // Log detected city for debugging
        if (detectedCity != null) {
            System.out.println("Detected city from coordinates: " + detectedCity);
        }

        double distance = GeoUtils.calculateDistance(
                request.getLatitude(),
                request.getLongitude(),
                vendor.getLocation().getLatitude().doubleValue(),
                vendor.getLocation().getLongitude().doubleValue()
        );

        // Calculate adaptive threshold based on GPS accuracy
        double adaptiveThreshold = calculateAdaptiveThreshold(request.getGpsAccuracy(), distance);

        ValidationStatus status = distance <= adaptiveThreshold ? ValidationStatus.VALID : ValidationStatus.INVALID;
        String message = generateValidationMessage(status, distance, adaptiveThreshold, request.getGpsAccuracy(), detectedCity);

        // If location is invalid, issue an automatic challan
        if (status == ValidationStatus.INVALID) {
            String locationStr = String.format("%.4f, %.4f", request.getLatitude(), request.getLongitude());
            String cityInfo = detectedCity != null ? " (Detected: " + detectedCity + ")" : "";
            challanService.issueAutomaticChallan(
                vendor,
                "Location Mismatch: Vendor found at " + locationStr + cityInfo + " instead of registered location",
                locationStr,
                request.getImageProofUrl()
            );
        }

        return ScanValidationResponse.builder()
                .vendorId(vendor.getVendorId())
                .vendorName(vendor.getName())
                .category(vendor.getCategory().name())
                .validationStatus(status)
                .distance(distance)
                .message(message)
                .build();
    }

    /**
     * Calculate adaptive threshold based on GPS accuracy
     * Poor GPS accuracy = more lenient threshold to avoid false positives
     */
    private double calculateAdaptiveThreshold(Double gpsAccuracy, double distance) {
        double threshold = thresholdMeters;

        if (gpsAccuracy != null) {
            if (gpsAccuracy <= 5) {
                // Excellent GPS - use stricter threshold
                threshold *= 0.8;
            } else if (gpsAccuracy <= 10) {
                // Good GPS - normal threshold
                threshold *= 1.0;
            } else if (gpsAccuracy <= 20) {
                // Acceptable GPS - more lenient threshold
                threshold *= 1.5;
            } else {
                // Poor GPS - very lenient threshold
                threshold *= 2.0;
            }
        }

        // Adjust threshold based on distance (farther distances get more leniency)
        if (distance > 100) {
            threshold *= 1.2;
        } else if (distance > 50) {
            threshold *= 1.1;
        }

        return threshold;
    }

    /**
     * Generate validation message with GPS accuracy and city information
     */
    private String generateValidationMessage(ValidationStatus status, double distance, double threshold, Double gpsAccuracy, String detectedCity) {
        String cityInfo = detectedCity != null ? " (Location: " + detectedCity + ")" : "";
        if (status == ValidationStatus.VALID) {
            return String.format("Vendor is in correct location%s. (Distance: %.1fm, GPS Accuracy: ±%.1fm)",
                    cityInfo, distance, gpsAccuracy != null ? gpsAccuracy : 0);
        } else {
            return String.format("Vendor is outside designated area%s (Distance: %.1fm, Threshold: %.1fm, GPS Accuracy: ±%.1fm)",
                    cityInfo, distance, threshold, gpsAccuracy != null ? gpsAccuracy : 0);
        }
    }
}
