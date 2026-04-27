package com.smc.svms.service;

import java.time.LocalDateTime;

public class DashboardStatistics {
    private VendorStats vendorStats;
    private ViolationStats violationStats;
    private RevenueStats revenueStats;
    private CitizenReportStats citizenReportStats;
    private ZoneStats zoneStats;
    private LocalDateTime generatedAt;
    
    public DashboardStatistics() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private DashboardStatistics stats = new DashboardStatistics();
        public Builder vendorStats(VendorStats v) { stats.vendorStats = v; return this; }
        public Builder violationStats(ViolationStats v) { stats.violationStats = v; return this; }
        public Builder revenueStats(RevenueStats r) { stats.revenueStats = r; return this; }
        public Builder citizenReportStats(CitizenReportStats c) { stats.citizenReportStats = c; return this; }
        public Builder zoneStats(ZoneStats z) { stats.zoneStats = z; return this; }
        public Builder generatedAt(LocalDateTime g) { stats.generatedAt = g; return this; }
        public DashboardStatistics build() { return stats; }
    }
    
    public VendorStats getVendorStats() { return vendorStats; }
    public ViolationStats getViolationStats() { return violationStats; }
    public RevenueStats getRevenueStats() { return revenueStats; }
    public CitizenReportStats getCitizenReportStats() { return citizenReportStats; }
    public ZoneStats getZoneStats() { return zoneStats; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
}
