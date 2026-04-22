package com.smc.svms.service;

import com.smc.svms.dto.ChallanRequest;
import com.smc.svms.entity.Challan;
import com.smc.svms.entity.User;
import com.smc.svms.entity.Vendor;
import com.smc.svms.enums.ChallanStatus;
import com.smc.svms.repository.ChallanRepository;
import com.smc.svms.repository.UserRepository;
import com.smc.svms.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChallanServiceImpl implements ChallanService {

    private final ChallanRepository challanRepository;
    private final VendorRepository vendorRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public Challan issueChallan(ChallanRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Issuing challan by user: {}", username);
        User officer = userRepository.findByUsername(username).orElse(null);

        Vendor vendor = vendorRepository.findByVendorId(request.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + request.getVendorId()));

        String challanNumber = "SMC-CH-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();

        Challan challan = Challan.builder()
                .challanNumber(challanNumber)
                .vendor(vendor)
                .issuedBy(officer)
                .fineAmount(request.getFineAmount())
                .reason(request.getReason())
                .location(request.getLocation())
                .imageProofUrl(request.getImageProofUrl())
                .status(ChallanStatus.UNPAID)
                .dueDate(LocalDate.now().plusDays(15))
                .build();

        Challan saved = challanRepository.save(challan);
        log.info("Challan issued successfully: {}", challanNumber);
        return saved;
    }

    @Override
    @Transactional
    public Challan issueAutomaticChallan(Vendor vendor, String reason, String location, String imageUrl) {
        // Prevent duplicate automatic challans for the same vendor within the same day
        // This prevents multiple "Location Mismatch" challans if scanned multiple times a day
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        List<Challan> recentChallans = challanRepository.findByVendorVendorIdAndReasonStartingWithAndIssuedAtAfter(
            vendor.getVendorId(), 
            "Location Mismatch", 
            startOfDay
        );
        
        if (!recentChallans.isEmpty()) {
            log.info("Automatic challan already exists for vendor {} today. Skipping duplicate.", vendor.getVendorId());
            return recentChallans.get(0);
        }

        // System user or admin for automatic challans
        User systemUser = userRepository.findByUsername("admin").orElse(null);

        String challanNumber = "SMC-AUTO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Challan challan = Challan.builder()
                .challanNumber(challanNumber)
                .vendor(vendor)
                .issuedBy(systemUser)
                .fineAmount(new BigDecimal("500.00")) // Default fine for location violation
                .reason(reason)
                .location(location)
                .imageProofUrl(imageUrl)
                .status(ChallanStatus.UNPAID)
                .dueDate(LocalDate.now().plusDays(15))
                .build();

        log.info("Issuing new automatic challan {} for vendor {}", challanNumber, vendor.getVendorId());
        return challanRepository.save(challan);
    }

    @Override
    public List<Challan> getAllChallans() {
        return challanRepository.findAll();
    }

    @Override
    public List<Challan> getMyChallans() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Fetching challans for vendor user: {}", username);
        
        Vendor vendor = vendorRepository.findByCreatedByUsername(username)
                .orElseThrow(() -> new RuntimeException("Vendor profile not found for user: " + username));
        
        log.info("Found vendor profile: {} (ID: {})", vendor.getVendorId(), vendor.getId());
        List<Challan> challans = challanRepository.findByVendorVendorId(vendor.getVendorId());
        log.info("Found {} challans for vendor ID: {}", challans.size(), vendor.getVendorId());
        
        return challans;
    }

    @Override
    public List<Challan> getChallansByVendorId(String vendorId) {
        return challanRepository.findByVendorVendorId(vendorId);
    }

    @Override
    @Transactional
    public Challan markPaid(Long id) {
        Challan challan = challanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Challan not found with id: " + id));
        
        challan.setStatus(ChallanStatus.PAID);
        challan.setPaidAt(LocalDateTime.now());
        return challanRepository.save(challan);
    }
}
