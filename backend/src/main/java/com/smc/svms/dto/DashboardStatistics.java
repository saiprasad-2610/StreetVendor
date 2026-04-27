package com.smc.svms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatistics {
    
    private Long totalVendors;
    private Long activeVendors;
    private Long pendingVendors;
    private Long totalZones;
    private Long activeZones;
    private Long totalViolations;
    private Long pendingViolations;
    private Long resolvedViolations;
    private Long totalChallans;
    private Long paidChallans;
    private Long pendingChallans;
    private BigDecimal totalRevenue;
    private BigDecimal monthlyRevenue;
    private List<Map<String, Object>> violationTrends;
    private List<Map<String, Object>> zoneUtilization;
    private List<Map<String, Object>> vendorCategories;
    private LocalDateTime lastUpdated;
}
