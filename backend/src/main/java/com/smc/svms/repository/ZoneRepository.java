package com.smc.svms.repository;

import com.smc.svms.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ZoneRepository extends JpaRepository<Zone, Long> {

    /**
     * Find all active zones
     */
    @Query("SELECT z FROM Zone z WHERE z.isActive = true ORDER BY z.name")
    List<Zone> findAllActiveZones();

    /**
     * Find zones by type
     */
    @Query("SELECT z FROM Zone z WHERE z.zoneType = :zoneType AND z.isActive = true")
    List<Zone> findByZoneTypeAndActive(@Param("zoneType") String zoneType);

    /**
     * Find zones by category
     */
    @Query("SELECT z FROM Zone z WHERE z.zoneCategory = :zoneCategory AND z.isActive = true")
    List<Zone> findByZoneCategoryAndActive(@Param("zoneCategory") String zoneCategory);

    /**
     * Find zones by manager email
     */
    @Query("SELECT z FROM Zone z WHERE z.managerEmail = :managerEmail AND z.isActive = true")
    List<Zone> findByManagerEmailAndActive(@Param("managerEmail") String managerEmail);

    /**
     * Count active zones by type
     */
    @Query("SELECT COUNT(z) FROM Zone z WHERE z.zoneType = :zoneType AND z.isActive = true")
    Long countByZoneTypeAndActive(@Param("zoneType") String zoneType);

    /**
     * Find zones with capacity limits
     */
    @Query("SELECT z FROM Zone z WHERE z.maxVendors IS NOT NULL AND z.maxVendors > 0 AND z.isActive = true")
    List<Zone> findZonesWithCapacityLimits();

    /**
     * Find zones with time restrictions
     */
    @Query("SELECT z FROM Zone z WHERE z.timeRestrictions IS NOT NULL AND z.timeRestrictions != '' AND z.isActive = true")
    List<Zone> findZonesWithTimeRestrictions();

    /**
     * Find zones with polygon boundaries
     */
    @Query("SELECT z FROM Zone z WHERE z.polygonCoordinates IS NOT NULL AND z.polygonCoordinates != '' AND z.isActive = true")
    List<Zone> findZonesWithPolygonBoundaries();

    /**
     * Find zones within a bounding box
     */
    @Query("SELECT z FROM Zone z WHERE z.latitude BETWEEN :minLat AND :maxLat AND z.longitude BETWEEN :minLng AND :maxLng AND z.isActive = true")
    List<Zone> findZonesWithinBoundingBox(
        @Param("minLat") Double minLat,
        @Param("maxLat") Double maxLat,
        @Param("minLng") Double minLng,
        @Param("maxLng") Double maxLng
    );

    /**
     * Count all active zones
     */
    @Query("SELECT COUNT(z) FROM Zone z WHERE z.isActive = true")
    long countActiveZones();
}
