# 🗺️ Enhanced Geofencing Implementation

## 📋 Practical Polygon-Based Geofencing for SMC

### 1. Enhanced Zone Entity

```java
@Entity
@Table(name = "zones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Zone {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "zone_type", nullable = false, length = 20)
    private ZoneType zoneType;
    
    // Keep existing radius for backward compatibility
    @Column(name = "radius_meters")
    private Integer radiusMeters;
    
    // NEW: Polygon coordinates for complex zones
    @Column(name = "polygon_coordinates", columnDefinition = "JSON")
    private String polygonCoordinates;
    
    // NEW: Zone category for pricing rules
    @Enumerated(EnumType.STRING)
    @Column(name = "zone_category", length = 20)
    private ZoneCategory zoneCategory;
    
    // NEW: Maximum vendors allowed
    @Column(name = "max_vendors")
    private Integer maxVendors;
    
    // NEW: Time restrictions
    @Column(name = "time_restrictions", columnDefinition = "JSON")
    private String timeRestrictions;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Helper methods
    public boolean hasPolygon() {
        return polygonCoordinates != null && !polygonCoordinates.trim().isEmpty();
    }
    
    public boolean hasTimeRestrictions() {
        return timeRestrictions != null && !timeRestrictions.trim().isEmpty();
    }
}

// New enums
public enum ZoneCategory {
    PERMANENT, TEMPORARY, EVENT_BASED, PREMIUM
}

public enum ZoneType {
    ALLOWED, RESTRICTED, TIME_RESTRICTED, EVENT_ONLY
}
```

### 2. Enhanced Geofencing Service

```java
@Service
public class EnhancedGeofencingService {
    
    @Autowired
    private ZoneRepository zoneRepository;
    
    @Autowired
    private VendorLocationRepository vendorLocationRepository;
    
    private static final double EARTH_RADIUS = 6371000; // meters
    
    /**
     * Check if vendor is within their assigned zone
     */
    public LocationValidationResult validateVendorLocation(Long vendorId, double latitude, double longitude) {
        
        // Get vendor's assigned location
        VendorLocation vendorLocation = vendorLocationRepository.findByVendorId(vendorId);
        
        if (vendorLocation == null) {
            return LocationValidationResult.builder()
                .valid(false)
                .message("Vendor location not assigned")
                .build();
        }
        
        Zone zone = vendorLocation.getZone();
        
        if (zone == null) {
            return LocationValidationResult.builder()
                .valid(false)
                .message("Vendor not assigned to any zone")
                .build();
        }
        
        // Check zone type
        if (zone.getZoneType() == ZoneType.RESTRICTED) {
            return LocationValidationResult.builder()
                .valid(false)
                .message("Vendor assigned to restricted zone")
                .build();
        }
        
        // Check time restrictions
        if (zone.hasTimeRestrictions() && !isWithinTimeRestrictions(zone)) {
            return LocationValidationResult.builder()
                .valid(false)
                .message("Vendor not allowed at this time")
                .build();
        }
        
        // Validate location
        boolean isWithinZone = false;
        double distance = 0;
        
        if (zone.hasPolygon()) {
            // Use polygon validation
            isWithinZone = isPointInPolygon(latitude, longitude, zone.getPolygonCoordinates());
        } else if (zone.getRadiusMeters() != null) {
            // Use existing radius validation (backward compatibility)
            distance = calculateHaversineDistance(
                latitude, longitude,
                zone.getLatitude(), zone.getLongitude()
            );
            isWithinZone = distance <= zone.getRadiusMeters();
        } else {
            return LocationValidationResult.builder()
                .valid(false)
                .message("Zone has no valid boundaries")
                .build();
        }
        
        return LocationValidationResult.builder()
            .valid(isWithinZone)
            .distance(distance)
            .zoneName(zone.getName())
            .zoneType(zone.getZoneType())
            .message(isWithinZone ? "Vendor within assigned zone" : "Vendor outside assigned zone")
            .build();
    }
    
    /**
     * Check if point is within polygon using ray casting algorithm
     */
    private boolean isPointInPolygon(double latitude, double longitude, String polygonJson) {
        
        try {
            // Parse polygon coordinates
            List<Coordinate> polygon = parsePolygonCoordinates(polygonJson);
            
            if (polygon.size() < 3) {
                return false;
            }
            
            // Ray casting algorithm
            boolean inside = false;
            int intersections = 0;
            
            for (int i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
                
                Coordinate pi = polygon.get(i);
                Coordinate pj = polygon.get(j);
                
                if (((pi.getLatitude() <= latitude && latitude < pj.getLatitude()) ||
                     (pj.getLatitude() <= latitude && latitude < pi.getLatitude())) &&
                    (longitude < (pj.getLongitude() - pi.getLongitude()) * 
                     (latitude - pi.getLatitude()) / 
                     (pj.getLatitude() - pi.getLatitude()) + pi.getLongitude())) {
                    intersections++;
                }
            }
            
            return intersections % 2 == 1;
            
        } catch (Exception e) {
            log.error("Error checking point in polygon", e);
            return false;
        }
    }
    
    /**
     * Parse polygon coordinates from JSON
     */
    private List<Coordinate> parsePolygonCoordinates(String polygonJson) {
        
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(polygonJson, 
                new TypeReference<List<Coordinate>>(){});
        } catch (Exception e) {
            log.error("Error parsing polygon coordinates", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Check time restrictions
     */
    private boolean isWithinTimeRestrictions(Zone zone) {
        
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> restrictions = mapper.readValue(
                zone.getTimeRestrictions(), 
                new TypeReference<Map<String, Object>>(){}
            );
            
            LocalTime currentTime = LocalTime.now();
            DayOfWeek currentDay = LocalDate.now().getDayOfWeek();
            
            // Check if current day is allowed
            List<String> allowedDays = (List<String>) restrictions.get("allowedDays");
            if (allowedDays != null && !allowedDays.isEmpty()) {
                if (!allowedDays.contains(currentDay.name())) {
                    return false;
                }
            }
            
            // Check time range
            Map<String, Object> timeRange = (Map<String, Object>) restrictions.get("timeRange");
            if (timeRange != null) {
                String startTimeStr = (String) timeRange.get("start");
                String endTimeStr = (String) timeRange.get("end");
                
                if (startTimeStr != null && endTimeStr != null) {
                    LocalTime startTime = LocalTime.parse(startTimeStr);
                    LocalTime endTime = LocalTime.parse(endTimeStr);
                    
                    return !currentTime.isBefore(startTime) && !currentTime.isAfter(endTime);
                }
            }
            
            return true;
            
        } catch (Exception e) {
            log.error("Error checking time restrictions", e);
            return true; // Allow if restrictions are invalid
        }
    }
    
    /**
     * Calculate distance between two points (Haversine formula)
     */
    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS * c; // Distance in meters
    }
}
```

### 3. Enhanced Zone Management Controller

```java
@RestController
@RequestMapping("/api/zones")
@PreAuthorize("hasRole('ADMIN')")
public class EnhancedZoneController {
    
    @Autowired
    private ZoneRepository zoneRepository;
    
    @Autowired
    private EnhancedGeofencingService geofencingService;
    
    /**
     * Create zone with polygon support
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Zone>> createZone(@Valid @RequestBody ZoneRequest request) {
        
        Zone zone = Zone.builder()
            .name(request.getName())
            .zoneType(request.getZoneType())
            .zoneCategory(request.getZoneCategory())
            .latitude(request.getCenterLatitude())
            .longitude(request.getCenterLongitude())
            .radiusMeters(request.getRadiusMeters())
            .polygonCoordinates(request.getPolygonCoordinates())
            .maxVendors(request.getMaxVendors())
            .timeRestrictions(request.getTimeRestrictions())
            .isActive(true)
            .build();
        
        zone = zoneRepository.save(zone);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(zone));
    }
    
    /**
     * Update zone with polygon coordinates
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Zone>> updateZone(
            @PathVariable Long id,
            @Valid @RequestBody ZoneRequest request) {
        
        Zone zone = zoneRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Zone not found"));
        
        zone.setName(request.getName());
        zone.setZoneType(request.getZoneType());
        zone.setZoneCategory(request.getZoneCategory());
        zone.setLatitude(request.getCenterLatitude());
        zone.setLongitude(request.getCenterLongitude());
        zone.setRadiusMeters(request.getRadiusMeters());
        zone.setPolygonCoordinates(request.getPolygonCoordinates());
        zone.setMaxVendors(request.getMaxVendors());
        zone.setTimeRestrictions(request.getTimeRestrictions());
        zone.setUpdatedAt(LocalDateTime.now());
        
        zone = zoneRepository.save(zone);
        
        return ResponseEntity.ok(ApiResponse.success(zone));
    }
    
    /**
     * Validate vendor location with enhanced geofencing
     */
    @PostMapping("/validate-location")
    public ResponseEntity<ApiResponse<LocationValidationResult>> validateLocation(
            @RequestBody @RequestBody LocationValidationRequest request) {
        
        LocationValidationResult result = geofencingService.validateVendorLocation(
            request.getVendorId(),
            request.getLatitude(),
            request.getLongitude()
        );
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * Get zone vendors count
     */
    @GetMapping("/{id}/vendor-count")
    public ResponseEntity<ApiResponse<Integer>> getVendorCount(@PathVariable Long id) {
        
        int count = vendorLocationRepository.countByZoneId(id);
        
        return ResponseEntity.ok(ApiResponse.success(count));
    }
    
    /**
     * Check if zone is at capacity
     */
    @GetMapping("/{id}/capacity")
    public ResponseEntity<ApiResponse<ZoneCapacity>> getZoneCapacity(@PathVariable Long id) {
        
        Zone zone = zoneRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Zone not found"));
        
        int currentVendors = vendorLocationRepository.countByZoneId(id);
        int maxVendors = zone.getMaxVendors() != null ? zone.getMaxVendors() : 10;
        
        ZoneCapacity capacity = ZoneCapacity.builder()
            .zoneId(id)
            .zoneName(zone.getName())
            .currentVendors(currentVendors)
            .maxVendors(maxVendors)
            .availableSlots(maxVendors - currentVendors)
            .utilizationRate((double) currentVendors / maxVendors)
            .isFull(currentVendors >= maxVendors)
            .build();
        
        return ResponseEntity.ok(ApiResponse.success(capacity));
    }
}
```

### 4. Database Migration Script

```sql
-- Enhanced zones table migration
ALTER TABLE zones 
ADD COLUMN polygon_coordinates JSON COMMENT 'Polygon coordinates for complex zone boundaries',
ADD COLUMN zone_category ENUM('PERMANENT', 'TEMPORARY', 'EVENT_BASED', 'PREMIUM') DEFAULT 'PERMANENT',
ADD COLUMN max_vendors INT DEFAULT 10 COMMENT 'Maximum vendors allowed in zone',
ADD COLUMN time_restrictions JSON COMMENT 'Time-based restrictions in JSON format';

-- Create zone_pricing table
CREATE TABLE zone_pricing (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    vendor_category ENUM('VEGETABLE', 'FRUIT', 'FOOD', 'TEA', 'PAN_SHOP', 'OTHER') NOT NULL,
    monthly_rate DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    INDEX idx_zone_pricing_zone_category (zone_id, vendor_category),
    INDEX idx_zone_pricing_effective_date (effective_date)
);

-- Insert sample data for zone pricing
INSERT INTO zone_pricing (zone_id, vendor_category, monthly_rate, effective_date) 
SELECT 
    id,
    'VEGETABLE',
    CASE 
        WHEN zone_type = 'ALLOWED' THEN 500.00
        WHEN zone_type = 'TIME_RESTRICTED' THEN 300.00
        ELSE 400.00
    END,
    CURDATE(),
    CURDATE()
FROM zones;

-- Update existing zones with default values
UPDATE zones 
SET 
    max_vendors = CASE 
        WHEN radius_meters <= 50 THEN 5
        WHEN radius_meters <= 100 THEN 10
        WHEN radius_meters <= 200 THEN 20
        ELSE 30
    END,
    zone_category = 'PERMANENT'
WHERE max_vendors IS NULL;
```

### 5. Frontend Zone Management (React)

```javascript
// ZoneManagement.jsx
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, message, Row, Col, InputNumber, TimePicker } from 'antd';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import { message } from 'antd';

const { Option } = Select;
const { RangePicker } = TimePicker;

const ZoneManagement = () => {
    const [zones, setZones] = useState([]);
    const [form] = Form.useForm();
    const [polygonPoints, setPolygonPoints] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        loadZones();
    }, []);

    const loadZones = async () => {
        try {
            const response = await fetch('/api/zones', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await response.json();
            setZones(data.data);
        } catch (error) {
            message.error('Failed to load zones');
        }
    };

    const handleMapClick = (e) => {
        if (isDrawing) {
            const newPoint = [e.latlng.lat, e.latlng.lng];
            setPolygonPoints([...polygonPoints, newPoint]);
        }
    };

    const handleCreateZone = async (values) => {
        try {
            const zoneData = {
                ...values,
                polygonCoordinates: polygonPoints.length >= 3 ? 
                    JSON.stringify(polygonPoints.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))) : 
                    null
            };

            const response = await fetch('/api/zones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(zoneData)
            });

            if (response.ok) {
                message.success('Zone created successfully');
                form.resetFields();
                setPolygonPoints([]);
                setIsDrawing(false);
                loadZones();
            } else {
                message.error('Failed to create zone');
            }
        } catch (error) {
            message.error('Error creating zone');
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Row gutter={[24, 24]}>
                <Col span={16}>
                    <Card title="Zone Map" extra={
                        <Button 
                            type={isDrawing ? "primary" : "default"}
                            onClick={() => setIsDrawing(!isDrawing)}
                        >
                            {isDrawing ? 'Stop Drawing' : 'Draw Zone'}
                        </Button>
                    }>
                        <MapContainer 
                            center={[17.6599, 75.9064]} 
                            zoom={13} 
                            style={{ height: '500px' }}
                            onclick={handleMapClick}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            
                            {/* Existing zones */}
                            {zones.map(zone => {
                                if (zone.polygonCoordinates) {
                                    const coordinates = JSON.parse(zone.polygonCoordinates);
                                    return (
                                        <Polygon
                                            key={zone.id}
                                            positions={coordinates.map(c => [c.latitude, c.longitude])}
                                            color={zone.zoneType === 'ALLOWED' ? 'green' : 'red'}
                                            fillOpacity={0.3}
                                        />
                                    );
                                }
                                return null;
                            })}
                            
                            {/* Current drawing */}
                            {polygonPoints.length >= 3 && (
                                <Polygon
                                    positions={polygonPoints}
                                    color="blue"
                                    fillOpacity={0.3}
                                />
                            )}
                            
                            {/* Polygon points */}
                            {polygonPoints.map((point, index) => (
                                <Marker key={index} position={point} />
                            ))}
                        </MapContainer>
                    </Card>
                </Col>
                
                <Col span={8}>
                    <Card title="Zone Details">
                        <Form form={form} onFinish={handleCreateZone} layout="vertical">
                            <Form.Item name="name" label="Zone Name" rules={[{ required: true }]}>
                                <Input placeholder="Enter zone name" />
                            </Form.Item>
                            
                            <Form.Item name="zoneType" label="Zone Type" rules={[{ required: true }]}>
                                <Select placeholder="Select zone type">
                                    <Option value="ALLOWED">Allowed</Option>
                                    <Option value="RESTRICTED">Restricted</Option>
                                    <Option value="TIME_RESTRICTED">Time Restricted</Option>
                                </Select>
                            </Form.Item>
                            
                            <Form.Item name="zoneCategory" label="Zone Category">
                                <Select placeholder="Select category">
                                    <Option value="PERMANENT">Permanent</Option>
                                    <Option value="TEMPORARY">Temporary</Option>
                                    <Option value="EVENT_BASED">Event Based</Option>
                                </Select>
                            </Form.Item>
                            
                            <Form.Item name="maxVendors" label="Max Vendors">
                                <InputNumber min={1} max={100} placeholder="Maximum vendors" />
                            </Form.Item>
                            
                            <Form.Item name="centerLatitude" label="Center Latitude" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} placeholder="17.6599" />
                            </Form.Item>
                            
                            <Form.Item name="centerLongitude" label="Center Longitude" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} placeholder="75.9064" />
                            </Form.Item>
                            
                            <Form.Item name="radiusMeters" label="Radius (meters)">
                                <InputNumber min={10} max={1000} placeholder="100" />
                            </Form.Item>
                            
                            <Form.Item>
                                <Button type="primary" htmlType="submit" block>
                                    Create Zone
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ZoneManagement;
```

This enhanced geofencing implementation provides **practical polygon-based zone management** that's achievable and delivers real value to SMC without over-engineering.
