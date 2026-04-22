package com.smc.svms.controller;

import com.smc.svms.dto.VendorDTO;
import com.smc.svms.dto.VendorRequest;
import com.smc.svms.dto.VendorSelfRegisterRequest;
import com.smc.svms.service.VendorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorDTO> createVendor(@Valid @RequestBody VendorRequest request) {
        return ResponseEntity.ok(vendorService.createVendor(request));
    }

    @PostMapping("/register")
    public ResponseEntity<VendorDTO> registerVendor(@Valid @RequestBody VendorSelfRegisterRequest request) {
        return ResponseEntity.ok(vendorService.registerVendor(request));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<VendorDTO> getMyProfile() {
        return ResponseEntity.ok(vendorService.getMyProfile());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<List<VendorDTO>> getAllVendors() {
        return ResponseEntity.ok(vendorService.getAllVendors());
    }

    @GetMapping("/{id}")
    public ResponseEntity<VendorDTO> getVendorById(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.getVendorById(id));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorDTO> approveVendor(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.approveVendor(id));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorDTO> rejectVendor(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.rejectVendor(id));
    }

    @PutMapping("/{id}/suspend")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorDTO> suspendVendor(@PathVariable Long id) {
        return ResponseEntity.ok(vendorService.suspendVendor(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteVendor(@PathVariable Long id) {
        vendorService.deleteVendor(id);
        return ResponseEntity.noContent().build();
    }
}
