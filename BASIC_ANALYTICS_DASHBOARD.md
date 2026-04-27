# 📊 Basic Analytics Dashboard

## 📋 Simple, Effective Dashboard for SMC

### 1. Analytics Service

```java
@Service
public class BasicAnalyticsService {
    
    @Autowired
    private VendorRepository vendorRepository;
    
    @Autowired
    private ViolationRepository violationRepository;
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private CitizenReportRepository citizenReportRepository;
    
    @Autowired
    private ZoneRepository zoneRepository;
    
    /**
     * Get dashboard statistics
     */
    public DashboardStatistics getDashboardStatistics(LocalDate startDate, LocalDate endDate) {
        
        // Vendor statistics
        VendorStats vendorStats = getVendorStatistics();
        
        // Violation statistics
        ViolationStats violationStats = getViolationStatistics(startDate, endDate);
        
        // Revenue statistics
        RevenueStats revenueStats = getRevenueStatistics(startDate, endDate);
        
        // Citizen report statistics
        CitizenReportStats reportStats = getCitizenReportStatistics(startDate, endDate);
        
        // Zone statistics
        ZoneStats zoneStats = getZoneStatistics();
        
        return DashboardStatistics.builder()
            .vendorStats(vendorStats)
            .violationStats(violationStats)
            .revenueStats(revenueStats)
            .citizenReportStats(reportStats)
            .zoneStats(zoneStats)
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    /**
     * Get vendor statistics
     */
    private VendorStats getVendorStatistics() {
        
        long totalVendors = vendorRepository.count();
        long activeVendors = vendorRepository.countByStatus(VendorStatus.APPROVED);
        long pendingVendors = vendorRepository.countByStatus(VendorStatus.PENDING);
        long suspendedVendors = vendorRepository.countByStatus(VendorStatus.SUSPENDED);
        
        // Vendors by category
        List<Object[]> categoryData = vendorRepository.countVendorsByCategory();
        Map<VendorCategory, Long> vendorsByCategory = categoryData.stream()
            .collect(Collectors.toMap(
                row -> (VendorCategory) row[0],
                row -> (Long) row[1]
            ));
        
        // New vendors this month
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        long newVendorsThisMonth = vendorRepository.countByCreatedAtAfter(monthStart.atStartOfDay());
        
        return VendorStats.builder()
            .totalVendors(totalVendors)
            .activeVendors(activeVendors)
            .pendingVendors(pendingVendors)
            .suspendedVendors(suspendedVendors)
            .vendorsByCategory(vendorsByCategory)
            .newVendorsThisMonth(newVendorsThisMonth)
            .build();
    }
    
    /**
     * Get violation statistics
     */
    private ViolationStats getViolationStatistics(LocalDate startDate, LocalDate endDate) {
        
        List<Violation> violations = violationRepository
            .findByCreatedAtBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
        
        // Total violations
        long totalViolations = violations.size();
        
        // Violations by type
        Map<ViolationType, Long> violationsByType = violations.stream()
            .collect(Collectors.groupingBy(Violation::getViolationType, Collectors.counting()));
        
        // Violations by status
        Map<ViolationStatus, Long> violationsByStatus = violations.stream()
            .collect(Collectors.groupingBy(Violation::getStatus, Collectors.counting()));
        
        // Auto-detected vs manual
        long autoDetected = violations.stream()
            .mapToLong(v -> v.isAutoDetected() ? 1 : 0)
            .sum();
        
        long manualDetected = totalViolations - autoDetected;
        
        // Resolved violations
        long resolvedViolations = violations.stream()
            .mapToLong(v -> v.getStatus() == ViolationStatus.RESOLVED ? 1 : 0)
            .sum();
        
        double resolutionRate = totalViolations > 0 ? (double) resolvedViolations / totalViolations : 0.0;
        
        // Vendor violation count
        Map<Long, Long> violationsByVendor = violations.stream()
            .collect(Collectors.groupingBy(Violation::getVendorId, Collectors.counting()));
        
        // Top violating vendors
        List<VendorViolationCount> topViolatingVendors = violationsByVendor.entrySet().stream()
            .map(entry -> new VendorViolationCount(entry.getKey(), entry.getValue()))
            .sorted(Comparator.comparing(VendorViolationCount::getCount).reversed())
            .limit(10)
            .collect(Collectors.toList());
        
        return ViolationStats.builder()
            .totalViolations(totalViolations)
            .violationsByType(violationsByType)
            .violationsByStatus(violationsByStatus)
            .autoDetected(autoDetected)
            .manualDetected(manualDetected)
            .resolutionRate(resolutionRate)
            .topViolatingVendors(topViolatingVendors)
            .build();
    }
    
    /**
     * Get revenue statistics
     */
    private RevenueStats getRevenueStatistics(LocalDate startDate, LocalDate endDate) {
        
        List<Payment> payments = paymentRepository
            .findByPaymentStatusAndCreatedAtBetween(
                PaymentStatus.COMPLETED,
                startDate.atStartOfDay(),
                endDate.atTime(23, 59, 59)
            );
        
        // Total revenue
        BigDecimal totalRevenue = payments.stream()
            .map(Payment::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Revenue by payment type
        Map<PaymentType, BigDecimal> revenueByType = payments.stream()
            .collect(Collectors.groupingBy(
                Payment::getPaymentType,
                Collectors.mapping(Payment::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))
            ));
        
        // Revenue by month
        Map<String, BigDecimal> revenueByMonth = payments.stream()
            .collect(Collectors.groupingBy(
                p -> p.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM yyyy")),
                Collectors.mapping(Payment::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))
            ));
        
        // Average transaction value
        double averageTransactionValue = payments.stream()
            .mapToDouble(p -> p.getAmount().doubleValue())
            .average()
            .orElse(0.0);
        
        // Total transactions
        long totalTransactions = payments.size();
        
        // Revenue growth (compare with previous period)
        BigDecimal previousRevenue = getPreviousPeriodRevenue(startDate, endDate);
        double revenueGrowth = previousRevenue.compareTo(BigDecimal.ZERO) > 0 ?
            totalRevenue.subtract(previousRevenue).divide(previousRevenue, 4, RoundingMode.HALF_UP).doubleValue() : 0.0;
        
        return RevenueStats.builder()
            .totalRevenue(totalRevenue)
            .revenueByType(revenueByType)
            .revenueByMonth(revenueByMonth)
            .averageTransactionValue(averageTransactionValue)
            .totalTransactions(totalTransactions)
            .revenueGrowth(revenueGrowth)
            .build();
    }
    
    /**
     * Get citizen report statistics
     */
    private CitizenReportStats getCitizenReportStatistics(LocalDate startDate, LocalDate endDate) {
        
        List<CitizenReport> reports = citizenReportRepository
            .findByCreatedAtBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
        
        // Total reports
        long totalReports = reports.size();
        
        // Reports by type
        Map<ReportType, Long> reportsByType = reports.stream()
            .collect(Collectors.groupingBy(CitizenReport::getReportType, Collectors.counting()));
        
        // Reports by status
        Map<ReportStatus, Long> reportsByStatus = reports.stream()
            .collect(Collectors.groupingBy(CitizenReport::getStatus, Collectors.counting()));
        
        // Confirmed reports
        long confirmedReports = reports.stream()
            .mapToLong(r -> r.getStatus() == ReportStatus.CONFIRMED ? 1 : 0)
            .sum();
        
        double confirmationRate = totalReports > 0 ? (double) confirmedReports / totalReports : 0.0;
        
        // Reports by day
        Map<LocalDate, Long> reportsByDay = reports.stream()
            .collect(Collectors.groupingBy(
                r -> r.getCreatedAt().toLocalDate(),
                Collectors.counting()
            ));
        
        return CitizenReportStats.builder()
            .totalReports(totalReports)
            .reportsByType(reportsByType)
            .reportsByStatus(reportsByStatus)
            .confirmedReports(confirmedReports)
            .confirmationRate(confirmationRate)
            .reportsByDay(reportsByDay)
            .build();
    }
    
    /**
     * Get zone statistics
     */
    private ZoneStats getZoneStatistics() {
        
        List<Zone> zones = zoneRepository.findAllActiveZones();
        
        // Total zones
        long totalZones = zones.size();
        
        // Zones by type
        Map<ZoneType, Long> zonesByType = zones.stream()
            .collect(Collectors.groupingBy(Zone::getZoneType, Collectors.counting()));
        
        // Zone capacity utilization
        List<ZoneCapacity> zoneCapacities = new ArrayList<>();
        
        for (Zone zone : zones) {
            int currentVendors = vendorRepository.countByZoneId(zone.getId());
            int maxVendors = zone.getMaxVendors() != null ? zone.getMaxVendors() : 10;
            double utilizationRate = maxVendors > 0 ? (double) currentVendors / maxVendors : 0.0;
            
            zoneCapacities.add(ZoneCapacity.builder()
                .zoneId(zone.getId())
                .zoneName(zone.getName())
                .currentVendors(currentVendors)
                .maxVendors(maxVendors)
                .utilizationRate(utilizationRate)
                .isFull(currentVendors >= maxVendors)
                .build());
        }
        
        // Top utilized zones
        List<ZoneCapacity> topUtilizedZones = zoneCapacities.stream()
            .sorted(Comparator.comparing(ZoneCapacity::getUtilizationRate).reversed())
            .limit(5)
            .collect(Collectors.toList());
        
        return ZoneStats.builder()
            .totalZones(totalZones)
            .zonesByType(zonesByType)
            .zoneCapacities(zoneCapacities)
            .topUtilizedZones(topUtilizedZones)
            .build();
    }
    
    /**
     * Get real-time statistics
     */
    public RealTimeStats getRealTimeStats() {
        
        // Current active vendors
        long activeVendors = vendorRepository.countByStatus(VendorStatus.APPROVED);
        
        // Today's violations
        long todayViolations = violationRepository.countByCreatedAtAfter(
            LocalDate.now().atStartOfDay()
        );
        
        // Today's revenue
        BigDecimal todayRevenue = paymentRepository
            .findTotalRevenueByDate(LocalDate.now());
        
        // Pending citizen reports
        long pendingReports = citizenReportRepository
            .countByStatus(ReportStatus.PENDING_REVIEW);
        
        // System health
        SystemHealth systemHealth = getSystemHealth();
        
        return RealTimeStats.builder()
            .activeVendors(activeVendors)
            .todayViolations(todayViolations)
            .todayRevenue(todayRevenue)
            .pendingReports(pendingReports)
            .systemHealth(systemHealth)
            .timestamp(LocalDateTime.now())
            .build();
    }
    
    private SystemHealth getSystemHealth() {
        
        // Database health
        boolean databaseHealthy = checkDatabaseHealth();
        
        // API response time
        double apiResponseTime = getAverageApiResponseTime();
        
        // Error rate
        double errorRate = getErrorRate();
        
        // Overall health status
        HealthStatus status = HealthStatus.HEALTHY;
        if (!databaseHealthy || apiResponseTime > 2000 || errorRate > 0.05) {
            status = HealthStatus.UNHEALTHY;
        } else if (apiResponseTime > 1000 || errorRate > 0.02) {
            status = HealthStatus.WARNING;
        }
        
        return SystemHealth.builder()
            .status(status)
            .databaseHealthy(databaseHealthy)
            .apiResponseTime(apiResponseTime)
            .errorRate(errorRate)
            .build();
    }
}
```

### 2. Analytics Controller

```java
@RestController
@RequestMapping("/api/analytics")
@PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
public class AnalyticsController {
    
    @Autowired
    private BasicAnalyticsService analyticsService;
    
    /**
     * Get dashboard statistics
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardStatistics>> getDashboardStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }
        
        DashboardStatistics stats = analyticsService.getDashboardStatistics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
    
    /**
     * Get real-time statistics
     */
    @GetMapping("/realtime")
    public ResponseEntity<ApiResponse<RealTimeStats>> getRealTimeStats() {
        
        RealTimeStats stats = analyticsService.getRealTimeStats();
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
    
    /**
     * Get vendor performance data
     */
    @GetMapping("/vendor-performance")
    public ResponseEntity<ApiResponse<List<VendorPerformance>>> getVendorPerformance(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<VendorPerformance> performance = analyticsService.getVendorPerformance(pageable);
        
        return ResponseEntity.ok(ApiResponse.success(performance.getContent()));
    }
    
    /**
     * Get zone utilization data
     */
    @GetMapping("/zone-utilization")
    public ResponseEntity<ApiResponse<List<ZoneUtilization>>> getZoneUtilization() {
        
        List<ZoneUtilization> utilization = analyticsService.getZoneUtilization();
        
        return ResponseEntity.ok(ApiResponse.success(utilization));
    }
    
    /**
     * Get revenue trends
     */
    @GetMapping("/revenue-trends")
    public ResponseEntity<ApiResponse<RevenueTrends>> getRevenueTrends(
            @RequestParam(defaultValue = "6") int months) {
        
        RevenueTrends trends = analyticsService.getRevenueTrends(months);
        
        return ResponseEntity.ok(ApiResponse.success(trends));
    }
    
    /**
     * Export analytics data
     */
    @GetMapping("/export")
    public ResponseEntity<Resource> exportAnalyticsData(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "PDF") String format) {
        
        switch (format.toUpperCase()) {
            case "PDF":
                return exportAsPDF(startDate, endDate);
            case "EXCEL":
                return exportAsExcel(startDate, endDate);
            case "CSV":
                return exportAsCSV(startDate, endDate);
            default:
                throw new IllegalArgumentException("Unsupported format: " + format);
        }
    }
}
```

### 3. React Dashboard Component

```javascript
// components/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, DatePicker, Select, Spin } from 'antd';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { fetchDashboardStats, fetchRealTimeStats } from '../services/analyticsService';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([
    new Date().setDate(new Date().getDate() - 30),
    new Date()
  ]);
  const [dashboardData, setDashboardData] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);

  useEffect(() => {
    loadDashboardData();
    loadRealTimeData();
    
    // Refresh real-time data every 30 seconds
    const interval = setInterval(loadRealTimeData, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const response = await fetchDashboardStats({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRealTimeData = async () => {
    try {
      const response = await fetchRealTimeStats();
      setRealTimeData(response.data);
    } catch (error) {
      console.error('Failed to load real-time data:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header with date range selector */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card>
            <Row justify="space-between" align="middle">
              <Col>
                <h2>SMC Vendor Analytics Dashboard</h2>
              </Col>
              <Col>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ marginRight: '16px' }}
                />
                <Select defaultValue="monthly" style={{ width: 120 }}>
                  <Option value="daily">Daily</Option>
                  <Option value="weekly">Weekly</Option>
                  <Option value="monthly">Monthly</Option>
                </Select>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Real-time Statistics */}
      {realTimeData && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Active Vendors"
                value={realTimeData.activeVendors}
                prefix={<span style={{ color: '#52c41a' }}>👥</span>}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Today's Violations"
                value={realTimeData.todayViolations}
                prefix={<span style={{ color: '#ff4d4f' }}>⚠️</span>}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Today's Revenue"
                value={realTimeData.todayRevenue}
                prefix="₹"
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending Reports"
                value={realTimeData.pendingReports}
                prefix={<span style={{ color: '#faad14' }}>📋</span>}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Vendor Statistics */}
      {dashboardData?.vendorStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={18}>
            <Card title="Vendor Statistics">
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Statistic
                    title="Total Vendors"
                    value={dashboardData.vendorStats.totalVendors}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Active"
                    value={dashboardData.vendorStats.activeVendors}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Pending"
                    value={dashboardData.vendorStats.pendingVendors}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Suspended"
                    value={dashboardData.vendorStats.suspendedVendors}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
              </Row>
              
              {/* Vendor Categories Chart */}
              <Row style={{ marginTop: '20px' }}>
                <Col span={24}>
                  <h4>Vendors by Category</h4>
                  <PieChart width={600} height={250}>
                    <Pie
                      data={Object.entries(dashboardData.vendorStats.vendorsByCategory).map(([key, value]) => ({
                        name: key,
                        value: value
                      }))}
                      cx={300}
                      cy={125}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(dashboardData.vendorStats.vendorsByCategory).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col span={6}>
            <Card title="New Vendors This Month">
              <Statistic
                value={dashboardData.vendorStats.newVendorsThisMonth}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Violation Statistics */}
      {dashboardData?.violationStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={12}>
            <Card title="Violation Statistics">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Total Violations"
                    value={dashboardData.violationStats.totalViolations}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Resolution Rate"
                    value={(dashboardData.violationStats.resolutionRate * 100).toFixed(1)}
                    suffix="%"
                    valueStyle={{ color: dashboardData.violationStats.resolutionRate > 0.7 ? '#52c41a' : '#ff4d4f' }}
                  />
                </Col>
              </Row>
              
              {/* Violation Types Chart */}
              <Row style={{ marginTop: '20px' }}>
                <Col span={24}>
                  <h4>Violations by Type</h4>
                  <BarChart width={500} height={200}>
                    <Bar data={Object.entries(dashboardData.violationStats.violationsByType).map(([key, value]) => ({
                      type: key,
                      count: value
                    }))} fill="#8884d8" />
                    <XAxis dataKey="type" />
                    <YAxis />
                  </BarChart>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="Detection Method">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Auto-Detected"
                    value={dashboardData.violationStats.autoDetected}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Manual Detection"
                    value={dashboardData.violationStats.manualDetected}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Revenue Statistics */}
      {dashboardData?.revenueStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={24}>
            <Card title="Revenue Statistics">
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Statistic
                    title="Total Revenue"
                    value={dashboardData.revenueStats.totalRevenue}
                    prefix="₹"
                    precision={2}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Transactions"
                    value={dashboardData.revenueStats.totalTransactions}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Average Transaction"
                    value={dashboardData.revenueStats.averageTransactionValue}
                    prefix="₹"
                    precision={2}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Revenue Growth"
                    value={(dashboardData.revenueStats.revenueGrowth * 100).toFixed(1)}
                    suffix="%"
                    valueStyle={{ 
                      color: dashboardData.revenueStats.revenueGrowth > 0 ? '#52c41a' : '#ff4d4f' 
                    }}
                  />
                </Col>
              </Row>
              
              {/* Revenue Trend Chart */}
              <Row style={{ marginTop: '20px' }}>
                <Col span={24}>
                  <h4>Revenue Trend</h4>
                  <LineChart width={800} height={300}>
                    <Line type="monotone" dataKey="revenue" stroke="#52c41a" strokeWidth={2} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <LineChart
                      width={800}
                      height={300}
                      data={Object.entries(dashboardData.revenueStats.revenueByMonth).map(([month, revenue]) => ({
                        month: month,
                        revenue: revenue
                      }))}
                    />
                  </LineChart>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Zone Statistics */}
      {dashboardData?.zoneStats && (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Zone Utilization">
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Statistic
                    title="Total Zones"
                    value={dashboardData.zoneStats.totalZones}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Full Zones"
                    value={dashboardData.zoneStats.zoneCapacities.filter(z => z.isFull).length}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Average Utilization"
                    value={(
                      dashboardData.zoneStats.zoneCapacities.reduce((sum, z) => sum + z.utilizationRate, 0) / 
                      dashboardData.zoneStats.zoneCapacities.length * 100
                    ).toFixed(1)}
                    suffix="%"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Highest Utilization"
                    value={(
                      Math.max(...dashboardData.zoneStats.zoneCapacities.map(z => z.utilizationRate)) * 100
                    ).toFixed(1)}
                    suffix="%"
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
```

This basic analytics dashboard provides **essential insights** for SMC management without the complexity of advanced AI/ML systems, making it perfect for Phase 1 implementation.
