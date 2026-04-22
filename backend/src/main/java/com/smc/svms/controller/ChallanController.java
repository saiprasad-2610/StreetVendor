package com.smc.svms.controller;

import com.smc.svms.dto.ChallanRequest;
import com.smc.svms.entity.Challan;
import com.smc.svms.service.ChallanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/challans")
@RequiredArgsConstructor
public class ChallanController {

    private final ChallanService challanService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<Challan> issueChallan(@RequestBody ChallanRequest request) {
        return ResponseEntity.ok(challanService.issueChallan(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<List<Challan>> getAllChallans() {
        return ResponseEntity.ok(challanService.getAllChallans());
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<List<Challan>> getMyChallans() {
        return ResponseEntity.ok(challanService.getMyChallans());
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR')")
    public ResponseEntity<Challan> markPaid(@PathVariable Long id) {
        return ResponseEntity.ok(challanService.markPaid(id));
    }
}
