package com.smc.svms.repository;

import com.smc.svms.entity.Vendor;
import com.smc.svms.enums.VendorCategory;
import com.smc.svms.enums.VendorStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {
    Optional<Vendor> findByVendorId(String vendorId);
    Optional<Vendor> findByCreatedByUsername(String username);
    Optional<Vendor> findByCreatedBy(com.smc.svms.entity.User user);
    List<Vendor> findByStatus(VendorStatus status);
    boolean existsByVendorId(String vendorId);
    long countByStatus(VendorStatus status);

    /**
     * Find active vendors
     */
    @Query("SELECT v FROM Vendor v WHERE v.status = 'APPROVED'")
    List<Vendor> findActiveVendors();

    /**
     * Count vendors by zone
     */
    @Query("SELECT COUNT(v) FROM Vendor v JOIN v.location vl WHERE vl.zone.id = :zoneId")
    int countByZoneId(@Param("zoneId") Long zoneId);

    /**
     * Find vendors created after date
     */
    @Query("SELECT v FROM Vendor v WHERE v.createdAt >= :startDate")
    List<Vendor> findByCreatedAtAfter(@Param("startDate") LocalDateTime startDate);

    /**
     * Find vendors by category
     */
    @Query("SELECT v FROM Vendor v WHERE v.category = :category AND v.status = 'APPROVED'")
    List<Vendor> findByCategoryAndActive(@Param("category") VendorCategory category);

    /**
     * Count vendors by category
     */
    @Query("SELECT v.category, COUNT(v) FROM Vendor v WHERE v.status = 'APPROVED' GROUP BY v.category")
    List<Object[]> countVendorsByCategory();

    /**
     * Find vendors with location violations
     */
    @Query("SELECT DISTINCT viol.vendor FROM Violation viol WHERE viol.violationType = com.smc.svms.entity.ViolationType.LOCATION_VIOLATION AND viol.createdAt >= :since")
    List<Vendor> findVendorsWithLocationViolations(@Param("since") LocalDateTime since);

    /**
     * Search vendors by name or vendor ID
     */
    @Query("SELECT v FROM Vendor v WHERE (LOWER(v.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(v.vendorId) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) AND v.status = 'APPROVED'")
    List<Vendor> searchVendors(@Param("searchTerm") String searchTerm);

    /**
     * Find vendors by zone ID
     */
    @Query("SELECT v FROM Vendor v JOIN v.location vl WHERE vl.zone.id = :zoneId")
    List<Vendor> findByLocationZoneId(@Param("zoneId") Long zoneId);
}
