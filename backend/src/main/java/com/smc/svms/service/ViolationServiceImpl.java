package com.smc.svms.service;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import com.smc.svms.dto.ViolationRequest;
import com.smc.svms.entity.User;
import com.smc.svms.entity.Vendor;
import com.smc.svms.entity.Violation;
import com.smc.svms.enums.ValidationStatus;
import com.smc.svms.repository.UserRepository;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.repository.ViolationRepository;
import com.smc.svms.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ViolationServiceImpl implements ViolationService {

    private final ViolationRepository violationRepository;
    private final VendorRepository vendorRepository;
    private final UserRepository userRepository;
    private final ChallanService challanService;
    private final FileStorageService fileStorageService;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.location.threshold-meters}")
    private double thresholdMeters;

    @Override
    @Transactional
    public Violation reportViolation(ViolationRequest request, MultipartFile image) {
        log.info("Reporting violation for vendor: {} by reporter: {}", request.getVendorId(), request.getReporterName());
        
        String imageProofUrl = null;
        if (image != null && !image.isEmpty()) {
            String fileName = fileStorageService.storeFile(image);
            imageProofUrl = baseUrl + "/api/files/violations/" + fileName;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User reporter = null;
        
        if (authentication != null && authentication.isAuthenticated() && 
            !(authentication instanceof AnonymousAuthenticationToken)) {
            String username = authentication.getName();
            reporter = userRepository.findByUsername(username).orElse(null);
        }

        Vendor vendor = vendorRepository.findByVendorId(request.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + request.getVendorId()));

        // Auto-validate violation based on distance
        double distance = GeoUtils.calculateDistance(
                request.getGpsLatitude(),
                request.getGpsLongitude(),
                vendor.getLocation().getLatitude().doubleValue(),
                vendor.getLocation().getLongitude().doubleValue()
        );

        ValidationStatus validationStatus = distance > thresholdMeters ? ValidationStatus.VALID : ValidationStatus.INVALID;

        Violation violation = Violation.builder()
                .vendor(vendor)
                .reportedBy(reporter)
                .reporterName(request.getReporterName())
                .reporterPhone(request.getReporterPhone())
                .imageProofUrl(imageProofUrl != null ? imageProofUrl : request.getImageProofUrl())
                .gpsLatitude(BigDecimal.valueOf(request.getGpsLatitude()))
                .gpsLongitude(BigDecimal.valueOf(request.getGpsLongitude()))
                .description(request.getDescription())
                .capturedAt(request.getCapturedAt() != null ? request.getCapturedAt() : LocalDateTime.now())
                .validationStatus(validationStatus)
                .build();

        Violation savedViolation = violationRepository.save(violation);

        // Note: Automatic fine is already handled by ScanService during the initial scan phase.
        // We only record the violation details here for evidence.

        return savedViolation;
    }

    @Override
    public List<Violation> getAllViolations() {
        return violationRepository.findAll();
    }

    @Override
    public List<Violation> getViolationsByVendorId(String vendorId) {
        return violationRepository.findByVendorVendorId(vendorId);
    }
}
