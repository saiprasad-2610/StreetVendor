package com.smc.svms.service;

import com.smc.svms.dto.ScanRequest;
import com.smc.svms.dto.ScanValidationResponse;
import com.smc.svms.entity.Vendor;
import com.smc.svms.enums.ValidationStatus;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScanServiceImpl implements ScanService {

    private final VendorRepository vendorRepository;
    private final ChallanService challanService;

    @Value("${app.location.threshold-meters}")
    private double thresholdMeters;

    @Override
    @Transactional
    public ScanValidationResponse validateVendorLocation(ScanRequest request) {
        Vendor vendor = vendorRepository.findByVendorId(request.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + request.getVendorId()));

        if (vendor.getLocation() == null) {
            throw new RuntimeException("Vendor has no registered location");
        }

        double distance = GeoUtils.calculateDistance(
                request.getLatitude(), 
                request.getLongitude(),
                vendor.getLocation().getLatitude().doubleValue(),
                vendor.getLocation().getLongitude().doubleValue()
        );

        ValidationStatus status = distance <= thresholdMeters ? ValidationStatus.VALID : ValidationStatus.INVALID;
        String message = status == ValidationStatus.VALID ? 
                "Vendor is in correct location." : 
                "Vendor is outside designated area (Distance: " + Math.round(distance) + "m)";

        // If location is invalid, issue an automatic challan
        if (status == ValidationStatus.INVALID) {
            String locationStr = String.format("%.4f, %.4f", request.getLatitude(), request.getLongitude());
            challanService.issueAutomaticChallan(
                vendor, 
                "Location Mismatch: Vendor found at " + locationStr + " instead of registered location", 
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
}
