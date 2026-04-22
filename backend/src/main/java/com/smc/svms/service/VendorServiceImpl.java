package com.smc.svms.service;

import com.smc.svms.dto.VendorDTO;
import com.smc.svms.dto.VendorRequest;
import com.smc.svms.dto.VendorSelfRegisterRequest;
import com.smc.svms.entity.QrCode;
import com.smc.svms.entity.User;
import com.smc.svms.entity.Vendor;
import com.smc.svms.entity.VendorLocation;
import com.smc.svms.entity.Zone;
import com.smc.svms.enums.UserRole;
import com.smc.svms.enums.VendorStatus;
import com.smc.svms.repository.ChallanRepository;
import com.smc.svms.repository.QrCodeRepository;
import com.smc.svms.repository.UserRepository;
import com.smc.svms.repository.VendorLocationRepository;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.repository.ZoneRepository;
import com.smc.svms.util.GeoUtils;
import com.smc.svms.util.QrCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class VendorServiceImpl implements VendorService {

    private final VendorRepository vendorRepository;
    private final VendorLocationRepository vendorLocationRepository;
    private final QrCodeRepository qrCodeRepository;
    private final UserRepository userRepository;
    private final ChallanRepository challanRepository;
    private final ZoneRepository zoneRepository;
    private final com.smc.svms.repository.RentPaymentRepository rentPaymentRepository;
    private final PasswordEncoder passwordEncoder;

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

        String vendorId = "SMC-V-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        
        Vendor vendor = Vendor.builder()
                .vendorId(vendorId)
                .name(request.getName())
                .phone(request.getPhone())
                .aadhaar(request.getAadhaar()) // In real app, encrypt this
                .faceImageUrl(request.getFaceImageUrl())
                .category(request.getCategory())
                .monthlyRent(request.getMonthlyRent() != null ? request.getMonthlyRent() : new BigDecimal("500.00"))
                .status(VendorStatus.PENDING)
                .createdBy(admin)
                .build();

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

        // Generate initial QR code even for pending vendor
        vendor.setLocation(location); // Set for QR generation logic
        generateAndSaveQrCode(vendor);

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

        // 1. Create User
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getName())
                .phone(request.getPhone())
                .role(UserRole.VENDOR)
                .enabled(true)
                .build();
        User savedUser = userRepository.save(user);

        // 2. Create Vendor
        String vendorId = "SMC-V-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Vendor vendor = Vendor.builder()
                .vendorId(vendorId)
                .name(request.getName())
                .phone(request.getPhone())
                .aadhaar(request.getAadhaar())
                .faceImageUrl(request.getFaceImageUrl())
                .category(request.getCategory())
                .monthlyRent(request.getMonthlyRent() != null ? request.getMonthlyRent() : new BigDecimal("500.00"))
                .status(VendorStatus.PENDING)
                .createdBy(savedUser)
                .build();
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

        // Auto-generate QR code for self-registered vendor
        savedVendor.setLocation(location);
        generateAndSaveQrCode(savedVendor);

        return mapToDTO(savedVendor);
    }

    @Override
    @Transactional
    public VendorDTO getMyProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Vendor vendor = vendorRepository.findByCreatedByUsername(username)
                .orElseThrow(() -> new RuntimeException("Vendor profile not found for user: " + username));
        
        // Auto-fix: generate QR code if missing
        if (vendor.getQrCode() == null && vendor.getLocation() != null) {
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
        return vendorRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + id));
    }

    @Override
    public VendorDTO getVendorByVendorId(String vendorId) {
        return vendorRepository.findByVendorId(vendorId)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("Vendor not found with vendorId: " + vendorId));
    }

    @Override
    @Transactional
    public VendorDTO approveVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + id));
        
        vendor.setStatus(VendorStatus.APPROVED);
        Vendor savedVendor = vendorRepository.save(vendor);

        // Generate QR Code for approved vendor
        generateAndSaveQrCode(savedVendor);

        return mapToDTO(savedVendor);
    }

    @Override
    @Transactional
    public VendorDTO rejectVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + id));
        
        vendor.setStatus(VendorStatus.REJECTED);
        return mapToDTO(vendorRepository.save(vendor));
    }

    @Override
    @Transactional
    public VendorDTO suspendVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + id));
        
        vendor.setStatus(VendorStatus.SUSPENDED);
        return mapToDTO(vendorRepository.save(vendor));
    }

    @Override
    @Transactional
    public void deleteVendor(Long id) {
        vendorRepository.deleteById(id);
    }

    private void generateAndSaveQrCode(Vendor vendor) {
        try {
            if (vendor.getLocation() == null) {
                log.error("Cannot generate QR code for vendor {}: Location is missing", vendor.getVendorId());
                throw new RuntimeException("Vendor location is missing");
            }

            File directory = new File(qrCodeDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            String fileName = vendor.getVendorId() + ".png";
            String filePath = qrCodeDir + File.separator + fileName;
            
            // Text for QR code includes full vendor details
            String qrText = String.format("{\"id\":\"%s\",\"name\":\"%s\",\"phone\":\"%s\",\"category\":\"%s\",\"lat\":%s,\"lon\":%s,\"status\":\"%s\"}",
                    vendor.getVendorId(),
                    vendor.getName(),
                    vendor.getPhone(),
                    vendor.getCategory() != null ? vendor.getCategory().name() : "N/A",
                    vendor.getLocation().getLatitude(),
                    vendor.getLocation().getLongitude(),
                    vendor.getStatus() != null ? vendor.getStatus().name() : "PENDING");
            
            QrCodeGenerator.generateQRCodeImage(qrText, 300, 300, filePath);

            QrCode qrCode = vendor.getQrCode();
            if (qrCode == null) {
                qrCode = QrCode.builder()
                        .vendor(vendor)
                        .qrCodeUrl("/api/files/qr-codes/" + fileName)
                        .generatedAt(LocalDateTime.now())
                        .isActive(true)
                        .build();
            } else {
                qrCode.setGeneratedAt(LocalDateTime.now());
                qrCode.setIsActive(true);
            }
            
            QrCode savedQr = qrCodeRepository.save(qrCode);
            vendor.setQrCode(savedQr);
        } catch (Exception e) {
            log.error("Error generating QR code for vendor: {}", vendor.getVendorId(), e);
            throw new RuntimeException("Failed to generate QR code: " + e.getMessage());
        }
    }

    private VendorDTO mapToDTO(Vendor vendor) {
        VendorDTO.VendorDTOBuilder builder = VendorDTO.builder()
                .id(vendor.getId())
                .vendorId(vendor.getVendorId())
                .name(vendor.getName())
                .phone(vendor.getPhone())
                .faceImageUrl(vendor.getFaceImageUrl())
                .category(vendor.getCategory())
                .status(vendor.getStatus())
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
            builder.qrCodeUrl(vendor.getQrCode().getQrCodeUrl());
        }

        // Check if rent is paid for current month
        java.time.LocalDate now = java.time.LocalDate.now();
        boolean isPaid = rentPaymentRepository.existsByVendorIdAndPaymentMonthAndPaymentYear(
            vendor.getId(), now.getMonthValue(), now.getYear());
        builder.isRentPaidCurrentMonth(isPaid);

        return builder.build();
    }
}
