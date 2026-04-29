package com.smc.svms.controller;

import com.smc.svms.entity.Zone;
import com.smc.svms.entity.ZoneCategory;
import com.smc.svms.entity.ZonePricing;
import com.smc.svms.enums.ZoneType;
import com.smc.svms.repository.ZoneRepository;
import com.smc.svms.repository.ZonePricingRepository;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.service.EnhancedGeofencingService;
import com.smc.svms.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/zones")
public class EnhancedZoneController {

    private static final Logger log = LoggerFactory.getLogger(EnhancedZoneController.class);

    private final ZoneRepository zoneRepository;
    private final EnhancedGeofencingService geofencingService;
    private final ZonePricingRepository zonePricingRepository;
    private final VendorRepository vendorRepository;

    public EnhancedZoneController(ZoneRepository zoneRepository, EnhancedGeofencingService geofencingService, ZonePricingRepository zonePricingRepository, VendorRepository vendorRepository) {
        this.zoneRepository = zoneRepository;
        this.geofencingService = geofencingService;
        this.zonePricingRepository = zonePricingRepository;
        this.vendorRepository = vendorRepository;
    }

    /**
     * Create zone with polygon support
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> createZone(@Valid @RequestBody ZoneRequest request) {

        try {
            // Validate polygon coordinates if provided
            if (request.getPolygonCoordinates() != null &&
                !geofencingService.validateZoneBoundary(request.getPolygonCoordinates())) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid polygon coordinates"));
            }

            Zone zone = Zone.builder()
                .name(request.getName())
                .zoneType(request.getZoneType())
                .zoneCategory(request.getZoneCategory())
                .latitude(request.getCenterLatitude())
                .longitude(request.getCenterLongitude())
                .radiusMeters(request.getRadiusMeters())
                .polygonCoordinates(request.getPolygonCoordinates())
                .maxVendors(request.getMaxVendors())
                .timeRestrictions(request.getTimeRestrictions())
                .managerEmail(request.getManagerEmail())
                .managerPhone(request.getManagerPhone())
                .monthlyRent(request.getMonthlyRent())
                .isActive(true)
                .build();

            zone = zoneRepository.save(zone);

            // Zone created successfully
            return ResponseEntity.status(201)
                .body(ApiResponse.success(zone));

        } catch (Exception e) {
            // Failed to create zone
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create zone: " + e.getMessage()));
        }
    }

    /**
     * Update zone
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> updateZone(
            @PathVariable Long id,
            @Valid @RequestBody ZoneRequest request) {

        try {
            Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Zone not found"));

            // Validate polygon coordinates if provided
            if (request.getPolygonCoordinates() != null &&
                !geofencingService.validateZoneBoundary(request.getPolygonCoordinates())) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid polygon coordinates"));
            }

            zone.setName(request.getName());
            zone.setZoneType(request.getZoneType());
            zone.setZoneCategory(request.getZoneCategory());
            zone.setLatitude(request.getCenterLatitude());
            zone.setLongitude(request.getCenterLongitude());
            zone.setRadiusMeters(request.getRadiusMeters());
            zone.setPolygonCoordinates(request.getPolygonCoordinates());
            zone.setMaxVendors(request.getMaxVendors());
            zone.setTimeRestrictions(request.getTimeRestrictions());
            zone.setManagerEmail(request.getManagerEmail());
            zone.setManagerPhone(request.getManagerPhone());
            zone.setMonthlyRent(request.getMonthlyRent());

            zone = zoneRepository.save(zone);

            return ResponseEntity.ok(ApiResponse.success(zone));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to update zone: " + e.getMessage()));
        }
    }

    /**
     * Get all zones with pricing
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ZoneWithPricingDTO>>> getAllZones() {
        
        try {
            List<Zone> zones = zoneRepository.findAllActiveZones();
            List<ZoneWithPricingDTO> zonesWithPricing = zones.stream()
                .map(zone -> {
                    // Use the zone's monthlyRent field first, fall back to ZonePricing table
                    BigDecimal monthlyRent = zone.getMonthlyRent();
                    if (monthlyRent == null) {
                        // Get the base rate from zone pricing (use the first active pricing)
                        List<ZonePricing> pricings = zonePricingRepository.findByZoneIdAndIsActive(zone.getId(), true);
                        monthlyRent = pricings.isEmpty() ? BigDecimal.ZERO : pricings.get(0).getBaseRate();
                    }

                    // Get current vendor count for this zone
                    int vendorCount = vendorRepository.countByZoneId(zone.getId());

                    return ZoneWithPricingDTO.fromZone(zone, monthlyRent, vendorCount);
                })
                .collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.success(zonesWithPricing));
        } catch (Exception e) {
            // Failed to fetch zones
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to fetch zones"));
        }
    }

    /**
     * Get zone by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Zone>> getZone(@PathVariable Long id) {
        
        try {
            return zoneRepository.findById(id)
                .map(zone -> ResponseEntity.ok(ApiResponse.success(zone)))
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            // Failed to fetch zone
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to fetch zone"));
        }
    }

    /**
     * Validate vendor location
     */
    @PostMapping("/validate-location")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER') or hasRole('VENDOR')")
    public ResponseEntity<ApiResponse<LocationValidationResult>> validateVendorLocation(
            @Valid @RequestBody LocationValidationRequest request) {
        
        try {
            LocationValidationResult result = geofencingService.validateVendorLocation(
                request.getVendorId(), 
                request.getLatitude().doubleValue(), 
                request.getLongitude().doubleValue()
            );
            
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            // Failed to validate vendor location
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to validate location"));
        }
    }

    /**
     * Get zone capacity information
     */
    @GetMapping("/{id}/capacity")
    public ResponseEntity<ApiResponse<ZoneCapacityInfo>> getZoneCapacity(@PathVariable Long id) {
        
        try {
            ZoneCapacityInfo capacity = geofencingService.getZoneCapacity(id);
            return ResponseEntity.ok(ApiResponse.success(capacity));
        } catch (Exception e) {
            // Failed to get zone capacity
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to get zone capacity"));
        }
    }

    /**
     * Get all zones capacity information
     */
    @GetMapping("/capacity/all")
    public ResponseEntity<ApiResponse<List<ZoneCapacityInfo>>> getAllZonesCapacity() {
        
        try {
            List<Zone> zones = zoneRepository.findAllActiveZones();
            List<ZoneCapacityInfo> capacities = zones.stream()
                .map(zone -> geofencingService.getZoneCapacity(zone.getId()))
                .toList();
            
            return ResponseEntity.ok(ApiResponse.success(capacities));
        } catch (Exception e) {
            // Failed to get zones capacity
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to get zones capacity"));
        }
    }

    /**
     * Find nearest zone
     */
    @GetMapping("/nearest")
    public ResponseEntity<ApiResponse<Zone>> findNearestZone(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "1000") double maxDistance) {
        
        try {
            Optional<Zone> nearestZone = geofencingService.findNearestZone(
                latitude, longitude, maxDistance);
            
            return nearestZone
                .map(zone -> ResponseEntity.ok(ApiResponse.success(zone)))
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            // Failed to find nearest zone
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to find nearest zone"));
        }
    }

    /**
     * Get zones within radius
     */
    @GetMapping("/within-radius")
    public ResponseEntity<ApiResponse<List<Zone>>> getZonesWithinRadius(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "500") double radius) {
        
        try {
            List<Zone> zones = geofencingService.getZonesWithinRadius(
                latitude, longitude, radius);
            
            return ResponseEntity.ok(ApiResponse.success(zones));
        } catch (Exception e) {
            // Failed to get zones within radius
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to get zones within radius"));
        }
    }

    /**
     * Deactivate zone
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> deactivateZone(@PathVariable Long id) {
        
        try {
            Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Zone not found"));
            
            zone.setIsActive(false);
            zoneRepository.save(zone);
            
            // Zone deactivated
            return ResponseEntity.ok(ApiResponse.success("Zone deactivated successfully"));
        } catch (Exception e) {
            // Failed to deactivate zone
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to deactivate zone"));
        }
    }

    /**
     * Activate zone
     */
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> activateZone(@PathVariable Long id) {
        
        try {
            Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Zone not found"));
            
            zone.setIsActive(true);
            zoneRepository.save(zone);
            
            // Zone activated
            return ResponseEntity.ok(ApiResponse.success("Zone activated successfully"));
        } catch (Exception e) {
            // Failed to activate zone
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to activate zone"));
        }
    }

    /**
     * Delete zone permanently
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteZone(@PathVariable Long id) {
        
        try {
            if (!zoneRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            
            zoneRepository.deleteById(id);
            
            // Zone deleted
            return ResponseEntity.ok(ApiResponse.success("Zone deleted successfully"));
        } catch (Exception e) {
            // Failed to delete zone
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to delete zone: " + e.getMessage()));
        }
    }
}
