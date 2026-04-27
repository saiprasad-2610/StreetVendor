package com.smc.svms.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class RevenueStats {
    private BigDecimal totalRevenue;
    private BigDecimal monthlyRevenue;
    private BigDecimal dailyRevenue;
    private BigDecimal averageRevenuePerVendor;
    private java.util.Map<String, BigDecimal> revenueByZone;
    private java.util.Map<String, BigDecimal> revenueByCategory;
    private java.util.Map<String, BigDecimal> revenueByMonth;
    private java.util.List<java.util.Map<String, Object>> revenueTrend;
    private double averageTransactionValue;
    private long totalTransactions;
    private double revenueGrowth;
    private LocalDateTime lastUpdated;
    
    public RevenueStats() {
        this.lastUpdated = LocalDateTime.now();
    }
    
    public RevenueStats(BigDecimal totalRevenue, BigDecimal monthlyRevenue) {
        this.totalRevenue = totalRevenue;
        this.monthlyRevenue = monthlyRevenue;
        this.lastUpdated = LocalDateTime.now();
    }
    
    // Getters and Setters
    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }
    
    public BigDecimal getMonthlyRevenue() { return monthlyRevenue; }
    public void setMonthlyRevenue(BigDecimal monthlyRevenue) { this.monthlyRevenue = monthlyRevenue; }
    
    public BigDecimal getDailyRevenue() { return dailyRevenue; }
    public void setDailyRevenue(BigDecimal dailyRevenue) { this.dailyRevenue = dailyRevenue; }
    
    public BigDecimal getAverageRevenuePerVendor() { return averageRevenuePerVendor; }
    public void setAverageRevenuePerVendor(BigDecimal averageRevenuePerVendor) { this.averageRevenuePerVendor = averageRevenuePerVendor; }
    
    public java.util.Map<String, BigDecimal> getRevenueByZone() { return revenueByZone; }
    public void setRevenueByZone(java.util.Map<String, BigDecimal> revenueByZone) { this.revenueByZone = revenueByZone; }
    
    public java.util.Map<String, BigDecimal> getRevenueByCategory() { return revenueByCategory; }
    public void setRevenueByCategory(java.util.Map<String, BigDecimal> revenueByCategory) { this.revenueByCategory = revenueByCategory; }
    
    public java.util.Map<String, BigDecimal> getRevenueByMonth() { return revenueByMonth; }
    public void setRevenueByMonth(java.util.Map<String, BigDecimal> revenueByMonth) { this.revenueByMonth = revenueByMonth; }
    
    public java.util.List<java.util.Map<String, Object>> getRevenueTrend() { return revenueTrend; }
    public void setRevenueTrend(java.util.List<java.util.Map<String, Object>> revenueTrend) { this.revenueTrend = revenueTrend; }
    
    public double getAverageTransactionValue() { return averageTransactionValue; }
    public void setAverageTransactionValue(double averageTransactionValue) { this.averageTransactionValue = averageTransactionValue; }
    
    public long getTotalTransactions() { return totalTransactions; }
    public void setTotalTransactions(long totalTransactions) { this.totalTransactions = totalTransactions; }
    
    public double getRevenueGrowth() { return revenueGrowth; }
    public void setRevenueGrowth(double revenueGrowth) { this.revenueGrowth = revenueGrowth; }
    
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    
    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private BigDecimal totalRevenue;
        private BigDecimal monthlyRevenue;
        private BigDecimal dailyRevenue;
        private BigDecimal averageRevenuePerVendor;
        private java.util.Map<String, BigDecimal> revenueByZone;
        private java.util.Map<String, BigDecimal> revenueByCategory;
        private java.util.Map<String, BigDecimal> revenueByMonth;
        private java.util.List<java.util.Map<String, Object>> revenueTrend;
        private double averageTransactionValue;
        private long totalTransactions;
        private double revenueGrowth;
        private LocalDateTime lastUpdated;
        
        public Builder totalRevenue(BigDecimal totalRevenue) {
            this.totalRevenue = totalRevenue;
            return this;
        }
        
        public Builder monthlyRevenue(BigDecimal monthlyRevenue) {
            this.monthlyRevenue = monthlyRevenue;
            return this;
        }
        
        public Builder dailyRevenue(BigDecimal dailyRevenue) {
            this.dailyRevenue = dailyRevenue;
            return this;
        }
        
        public Builder averageRevenuePerVendor(BigDecimal averageRevenuePerVendor) {
            this.averageRevenuePerVendor = averageRevenuePerVendor;
            return this;
        }
        
        public Builder revenueByZone(java.util.Map<String, BigDecimal> revenueByZone) {
            this.revenueByZone = revenueByZone;
            return this;
        }
        
        public Builder revenueByCategory(java.util.Map<String, BigDecimal> revenueByCategory) {
            this.revenueByCategory = revenueByCategory;
            return this;
        }
        
        public Builder revenueByMonth(java.util.Map<String, BigDecimal> revenueByMonth) {
            this.revenueByMonth = revenueByMonth;
            return this;
        }
        
        public Builder revenueTrend(java.util.List<java.util.Map<String, Object>> revenueTrend) {
            this.revenueTrend = revenueTrend;
            return this;
        }
        
        public Builder averageTransactionValue(double averageTransactionValue) {
            this.averageTransactionValue = averageTransactionValue;
            return this;
        }
        
        public Builder totalTransactions(long totalTransactions) {
            this.totalTransactions = totalTransactions;
            return this;
        }
        
        public Builder revenueGrowth(double revenueGrowth) {
            this.revenueGrowth = revenueGrowth;
            return this;
        }
        
        public Builder lastUpdated(LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
            return this;
        }
        
        public RevenueStats build() {
            RevenueStats stats = new RevenueStats();
            stats.totalRevenue = this.totalRevenue;
            stats.monthlyRevenue = this.monthlyRevenue;
            stats.dailyRevenue = this.dailyRevenue;
            stats.averageRevenuePerVendor = this.averageRevenuePerVendor;
            stats.revenueByZone = this.revenueByZone;
            stats.revenueByCategory = this.revenueByCategory;
            stats.revenueByMonth = this.revenueByMonth;
            stats.revenueTrend = this.revenueTrend;
            stats.averageTransactionValue = this.averageTransactionValue;
            stats.totalTransactions = this.totalTransactions;
            stats.revenueGrowth = this.revenueGrowth;
            stats.lastUpdated = this.lastUpdated;
            return stats;
        }
    }
}
