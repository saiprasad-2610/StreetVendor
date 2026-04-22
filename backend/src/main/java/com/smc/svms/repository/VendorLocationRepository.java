package com.smc.svms.repository;

import com.smc.svms.entity.VendorLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VendorLocationRepository extends JpaRepository<VendorLocation, Long> {
}
