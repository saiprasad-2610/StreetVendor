package com.smc.svms.controller;

import com.smc.svms.entity.Zone;
import com.smc.svms.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/zones")
@RequiredArgsConstructor
public class ZoneController {

    private final ZoneRepository zoneRepository;

    @GetMapping
    public ResponseEntity<List<Zone>> getAllZones() {
        return ResponseEntity.ok(zoneRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<Zone> createZone(@RequestBody Zone zone) {
        return ResponseEntity.ok(zoneRepository.save(zone));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<Zone> updateZone(@PathVariable Long id, @RequestBody Zone zoneDetails) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Zone not found"));
        
        zone.setName(zoneDetails.getName());
        zone.setZoneType(zoneDetails.getZoneType());
        zone.setLatitude(zoneDetails.getLatitude());
        zone.setLongitude(zoneDetails.getLongitude());
        zone.setRadiusMeters(zoneDetails.getRadiusMeters());
        zone.setIsActive(zoneDetails.getIsActive());
        
        return ResponseEntity.ok(zoneRepository.save(zone));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<Void> deleteZone(@PathVariable Long id) {
        zoneRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
