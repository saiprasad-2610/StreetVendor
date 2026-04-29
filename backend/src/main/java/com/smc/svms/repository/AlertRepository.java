package com.smc.svms.repository;

import com.smc.svms.entity.Alert;
import com.smc.svms.enums.AlertStatus;
import com.smc.svms.enums.AlertSeverity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByStatusOrderByCreatedAtDesc(AlertStatus status);
    
    List<Alert> findByStatusOrderByPriorityLevelDesc(AlertStatus status);
    
    Page<Alert> findByStatusOrderByCreatedAtDesc(AlertStatus status, Pageable pageable);
    
    List<Alert> findBySeverityOrderByCreatedAtDesc(AlertSeverity severity);
    
    Page<Alert> findBySeverityOrderByCreatedAtDesc(AlertSeverity severity, Pageable pageable);
    
    List<Alert> findByPriorityLevelGreaterThanEqualOrderByPriorityLevelDesc(Integer priorityLevel);
    
    List<Alert> findByOfficerIdOrderByCreatedAtDesc(Long officerId);

    List<Alert> findByVendor_IdOrderByCreatedAtDesc(Long vendorId);

    Page<Alert> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    List<Alert> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate);
    
    Page<Alert> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    Page<Alert> findByStatusAndSeverity(AlertStatus status, AlertSeverity severity, Pageable pageable);
    
    Page<Alert> findByAlertTypeOrderByCreatedAtDesc(String alertType, Pageable pageable);
    
    @Query("SELECT a FROM Alert a WHERE " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(a.message) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(a.alertType) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<Alert> searchAlerts(@Param("searchTerm") String searchTerm, Pageable pageable);
    
    boolean existsByZoneIdAndAlertTypeAndCreatedAtAfter(Long zoneId, String alertType, LocalDateTime since);
    
    boolean existsByAlertTypeAndCreatedAtAfter(String alertType, LocalDateTime since);
    
    @Query("SELECT COUNT(a) FROM Alert a WHERE a.createdAt >= :startDate")
    long countByCreatedAtAfter(@Param("startDate") LocalDateTime startDate);
}
