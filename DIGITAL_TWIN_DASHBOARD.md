# 🗺️ Digital Twin Dashboard Architecture

## 🌆 Real-Time Smart City Visualization Platform

### 1. Digital Twin Core Service

```java
@Service
public class DigitalTwinService {
    
    @Autowired
    private RealTimeDataService realTimeService;
    
    @Autowired
    private ZoneRepository zoneRepository;
    
    @Autowired
    private VendorRepository vendorRepository;
    
    @Autowired
    private AnalyticsService analyticsService;
    
    @Autowired
    private WebSocketService webSocketService;
    
    /**
     * Generate comprehensive digital twin data
     */
    public DigitalTwinData generateDigitalTwin() {
        
        DigitalTwinData twinData = DigitalTwinData.builder()
            .timestamp(LocalDateTime.now())
            .cityInfo(getCityInfo())
            .zones(getZoneData())
            .vendors(getVendorData())
            .violations(getViolationData())
            .alerts(getAlertData())
            .analytics(getAnalyticsData())
            .predictions(getPredictionData())
            .build();
        
        return twinData;
    }
    
    /**
     * Get zone-level digital twin data
     */
    public ZoneDigitalTwin getZoneDigitalTwin(Long zoneId) {
        
        Zone zone = zoneRepository.findById(zoneId)
            .orElseThrow(() -> new ResourceNotFoundException("Zone not found"));
        
        return ZoneDigitalTwin.builder()
            .zoneId(zoneId)
            .zoneName(zone.getName())
            .zoneType(zone.getZoneType())
            .boundaries(zone.getPolygonCoordinates())
            .currentVendors(getCurrentVendorsInZone(zoneId))
            .vendorCapacity(zone.getMaxVendors())
            .utilizationRate(calculateUtilizationRate(zoneId))
            .violationHotspots(getViolationHotspots(zoneId))
            .demandHeatmap(getDemandHeatmap(zoneId))
            .congestionLevel(getCongestionLevel(zoneId))
            .realTimeMetrics(getRealTimeZoneMetrics(zoneId))
            .alerts(getActiveZoneAlerts(zoneId))
            .predictions(getZonePredictions(zoneId))
            .lastUpdated(LocalDateTime.now())
            .build();
    }
    
    private List<ZoneData> getZoneData() {
        
        List<Zone> zones = zoneRepository.findAllActiveZones();
        
        return zones.stream().map(zone -> {
            
            int currentVendors = realTimeService.getVendorCountInZone(zone.getId());
            double utilizationRate = (double) currentVendors / zone.getMaxVendors();
            
            return ZoneData.builder()
                .zoneId(zone.getId())
                .zoneName(zone.getName())
                .zoneType(zone.getZoneType())
                .boundaries(zone.getPolygonCoordinates())
                .centerLatitude(zone.getLatitude())
                .centerLongitude(zone.getLongitude())
                .maxVendors(zone.getMaxVendors())
                .currentVendors(currentVendors)
                .utilizationRate(utilizationRate)
                .congestionLevel(utilizationRate > zone.getCongestionThreshold() ? HIGH : 
                               utilizationRate > 0.7 ? MEDIUM : LOW)
                .averageDemand(getAverageDemand(zone.getId()))
                .violationCount(getRecentViolationCount(zone.getId()))
                .alertCount(getActiveAlertCount(zone.getId()))
                .build();
        }).collect(Collectors.toList());
    }
    
    private List<VendorData> getVendorData() {
        
        List<Vendor> activeVendors = vendorRepository.findActiveVendors();
        
        return activeVendors.stream().map(vendor -> {
            
            VendorLocation location = vendor.getLocation();
            VendorTrackingLog latestTracking = realTimeService.getLatestTracking(vendor.getId());
            
            return VendorData.builder()
                .vendorId(vendor.getId())
                .vendorName(vendor.getName())
                .vendorIdCode(vendor.getVendorId())
                .category(vendor.getCategory())
                .status(vendor.getStatus())
                .assignedLatitude(location != null ? location.getLatitude() : null)
                .assignedLongitude(location != null ? location.getLongitude() : null)
                .currentLatitude(latestTracking != null ? latestTracking.getLatitude() : null)
                .currentLongitude(latestTracking != null ? latestTracking.getLongitude() : null)
                .isWithinZone(isVendorWithinZone(vendor))
                .lastActive(latestTracking != null ? latestTracking.getCreatedAt() : null)
                .complianceScore(vendor.getComplianceScore())
                .averageRating(vendor.getAverageRating())
                .monthlyRent(vendor.getMonthlyRent())
                .zoneId(location != null ? location.getZone().getId() : null)
                .build();
        }).collect(Collectors.toList());
    }
    
    private ViolationHeatmapData getViolationData() {
        
        List<Violation> recentViolations = violationRepository
            .findRecentViolations(LocalDateTime.now().minusDays(30));
        
        // Group violations by location for heatmap
        Map<String, Integer> violationClusters = recentViolations.stream()
            .collect(Collectors.groupingBy(
                v -> String.format("%.6f,%.6f", v.getLocationLatitude(), v.getLocationLongitude()),
                Collectors.collectingAndThen(Collectors.counting(), Math::toIntExact)
            ));
        
        return ViolationHeatmapData.builder()
            .violationClusters(violationClusters)
            .totalViolations(recentViolations.size())
            .violationTypeDistribution(getViolationTypeDistribution(recentViolations))
            .severityDistribution(getSeverityDistribution(recentViolations))
            .trendData(getViolationTrendData())
            .build();
    }
    
    private DemandHeatmapData getDemandData() {
        
        List<DemandPattern> demandPatterns = demandPatternRepository
            .findRecentPatterns(LocalDateTime.now().minusDays(30));
        
        // Generate demand heatmap grid
        DemandHeatmapGrid heatmapGrid = generateDemandHeatmap(demandPatterns);
        
        return DemandHeatmapData.builder()
            .heatmapGrid(heatmapGrid)
            .highDemandZones(getHighDemandZones())
            .peakDemandHours(getPeakDemandHours())
            .categoryDemandBreakdown(getCategoryDemandBreakdown())
            .demandTrends(getDemandTrends())
            .build();
    }
}
```

### 2. Real-Time Data Streaming Service

```java
@Service
public class RealTimeDataService {
    
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Stream real-time updates to dashboard
     */
    @Scheduled(fixedRate = 5000) // Every 5 seconds
    public void streamRealTimeUpdates() {
        
        DigitalTwinUpdate update = DigitalTwinUpdate.builder()
            .timestamp(LocalDateTime.now())
            .vendorMovements(getVendorMovements())
            .newViolations(getNewViolations())
            .zoneUtilizationUpdates(getZoneUtilizationUpdates())
            .alertUpdates(getAlertUpdates())
            .build();
        
        // Send to WebSocket clients
        messagingTemplate.convertAndSend("/topic/digital-twin-updates", update);
        
        // Send to Kafka for processing
        kafkaTemplate.send("digital-twin-updates", update);
    }
    
    /**
     * Handle vendor location updates
     */
    @KafkaListener(topics = "vendor-location-updates")
    public void handleVendorLocationUpdate(VendorLocationUpdate update) {
        
        // Update digital twin
        VendorData vendorUpdate = VendorData.builder()
            .vendorId(update.getVendorId())
            .currentLatitude(update.getLatitude())
            .currentLongitude(update.getLongitude())
            .isWithinZone(checkZoneCompliance(update))
            .lastActive(LocalDateTime.now())
            .build();
        
        // Broadcast to dashboard
        messagingTemplate.convertAndSend("/topic/vendor-updates", vendorUpdate);
        
        // Update zone metrics
        updateZoneMetrics(update.getZoneId());
    }
    
    /**
     * Handle violation events
     */
    @KafkaListener(topics = "violation-events")
    public void handleViolationEvent(ViolationEvent event) {
        
        ViolationAlert alert = ViolationAlert.builder()
            .violationId(event.getViolationId())
            .vendorId(event.getVendorId())
            .violationType(event.getViolationType())
            .severity(event.getSeverity())
            .locationLatitude(event.getLatitude())
            .locationLongitude(event.getLongitude())
            .timestamp(event.getTimestamp())
            .build();
        
        // Broadcast to dashboard
        messagingTemplate.convertAndSend("/topic/violation-alerts", alert);
        
        // Update violation heatmap
        updateViolationHeatmap(event);
    }
    
    private List<VendorMovement> getVendorMovements() {
        
        // Get vendor movements in last 5 minutes
        List<VendorTrackingLog> recentMovements = trackingRepository
            .findRecentMovements(LocalDateTime.now().minusMinutes(5));
        
        return recentMovements.stream()
            .map(log -> VendorMovement.builder()
                .vendorId(log.getVendorId())
                .fromLatitude(log.getPreviousLatitude())
                .fromLongitude(log.getPreviousLongitude())
                .toLatitude(log.getLatitude())
                .toLongitude(log.getLongitude())
                .movementSpeed(log.getSpeedKmh())
                .timestamp(log.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }
    
    private void updateViolationHeatmap(ViolationEvent event) {
        
        // Update real-time violation heatmap
        HeatmapPoint point = HeatmapPoint.builder()
            .latitude(event.getLatitude())
            .longitude(event.getLongitude())
            .intensity(getViolationIntensity(event.getViolationType()))
            .timestamp(event.getTimestamp())
            .build();
        
        messagingTemplate.convertAndSend("/topic/violation-heatmap-updates", point);
    }
}
```

### 3. Advanced Visualization Components

```java
@RestController
@RequestMapping("/api/digital-twin")
public class DigitalTwinController {
    
    @Autowired
    private DigitalTwinService digitalTwinService;
    
    @Autowired
    private AnalyticsService analyticsService;
    
    /**
     * Get full digital twin data
     */
    @GetMapping("/full")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<DigitalTwinData>> getDigitalTwin() {
        
        DigitalTwinData twinData = digitalTwinService.generateDigitalTwin();
        
        return ResponseEntity.ok(ApiResponse.success(twinData));
    }
    
    /**
     * Get zone-specific digital twin
     */
    @GetMapping("/zone/{zoneId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<ZoneDigitalTwin>> getZoneDigitalTwin(
            @PathVariable Long zoneId) {
        
        ZoneDigitalTwin zoneTwin = digitalTwinService.getZoneDigitalTwin(zoneId);
        
        return ResponseEntity.ok(ApiResponse.success(zoneTwin));
    }
    
    /**
     * Get real-time heatmap data
     */
    @GetMapping("/heatmap/{type}")
    public ResponseEntity<ApiResponse<HeatmapData>> getHeatmapData(
            @PathVariable HeatmapType type,
            @RequestParam(required = false) Long zoneId) {
        
        HeatmapData heatmapData = switch (type) {
            case VIOLATION -> getViolationHeatmap(zoneId);
            case DEMAND -> getDemandHeatmap(zoneId);
            case CONGESTION -> getCongestionHeatmap(zoneId);
            case REVENUE -> getRevenueHeatmap(zoneId);
        };
        
        return ResponseEntity.ok(ApiResponse.success(heatmapData));
    }
    
    /**
     * Get predictive analytics
     */
    @GetMapping("/predictions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PredictionData>> getPredictions(
            @RequestParam(required = false) Long zoneId,
            @RequestParam(defaultValue = "24") int hoursAhead) {
        
        PredictionData predictions = analyticsService.getPredictions(zoneId, hoursAhead);
        
        return ResponseEntity.ok(ApiResponse.success(predictions));
    }
    
    /**
     * Get real-time metrics stream
     */
    @GetMapping("/metrics/stream")
    public SseEmitter getMetricsStream() {
        
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        
        // Subscribe to real-time updates
        subscriptionService.subscribe(emitter, "digital-twin-metrics");
        
        return emitter;
    }
}
```

### 4. Frontend Digital Twin Dashboard (React)

```javascript
// DigitalTwinDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, CircleMarker, Tooltip } from 'react-leaflet';
import { Card, Row, Col, Statistic, Alert, Spin } from 'antd';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import 'leaflet/dist/leaflet.css';
import './DigitalTwinDashboard.css';

const DigitalTwinDashboard = () => {
    const [digitalTwinData, setDigitalTwinData] = useState(null);
    const [selectedZone, setSelectedZone] = useState(null);
    const [realTimeUpdates, setRealTimeUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stompClient, setStompClient] = useState(null);
    const mapRef = useRef();

    // Initialize WebSocket connection
    useEffect(() => {
        const socket = new SockJS('/ws');
        const client = Stomp.over(socket);
        
        client.connect({}, () => {
            // Subscribe to real-time updates
            client.subscribe('/topic/digital-twin-updates', (message) => {
                const update = JSON.parse(message.body);
                setRealTimeUpdates(prev => [...prev.slice(-99), update]);
            });
            
            client.subscribe('/topic/vendor-updates', (message) => {
                const vendorUpdate = JSON.parse(message.body);
                updateVendorPosition(vendorUpdate);
            });
            
            client.subscribe('/topic/violation-alerts', (message) => {
                const violation = JSON.parse(message.body);
                handleViolationAlert(violation);
            });
        });
        
        setStompClient(client);
        
        return () => {
            if (client) client.disconnect();
        };
    }, []);

    // Load initial data
    useEffect(() => {
        loadDigitalTwinData();
        const interval = setInterval(loadDigitalTwinData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const loadDigitalTwinData = async () => {
        try {
            const response = await fetch('/api/digital-twin/full', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await response.json();
            setDigitalTwinData(data.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load digital twin data:', error);
            setLoading(false);
        }
    };

    const updateVendorPosition = (vendorUpdate) => {
        setDigitalTwinData(prev => {
            if (!prev) return prev;
            
            const updatedVendors = prev.vendors.map(vendor =>
                vendor.vendorId === vendorUpdate.vendorId
                    ? { ...vendor, ...vendorUpdate }
                    : vendor
            );
            
            return { ...prev, vendors: updatedVendors };
        });
    };

    const handleViolationAlert = (violation) => {
        // Show notification
        notification.error({
            message: 'Violation Detected',
            description: `${violation.violationType} violation for vendor ${violation.vendorId}`,
            duration: 5
        });
        
        // Update map
        if (mapRef.current) {
            mapRef.current.setView([violation.locationLatitude, violation.locationLongitude], 16);
        }
    };

    const getZoneColor = (zone) => {
        const utilization = zone.utilizationRate;
        if (utilization > 0.9) return '#ff4d4f'; // Red - Overcrowded
        if (utilization > 0.7) return '#faad14'; // Orange - Busy
        if (utilization > 0.4) return '#52c41a'; // Green - Normal
        return '#1890ff'; // Blue - Low activity
    };

    const getVendorIcon = (vendor) => {
        if (!vendor.isWithinZone) return '🚫';
        if (vendor.complianceScore < 0.7) return '⚠️';
        return '✅';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
                <p>Loading Digital Twin Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="digital-twin-dashboard">
            {/* Header Statistics */}
            <Row gutter={[16, 16]} className="dashboard-header">
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Vendors"
                            value={digitalTwinData.vendors.length}
                            prefix={<span className="stat-icon">👥</span>}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Active Zones"
                            value={digitalTwinData.zones.length}
                            prefix={<span className="stat-icon">📍</span>}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Compliance Rate"
                            value={digitalTwinData.analytics.complianceRate * 100}
                            precision={1}
                            suffix="%"
                            prefix={<span className="stat-icon">✅</span>}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Active Alerts"
                            value={digitalTwinData.alerts.filter(a => !a.resolved).length}
                            prefix={<span className="stat-icon">🚨</span>}
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Main Content */}
            <Row gutter={[16, 16]} className="dashboard-content">
                {/* Interactive Map */}
                <Col span={16}>
                    <Card title="Real-Time City View" className="map-card">
                        <MapContainer
                            center={[17.6599, 75.9064]} // Solapur coordinates
                            zoom={13}
                            style={{ height: '600px' }}
                            ref={mapRef}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            
                            {/* Zone Polygons */}
                            {digitalTwinData.zones.map(zone => (
                                <Polygon
                                    key={zone.zoneId}
                                    positions={JSON.parse(zone.boundaries)}
                                    pathOptions={{
                                        color: getZoneColor(zone),
                                        fillColor: getZoneColor(zone),
                                        fillOpacity: 0.3,
                                        weight: 2
                                    }}
                                    eventHandlers={{
                                        click: () => setSelectedZone(zone)
                                    }}
                                >
                                    <Tooltip>
                                        <div>
                                            <strong>{zone.zoneName}</strong><br/>
                                            Type: {zone.zoneType}<br/>
                                            Vendors: {zone.currentVendors}/{zone.maxVendors}<br/>
                                            Utilization: {(zone.utilizationRate * 100).toFixed(1)}%
                                        </div>
                                    </Tooltip>
                                </Polygon>
                            ))}
                            
                            {/* Vendor Markers */}
                            {digitalTwinData.vendors.map(vendor => (
                                <Marker
                                    key={vendor.vendorId}
                                    position={[vendor.currentLatitude, vendor.currentLongitude]}
                                    icon={L.divIcon({
                                        html: getVendorIcon(vendor),
                                        className: 'vendor-marker',
                                        iconSize: [20, 20]
                                    })}
                                >
                                    <Tooltip>
                                        <div>
                                            <strong>{vendor.vendorName}</strong><br/>
                                            ID: {vendor.vendorIdCode}<br/>
                                            Category: {vendor.category}<br/>
                                            Status: {vendor.status}<br/>
                                            Compliance: {(vendor.complianceScore * 100).toFixed(1)}%
                                        </div>
                                    </Tooltip>
                                </Marker>
                            ))}
                            
                            {/* Violation Heatmap Overlay */}
                            <ViolationHeatmapLayer data={digitalTwinData.violations.violationClusters} />
                        </MapContainer>
                    </Card>
                </Col>

                {/* Side Panels */}
                <Col span={8}>
                    {/* Zone Details */}
                    {selectedZone && (
                        <Card title={`Zone: ${selectedZone.zoneName}`} className="zone-details">
                            <Row gutter={[8, 8]}>
                                <Col span={12}>
                                    <Statistic
                                        title="Current Vendors"
                                        value={selectedZone.currentVendors}
                                        suffix={`/ ${selectedZone.maxVendors}`}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title="Utilization"
                                        value={selectedZone.utilizationRate * 100}
                                        precision={1}
                                        suffix="%"
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title="Violations Today"
                                        value={selectedZone.violationCount}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title="Alerts"
                                        value={selectedZone.alertCount}
                                        valueStyle={{ color: selectedZone.alertCount > 0 ? '#cf1322' : undefined }}
                                    />
                                </Col>
                            </Row>
                            
                            {/* Demand Chart */}
                            <div className="zone-demand-chart">
                                <h4>Demand Trend</h4>
                                <LineChart
                                    width={300}
                                    height={150}
                                    data={selectedZone.demandTrend}
                                >
                                    <Line type="monotone" dataKey="demand" stroke="#1890ff" strokeWidth={2} />
                                    <XAxis dataKey="time" />
                                </LineChart>
                            </div>
                        </Card>
                    )}

                    {/* Real-Time Alerts */}
                    <Card title="Active Alerts" className="alerts-panel">
                        <div className="alerts-list">
                            {digitalTwinData.alerts
                                .filter(alert => !alert.resolved)
                                .slice(0, 5)
                                .map(alert => (
                                    <Alert
                                        key={alert.id}
                                        message={alert.alertTitle}
                                        description={alert.alertMessage}
                                        type={alert.severity.toLowerCase()}
                                        showIcon
                                        closable
                                        style={{ marginBottom: 8 }}
                                    />
                                ))}
                        </div>
                    </Card>

                    {/* Analytics Charts */}
                    <Card title="Analytics Overview" className="analytics-panel">
                        <Tabs defaultActiveKey="violations">
                            <TabPane tab="Violations" key="violations">
                                <PieChart width={300} height={200}>
                                    <Pie
                                        data={digitalTwinData.violations.violationTypeDistribution}
                                        cx={150}
                                        cy={100}
                                        innerRadius={40}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {digitalTwinData.violations.violationTypeDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </TabPane>
                            <TabPane tab="Revenue" key="revenue">
                                <AreaChart width={300} height={200} data={digitalTwinData.analytics.revenueTrend}>
                                    <Area type="monotone" dataKey="revenue" stroke="#52c41a" fill="#52c41a" fillOpacity={0.3} />
                                    <XAxis dataKey="date" />
                                </AreaChart>
                            </TabPane>
                        </Tabs>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

// Custom Violation Heatmap Layer Component
const ViolationHeatmapLayer = ({ data }) => {
    const map = useMap();
    
    useEffect(() => {
        if (!data || Object.keys(data).length === 0) return;
        
        // Create heatmap overlay
        const heat = L.heatLayer(
            Object.entries(data).map(([coords, intensity]) => {
                const [lat, lng] = coords.split(',').map(Number);
                return [lat, lng, intensity];
            }),
            {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                max: 1.0,
                gradient: {
                    0.0: 'blue',
                    0.5: 'yellow',
                    1.0: 'red'
                }
            }
        );
        
        heat.addTo(map);
        
        return () => {
            map.removeLayer(heat);
        };
    }, [data, map]);
    
    return null;
};

export default DigitalTwinDashboard;
```

### 5. Advanced Analytics & Predictions

```java
@Service
public class DigitalTwinAnalyticsService {
    
    @Autowired
    private PredictiveAnalyticsService predictiveService;
    
    /**
     * Generate predictive insights for digital twin
     */
    public PredictiveInsights generatePredictiveInsights() {
        
        // Predict vendor movements
        List<VendorMovementPrediction> movementPredictions = predictVendorMovements();
        
        // Predict violation hotspots
        List<ViolationHotspotPrediction> violationPredictions = predictViolationHotspots();
        
        // Predict demand patterns
        List<DemandPrediction> demandPredictions = predictDemandPatterns();
        
        // Predict congestion areas
        List<CongestionPrediction> congestionPredictions = predictCongestion();
        
        return PredictiveInsights.builder()
            .vendorMovements(movementPredictions)
            .violationHotspots(violationPredictions)
            .demandPatterns(demandPredictions)
            .congestionAreas(congestionPredictions)
            .confidenceLevel(calculateOverallConfidence())
            .predictionHorizon(Duration.ofHours(24))
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    private List<VendorMovementPrediction> predictVendorMovements() {
        
        List<Vendor> activeVendors = vendorRepository.findActiveVendors();
        List<VendorMovementPrediction> predictions = new ArrayList<>();
        
        for (Vendor vendor : activeVendors) {
            
            // Get historical movement patterns
            List<VendorTrackingLog> historicalData = trackingRepository
                .findVendorMovementHistory(vendor.getId(), Duration.ofDays(30));
            
            // Apply ML model for movement prediction
            MovementPredictionRequest request = MovementPredictionRequest.builder()
                .vendorId(vendor.getId())
                .historicalData(historicalData)
                .currentTime(LocalDateTime.now())
                .predictionWindow(Duration.ofHours(6))
                .build();
            
            MovementPredictionResult result = predictiveService.predictMovements(request);
            
            predictions.add(VendorMovementPrediction.builder()
                .vendorId(vendor.getId())
                .predictedLocations(result.getPredictedLocations())
                .confidenceScore(result.getConfidence())
                .riskFactors(result.getRiskFactors())
                .build());
        }
        
        return predictions;
    }
    
    private List<ViolationHotspotPrediction> predictViolationHotspots() {
        
        // Get historical violation data
        List<Violation> historicalViolations = violationRepository
            .findRecentViolations(LocalDateTime.now().minusDays(90));
        
        // Apply spatial-temporal analysis
        SpatialTemporalAnalysis analysis = predictiveService
            .analyzeViolationPatterns(historicalViolations);
        
        // Generate hotspot predictions
        return analysis.getPredictedHotspots().stream()
            .map(hotspot -> ViolationHotspotPrediction.builder()
                .latitude(hotspot.getLatitude())
                .longitude(hotspot.getLongitude())
                .radius(hotspot.getRadius())
                .violationProbability(hotspot.getProbability())
                .predictedViolationTypes(hotspot.getViolationTypes())
                .timeWindow(hotspot.getTimeWindow())
                .confidence(hotspot.getConfidence())
                .build())
            .collect(Collectors.toList());
    }
}
```

This digital twin dashboard provides a comprehensive real-time visualization platform that transforms complex urban vending data into actionable insights, enabling smart city administrators to monitor, predict, and optimize the entire vending ecosystem.
