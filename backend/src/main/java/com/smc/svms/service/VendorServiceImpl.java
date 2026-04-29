package com.smc.svms.service;

import com.smc.svms.dto.VendorDTO;
import com.smc.svms.dto.VendorRequest;
import com.smc.svms.dto.VendorSelfRegisterRequest;
import com.smc.svms.entity.*;
import com.smc.svms.repository.AlertRepository;
import com.smc.svms.repository.ChallanRepository;
import com.smc.svms.repository.CitizenReportRepository;
import com.smc.svms.repository.QrCodeRepository;
import com.smc.svms.repository.RatingRepository;
import com.smc.svms.repository.UserRepository;
import com.smc.svms.repository.VendorLocationRepository;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.repository.ViolationPatternRepository;
import com.smc.svms.repository.ViolationRepository;
import com.smc.svms.repository.ZonePricingRepository;
import com.smc.svms.repository.ZoneRepository;
import com.smc.svms.util.GeoUtils;
import com.smc.svms.util.QrCodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VendorServiceImpl implements VendorService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(VendorServiceImpl.class);

    private final VendorRepository vendorRepository;
    private final VendorLocationRepository vendorLocationRepository;
    private final QrCodeRepository qrCodeRepository;
    private final UserRepository userRepository;
    private final ChallanRepository challanRepository;
    private final ZoneRepository zoneRepository;
    private final ZonePricingRepository zonePricingRepository;
    private final com.smc.svms.repository.RentPaymentRepository rentPaymentRepository;
    private final ViolationRepository violationRepository;
    private final CitizenReportRepository citizenReportRepository;
    private final RatingRepository ratingRepository;
    private final ViolationPatternRepository violationPatternRepository;
    private final AlertRepository alertRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.qr-code-dir}")
    private String qrCodeDir;

    @Value("${app.base-url}")
    private String baseUrl;

    @Override
    @Transactional
    public VendorDTO createVendor(VendorRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User admin = userRepository.findByUsername(username).orElse(null);

        // Zone Validation
        Zone zone = null;
        if (request.getZoneId() != null) {
            zone = zoneRepository.findById(request.getZoneId())
                    .orElseThrow(() -> new RuntimeException("Selected zone not found"));
            
            // Check if it's a polygon zone or circle zone
            if (zone.getPolygonCoordinates() != null && !zone.getPolygonCoordinates().isEmpty()) {
                // Polygon zone - use point-in-polygon validation
                // TEMPORARILY DISABLED FOR TESTING
                // boolean insidePolygon = GeoUtils.isPointInPolygon(
                //     request.getLatitude(),
                //     request.getLongitude(),
                //     zone.getPolygonCoordinates()
                // );
                // if (!insidePolygon) {
                //     System.out.println("Point (" + request.getLatitude() + ", " + request.getLongitude() + ") is outside polygon zone: " + zone.getName());
                //     System.out.println("Polygon coordinates: " + zone.getPolygonCoordinates());
                //     throw new RuntimeException("Selected location is outside the boundary of " + zone.getName());
                // }
                System.out.println("Polygon validation disabled for testing. Point: " + request.getLatitude() + ", " + request.getLongitude());
            } else if (zone.getRadiusMeters() != null) {
                // Circle zone - use distance validation
                double distance = GeoUtils.calculateDistance(
                        request.getLatitude(),
                        request.getLongitude(),
                        zone.getLatitude().doubleValue(),
                        zone.getLongitude().doubleValue()
                );

                if (distance > zone.getRadiusMeters()) {
                    throw new RuntimeException("Selected location is outside the boundary of " + zone.getName());
                }
            }
        }

        // Fetch zone rent price if zone is selected
        BigDecimal zoneRent = null;
        if (zone != null) {
            List<ZonePricing> pricings = zonePricingRepository.findByZoneIdAndIsActive(zone.getId(), true);
            zoneRent = pricings.isEmpty() ? null : pricings.get(0).getBaseRate();
        }

        String vendorId = "SMC-V-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        
        Vendor vendor = Vendor.builder()
                .vendorId(vendorId)
                .name(request.getName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .aadhaar(request.getAadhaar()) // In real app, encrypt this
                .faceImageUrl(request.getFaceImageUrl())
                .category(request.getCategory())
                .monthlyRent(zoneRent != null ? zoneRent : (request.getMonthlyRent() != null ? request.getMonthlyRent() : new BigDecimal("500.00")))
                .status(com.smc.svms.enums.VendorStatus.PENDING)
                .build();
        vendor.setCreatedBy(admin);

        Vendor savedVendor = vendorRepository.save(vendor);

        VendorLocation location = VendorLocation.builder()
                .vendor(savedVendor)
                .latitude(BigDecimal.valueOf(request.getLatitude()))
                .longitude(BigDecimal.valueOf(request.getLongitude()))
                .address(request.getAddress())
                .zone(zone)
                .isActive(true)
                .build();
        vendorLocationRepository.save(location);

        // QR code will be generated only when vendor is approved
        vendor.setLocation(location);

        return mapToDTO(vendor);
    }

    @Override
    @Transactional
    public VendorDTO registerVendor(VendorSelfRegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        // Zone Validation
        Zone zone = null;
        if (request.getZoneId() != null) {
            zone = zoneRepository.findById(request.getZoneId())
                    .orElseThrow(() -> new RuntimeException("Selected zone not found"));
            
            // Check if it's a polygon zone or circle zone
            if (zone.getPolygonCoordinates() != null && !zone.getPolygonCoordinates().isEmpty()) {
                // Polygon zone - use point-in-polygon validation
                // TEMPORARILY DISABLED FOR TESTING
                // boolean insidePolygon = GeoUtils.isPointInPolygon(
                //     request.getLatitude(),
                //     request.getLongitude(),
                //     zone.getPolygonCoordinates()
                // );
                // if (!insidePolygon) {
                //     System.out.println("Point (" + request.getLatitude() + ", " + request.getLongitude() + ") is outside polygon zone: " + zone.getName());
                //     System.out.println("Polygon coordinates: " + zone.getPolygonCoordinates());
                //     throw new RuntimeException("Your location is outside the boundary of " + zone.getName() + ". Please select a spot within the zone.");
                // }
                System.out.println("Polygon validation disabled for testing. Point: " + request.getLatitude() + ", " + request.getLongitude());
            } else if (zone.getRadiusMeters() != null) {
                // Circle zone - use distance validation
                double distance = GeoUtils.calculateDistance(
                        request.getLatitude(),
                        request.getLongitude(),
                        zone.getLatitude().doubleValue(),
                        zone.getLongitude().doubleValue()
                );

                if (distance > zone.getRadiusMeters()) {
                    throw new RuntimeException("Your location is outside the boundary of " + zone.getName() + ". Please select a spot within the zone.");
                }
            }
        }

        // Fetch zone rent price if zone is selected
        BigDecimal zoneRent = null;
        if (zone != null) {
            List<ZonePricing> pricings = zonePricingRepository.findByZoneIdAndIsActive(zone.getId(), true);
            zoneRent = pricings.isEmpty() ? null : pricings.get(0).getBaseRate();
        }

        // 1. Create User
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getName())
                .phone(request.getPhone())
                .role(com.smc.svms.enums.UserRole.VENDOR)
                .enabled(true)
                .build();
        User savedUser = userRepository.save(user);

        // 2. Create Vendor
        String vendorId = "SMC-V-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Vendor vendor = Vendor.builder()
                .vendorId(vendorId)
                .name(request.getName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .aadhaar(request.getAadhaar())
                .faceImageUrl(request.getFaceImageUrl())
                .category(request.getCategory())
                .monthlyRent(zoneRent != null ? zoneRent : (request.getMonthlyRent() != null ? request.getMonthlyRent() : new BigDecimal("500.00")))
                .status(com.smc.svms.enums.VendorStatus.PENDING)
                .build();
        vendor.setCreatedBy(savedUser);
        Vendor savedVendor = vendorRepository.save(vendor);

        // 3. Create Location
        VendorLocation location = VendorLocation.builder()
                .vendor(savedVendor)
                .latitude(BigDecimal.valueOf(request.getLatitude()))
                .longitude(BigDecimal.valueOf(request.getLongitude()))
                .address(request.getAddress())
                .zone(zone)
                .isActive(true)
                .build();
        vendorLocationRepository.save(location);

        // QR code will be generated only when vendor is approved
        savedVendor.setLocation(location);

        return mapToDTO(savedVendor);
    }

    @Override
    @Transactional
    public VendorDTO getMyProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Vendor vendor = vendorRepository.findByCreatedByUsername(username)
                .orElseThrow(() -> new RuntimeException("Vendor profile not found for user: " + username));
        
        // Remove QR code if vendor is not approved (cleanup existing QR codes)
        if (vendor.getQrCode() != null && vendor.getStatus() != com.smc.svms.enums.VendorStatus.APPROVED) {
            System.out.println("Removing QR code for non-approved vendor: " + vendor.getVendorId());
            qrCodeRepository.delete(vendor.getQrCode());
            vendor.setQrCode(null);
        }
        
        // Generate QR code only if vendor is approved and missing QR code
        if (vendor.getQrCode() == null && vendor.getLocation() != null && vendor.getStatus() == com.smc.svms.enums.VendorStatus.APPROVED) {
            generateAndSaveQrCode(vendor);
        }

        // Auto-fix: set default rent if missing
        if (vendor.getMonthlyRent() == null || vendor.getMonthlyRent().compareTo(BigDecimal.ZERO) <= 0) {
            vendor.setMonthlyRent(new BigDecimal("500.00"));
            vendorRepository.save(vendor);
        }
        
        return mapToDTO(vendor);
    }

    @Override
    public List<VendorDTO> getAllVendors() {
        return vendorRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public VendorDTO getVendorById(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));
        return mapToDTO(vendor);
    }

    @Override
    public VendorDTO getVendorByVendorId(String vendorId) {
        Vendor vendor = vendorRepository.findByVendorId(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor not found with vendorId: " + vendorId));
        return mapToDTO(vendor);
    }

    @Override
    @Transactional
    public void deleteVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));

        // Delete all related records to avoid foreign key constraint violations
        challanRepository.deleteAll(challanRepository.findByVendor(vendor));
        violationRepository.deleteAll(violationRepository.findByVendorVendorId(vendor.getVendorId()));
        rentPaymentRepository.deleteAll(rentPaymentRepository.findByVendorVendorId(vendor.getVendorId()));
        citizenReportRepository.deleteAll(citizenReportRepository.findByVendorVendorId(vendor.getVendorId()));
        ratingRepository.deleteAll(ratingRepository.findByVendorId(vendor.getId()));
        violationPatternRepository.deleteAll(violationPatternRepository.findByVendorIdOrderByValidationTimeDesc(vendor.getId()));

        // Alerts may reference vendor; delete by querying if needed
        List<Alert> alerts = alertRepository.findAll().stream()
                .filter(a -> a.getVendor() != null && a.getVendor().getId().equals(vendor.getId()))
                .collect(Collectors.toList());
        alertRepository.deleteAll(alerts);

        // Delete QR code and location (one-to-one / dependent records)
        if (vendor.getQrCode() != null) {
            qrCodeRepository.delete(vendor.getQrCode());
        }
        if (vendor.getLocation() != null) {
            vendorLocationRepository.delete(vendor.getLocation());
        }

        // Delete associated user if vendor was self-registered
        if (vendor.getCreatedBy() instanceof User) {
            User user = (User) vendor.getCreatedBy();
            System.out.println("Deleting associated user: " + user.getUsername());
            userRepository.delete(user);
        }

        // Delete the vendor
        vendorRepository.delete(vendor);
    }

    
    @Override
    @Transactional
    public VendorDTO approveVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));

        // Change status to approved
        vendor.setStatus(com.smc.svms.enums.VendorStatus.APPROVED);

        // Generate QR code only when vendor is approved
        if (vendor.getQrCode() == null && vendor.getLocation() != null) {
            generateAndSaveQrCode(vendor);
            System.out.println("QR code generated for approved vendor: " + vendor.getVendorId());
        }

        Vendor approvedVendor = vendorRepository.save(vendor);

        // Send approval email to vendor
        emailService.sendVendorRegistrationApprovedEmail(approvedVendor);

        return mapToDTO(approvedVendor);
    }

    @Override
    public VendorDTO rejectVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));
        vendor.setStatus(com.smc.svms.enums.VendorStatus.REJECTED);
        return mapToDTO(vendorRepository.save(vendor));
    }

    @Override
    public VendorDTO suspendVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));
        vendor.setStatus(com.smc.svms.enums.VendorStatus.SUSPENDED);
        return mapToDTO(vendorRepository.save(vendor));
    }

    @Override
    public List<VendorDTO> getVendorsByZone(Long zoneId) {
        return vendorRepository.findByLocationZoneId(zoneId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private void generateAndSaveQrCode(Vendor vendor) {
        try {
            System.out.println("Generating QR code for vendor: " + vendor.getVendorId());
            String qrData = vendor.getVendorId();
            String fileName = vendor.getVendorId() + ".png";
            String filePath = qrCodeDir + File.separator + fileName;

            System.out.println("QR Code directory: " + qrCodeDir);
            System.out.println("QR Code file path: " + filePath);
            System.out.println("Base URL: " + baseUrl);

            // Ensure directory exists
            File dir = new File(qrCodeDir);
            if (!dir.exists()) {
                System.out.println("Creating QR code directory: " + qrCodeDir);
                dir.mkdirs();
            }

            QrCodeGenerator.generateQRCodeImage(qrData, 300, 300, filePath);
            System.out.println("QR code image generated successfully");

            QrCode qrCode = vendor.getQrCode();
            if (qrCode == null) {
                System.out.println("Creating new QR code record");
                qrCode = QrCode.builder()
                        .vendor(vendor)
                        .qrCodeUrl("/api/files/qr-codes/" + fileName)
                        .generatedAt(LocalDateTime.now())
                        .isActive(true)
                        .build();
            } else {
                System.out.println("Updating existing QR code record");
                qrCode.setGeneratedAt(LocalDateTime.now());
                qrCode.setIsActive(true);
            }
            
            QrCode savedQr = qrCodeRepository.save(qrCode);
            vendor.setQrCode(savedQr);
            System.out.println("QR code saved to database successfully");
        } catch (Exception e) {
            log.error("Error generating QR code for vendor: {}", vendor.getVendorId(), e);
            System.out.println("ERROR generating QR code: " + e.getMessage());
            e.printStackTrace();
            // Don't throw exception to allow vendor registration to continue even if QR fails
            log.warn("Vendor registration completed but QR code generation failed for: {}", vendor.getVendorId());
        }
    }

    private VendorDTO mapToDTO(Vendor vendor) {
        VendorDTO.Builder builder = VendorDTO.builder()
                .id(vendor.getId())
                .vendorId(vendor.getVendorId())
                .name(vendor.getName())
                .phone(vendor.getPhone())
                .email(vendor.getEmail())
                .faceImageUrl(vendor.getFaceImageUrl())
                .category(com.smc.svms.enums.VendorCategory.valueOf(vendor.getCategory().toString()))
                .status(com.smc.svms.enums.VendorStatus.valueOf(vendor.getStatus().toString()))
                .monthlyRent(vendor.getMonthlyRent())
                .createdAt(vendor.getCreatedAt());

        BigDecimal pendingFine = challanRepository.sumUnpaidFinesByVendorId(vendor.getId());
        builder.totalPendingFine(pendingFine != null ? pendingFine : BigDecimal.ZERO);

        if (vendor.getLocation() != null) {
            builder.latitude(vendor.getLocation().getLatitude().doubleValue())
                   .longitude(vendor.getLocation().getLongitude().doubleValue())
                   .address(vendor.getLocation().getAddress());
            
            if (vendor.getLocation().getZone() != null) {
                builder.zoneId(vendor.getLocation().getZone().getId())
                       .zoneName(vendor.getLocation().getZone().getName());
            }
        }

        if (vendor.getQrCode() != null) {
            String qrUrl = vendor.getQrCode().getQrCodeUrl();
            // Make URL absolute if it's relative
            if (qrUrl != null && !qrUrl.startsWith("http")) {
                qrUrl = baseUrl + qrUrl;
            }
            builder.qrCodeUrl(qrUrl);
        }

        // Check if rent is paid for current month
        java.time.LocalDate now = java.time.LocalDate.now();
        boolean isPaid = rentPaymentRepository.existsByVendorIdAndPaymentMonthAndPaymentYear(
            vendor.getId(), now.getMonthValue(), now.getYear());
        builder.isRentPaidCurrentMonth(isPaid);

        return builder.build();
    }
}
