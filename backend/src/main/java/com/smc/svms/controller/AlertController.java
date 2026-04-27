package com.smc.svms.controller;

import com.smc.svms.dto.ApiResponse;
import com.smc.svms.entity.Alert;
import com.smc.svms.dto.AlertRequest;
import com.smc.svms.dto.AlertStatistics;
import com.smc.svms.repository.AlertRepository;
import com.smc.svms.service.SimpleAlertService;
import com.smc.svms.enums.AlertStatus;
import com.smc.svms.enums.AlertSeverity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {
    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AlertController.class);
    
    private final SimpleAlertService alertService;
    private final AlertRepository alertRepository;

    public AlertController(SimpleAlertService alertService, AlertRepository alertRepository) {
        this.alertService = alertService;
        this.alertRepository = alertRepository;
    }
    
    /**
     * Get all alerts
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<List<Alert>>> getAlerts(
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(required = false) AlertSeverity severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            
            Page<Alert> alerts;
            if (status != null && severity != null) {
                alerts = alertRepository.findByStatusAndSeverity(
                    status, 
                    severity, 
                    pageable);
            } else if (status != null) {
                alerts = alertRepository.findByStatusOrderByCreatedAtDesc(
                    status, 
                    pageable);
            } else if (severity != null) {
                alerts = alertRepository.findBySeverityOrderByCreatedAtDesc(
                    severity, 
                    pageable);
            } else {
                alerts = alertRepository.findAllByOrderByCreatedAtDesc(pageable);
            }
            
            return ResponseEntity.ok(ApiResponse.success(alerts.getContent()));
        } catch (Exception e) {
            log.error("Failed to get alerts", e);
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Failed to fetch alerts"));
        }
    }
    
    /**
     * Get pending alerts
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<List<Alert>>> getPendingAlerts() {
        
        try {
            List<Alert> alerts = alertService.getPendingAlerts();
            return ResponseEntity.ok(ApiResponse.success(alerts));
        } catch (Exception e) {
            log.error("Failed to get pending alerts", e);
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Failed to fetch pending alerts"));
        }
    }
    
    /**
     * Get alert by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<Alert>> getAlert(@PathVariable Long id) {
        
        try {
            Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
            return ResponseEntity.ok(ApiResponse.success(alert));
        } catch (Exception e) {
            log.error("Failed to get alert: {}", id, e);
            return ResponseEntity.status(404)
                .body(ApiResponse.error("Alert not found"));
        }
    }
    
    /**
     * Create manual alert
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Alert>> createAlert(
            @Valid @RequestBody com.smc.svms.dto.AlertRequest request,
            @RequestHeader("X-User-ID") Long officerId) {
        
        try {
            Alert alert = alertService.createAlert(request);
            
            return ResponseEntity.status(201)
                .body(ApiResponse.success(alert));
                
        } catch (Exception e) {
            log.error("Failed to create alert", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create alert: " + e.getMessage()));
        }
    }
    
    /**
     * Acknowledge alert
     */
    @PutMapping("/{id}/acknowledge")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<String>> acknowledgeAlert(
            @PathVariable Long id,
            @RequestHeader("X-User-ID") Long officerId) {
        
        try {
            alertService.acknowledgeAlert(id, officerId);
            
            return ResponseEntity.ok(ApiResponse.success("Alert acknowledged successfully"));
            
        } catch (Exception e) {
            log.error("Failed to acknowledge alert: {}", id, e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to acknowledge alert: " + e.getMessage()));
        }
    }
    
    /**
     * Resolve alert
     */
    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<String>> resolveAlert(
            @PathVariable Long id,
            @RequestBody @Valid AlertResolutionRequest request,
            @RequestHeader("X-User-ID") Long officerId) {
        
        try {
            alertService.resolveAlert(id, officerId, request.getResolutionNotes());
            
            return ResponseEntity.ok(ApiResponse.success("Alert resolved successfully"));
            
        } catch (Exception e) {
            log.error("Failed to resolve alert: {}", id, e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to resolve alert: " + e.getMessage()));
        }
    }
    
    /**
     * Get alert statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<com.smc.svms.dto.AlertStatistics>> getAlertStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }
        
        try {
            com.smc.svms.dto.AlertStatistics stats = alertService.getAlertStatistics(startDate, endDate);
            return ResponseEntity.ok(ApiResponse.success(stats));
        } catch (Exception e) {
            log.error("Failed to get alert statistics", e);
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Failed to get statistics"));
        }
    }
    
    /**
     * Get alerts for officer
     */
    @GetMapping("/my-alerts")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<List<Alert>>> getAlertsForOfficer(
            @RequestHeader("X-User-ID") Long officerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            List<Alert> alerts = alertService.getAlertsForOfficer(officerId);
            return ResponseEntity.ok(ApiResponse.success(alerts));
        } catch (Exception e) {
            log.error("Failed to get alerts for officer: {}", officerId, e);
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Failed to fetch alerts"));
        }
    }
}

// DTOs
class AlertResolutionRequest {
    @jakarta.validation.constraints.NotBlank
    private String resolutionNotes;
    
    public AlertResolutionRequest() {}
    
    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }
}
