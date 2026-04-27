package com.smc.svms.dto;

import com.smc.svms.entity.Zone;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneWithPricingDTO {
    private Long id;
    private String name;
    private String zoneType;
    private String zoneCategory;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer radiusMeters;
    private String polygonCoordinates;
    private Integer maxVendors;
    private String timeRestrictions;
    private String managerEmail;
    private String managerPhone;
    private Boolean isActive;
    private BigDecimal monthlyRent;
    private Integer currentVendorCount;
    private Boolean isAvailable;

    public static ZoneWithPricingDTO fromZone(Zone zone, BigDecimal monthlyRent, Integer currentVendorCount) {
        // If maxVendors is not set, default to 1 (single vendor per zone)
        int maxVendors = zone.getMaxVendors() != null ? zone.getMaxVendors() : 1;
        boolean isAvailable = currentVendorCount < maxVendors;
        return ZoneWithPricingDTO.builder()
                .id(zone.getId())
                .name(zone.getName())
                .zoneType(zone.getZoneType() != null ? zone.getZoneType().name() : null)
                .zoneCategory(zone.getZoneCategory() != null ? zone.getZoneCategory().name() : null)
                .latitude(zone.getLatitude())
                .longitude(zone.getLongitude())
                .radiusMeters(zone.getRadiusMeters())
                .polygonCoordinates(zone.getPolygonCoordinates())
                .maxVendors(maxVendors)
                .timeRestrictions(zone.getTimeRestrictions())
                .managerEmail(zone.getManagerEmail())
                .managerPhone(zone.getManagerPhone())
                .isActive(zone.getIsActive())
                .monthlyRent(monthlyRent)
                .currentVendorCount(currentVendorCount)
                .isAvailable(isAvailable)
                .build();
    }
}
