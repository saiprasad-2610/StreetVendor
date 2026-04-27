package com.smc.svms.dto;

import com.smc.svms.entity.Zone;
import com.smc.svms.enums.ZoneType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ZoneInfo {
    private Long zoneId;
    private String zoneName;
    private ZoneType zoneType;
    private String zoneCategory;
    private Double latitude;
    private Double longitude;
    private Integer radiusMeters;
    private String polygonCoordinates;
    private Integer maxVendors;
    private String timeRestrictions;
    private String managerEmail;
    private Boolean isActive;
    
    public static ZoneInfo from(Zone zone) {
        return ZoneInfo.builder()
            .zoneId(zone.getId())
            .zoneName(zone.getName())
            .zoneType(zone.getZoneType())
            .zoneCategory(zone.getZoneCategory() != null ? zone.getZoneCategory().name() : null)
            .latitude(zone.getLatitude() != null ? zone.getLatitude().doubleValue() : null)
            .longitude(zone.getLongitude() != null ? zone.getLongitude().doubleValue() : null)
            .radiusMeters(zone.getRadiusMeters())
            .polygonCoordinates(zone.getPolygonCoordinates())
            .maxVendors(zone.getMaxVendors())
            .timeRestrictions(zone.getTimeRestrictions())
            .managerEmail(zone.getManagerEmail())
            .isActive(zone.getIsActive())
            .build();
    }
}
