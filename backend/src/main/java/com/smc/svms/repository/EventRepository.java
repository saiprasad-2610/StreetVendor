package com.smc.svms.repository;

import com.smc.svms.entity.LocalEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<LocalEvent, Long> {

    @Query("SELECT e FROM LocalEvent e WHERE e.zone.id = :zoneId " +
           "AND e.startDate <= :endDate AND e.endDate >= :startDate")
    List<LocalEvent> findEventsInZoneAndDateRange(@Param("zoneId") Long zoneId, 
                                                   @Param("startDate") LocalDate startDate, 
                                                   @Param("endDate") LocalDate endDate);
}
