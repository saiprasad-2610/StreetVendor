# Enhanced Database Schema - Future-Ready Smart City Platform

## 🗄️ New Tables & Enhanced Existing Tables

### 1. Advanced Geofencing System

```sql
-- Enhanced zones table with polygon support
ALTER TABLE zones ADD COLUMN polygon_coordinates JSON;
ALTER TABLE zones ADD COLUMN zone_category ENUM('PERMANENT', 'TEMPORARY', 'EVENT_BASED', 'DYNAMIC');
ALTER TABLE zones ADD COLUMN time_restrictions JSON;
ALTER TABLE zones ADD COLUMN max_vendors INT DEFAULT 10;
ALTER TABLE zones ADD COLUMN current_vendors INT DEFAULT 0;
ALTER TABLE zones ADD COLUMN congestion_threshold DECIMAL(5,2) DEFAULT 0.8;
ALTER TABLE zones ADD COLUMN smart_zone_config JSON;

-- New geofence_boundaries table for complex polygons
CREATE TABLE geofence_boundaries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    boundary_order INT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    INDEX idx_zone_boundary (zone_id, boundary_order)
);

-- Zone rules and restrictions
CREATE TABLE zone_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    rule_type ENUM('TIME_RESTRICTION', 'VENDOR_TYPE', 'CAPACITY', 'Pricing') NOT NULL,
    rule_value JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMP,
    effective_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    INDEX idx_zone_rules (zone_id, rule_type)
);
```

### 2. AI-Powered Intelligence System

```sql
-- AI predictions and recommendations
CREATE TABLE ai_predictions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    prediction_type ENUM('LOCATION_RECOMMENDATION', 'VIOLATION_RISK', 'DEMAND_FORECAST', 'CROWD_DENSITY') NOT NULL,
    vendor_id BIGINT,
    zone_id BIGINT,
    prediction_data JSON NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    prediction_date TIMESTAMP NOT NULL,
    actual_outcome JSON,
    is_accurate BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    INDEX idx_predictions_type (prediction_type, prediction_date),
    INDEX idx_predictions_vendor (vendor_id, prediction_date)
);

-- Vendor tracking for AI analysis
CREATE TABLE vendor_tracking_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy_meters DECIMAL(8,2),
    speed_kmh DECIMAL(6,2),
    tracking_source ENUM('MANUAL_SCAN', 'GPS_DEVICE', 'MOBILE_APP', 'OFFICER_REPORT') NOT NULL,
    zone_id BIGINT,
    is_within_zone BOOLEAN,
    violation_detected BOOLEAN DEFAULT FALSE,
    tracking_metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    INDEX idx_tracking_vendor_time (vendor_id, created_at),
    INDEX idx_tracking_zone_time (zone_id, created_at)
);

-- Demand patterns and analytics
CREATE TABLE demand_patterns (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    time_period ENUM('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    vendor_category ENUM('VEGETABLE', 'FRUIT', 'FOOD', 'TEA', 'PAN_SHOP', 'OTHER'),
    demand_score DECIMAL(5,2) NOT NULL,
    foot_traffic_count INT DEFAULT 0,
    average_revenue DECIMAL(10,2),
    weather_conditions JSON,
    special_events JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    INDEX idx_demand_zone_period (zone_id, time_period, period_start)
);
```

### 3. Blockchain-Based License System

```sql
-- Blockchain license records
CREATE TABLE blockchain_licenses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT NOT NULL UNIQUE,
    license_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash
    blockchain_tx_id VARCHAR(128) UNIQUE,
    smart_contract_address VARCHAR(42),
    license_data JSON NOT NULL, -- Immutable license data
    previous_license_hash VARCHAR(64), -- For chain of custody
    verification_count INT DEFAULT 0,
    last_verified_at TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    INDEX idx_license_hash (license_hash),
    INDEX idx_blockchain_tx (blockchain_tx_id)
);

-- License verification logs
CREATE TABLE license_verifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    license_id BIGINT NOT NULL,
    vendor_id BIGINT NOT NULL,
    verification_type ENUM('QR_SCAN', 'FACE_MATCH', 'OFFICER_CHECK', 'SYSTEM_VALIDATION') NOT NULL,
    verification_result ENUM('SUCCESS', 'FAILED', 'SUSPICIOUS') NOT NULL,
    verification_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    verified_by BIGINT, -- User ID if verified by officer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES blockchain_licenses(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_verification_license_time (license_id, created_at),
    INDEX idx_verification_vendor_time (vendor_id, created_at)
);
```

### 4. Face & Identity Verification System

```sql
-- Enhanced vendor table with biometric data
ALTER TABLE vendors ADD COLUMN face_encoding JSON; -- Face recognition vectors
ALTER TABLE vendors ADD COLUMN face_match_threshold DECIMAL(3,2) DEFAULT 0.8;
ALTER TABLE vendors ADD COLUMN identity_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN identity_verified_at TIMESTAMP;
ALTER TABLE vendors ADD COLUMN identity_verified_by BIGINT;

-- Face verification attempts
CREATE TABLE face_verifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT NOT NULL,
    captured_face_image_url TEXT NOT NULL,
    face_encoding JSON,
    match_score DECIMAL(5,4),
    verification_result ENUM('MATCH', 'NO_MATCH', 'LOW_QUALITY', 'MULTIPLE_FACES') NOT NULL,
    verification_metadata JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    INDEX idx_face_verification_vendor (vendor_id, created_at)
);
```

### 5. Smart Enforcement System

```sql
-- Enhanced violations table
ALTER TABLE violations ADD COLUMN ai_detected BOOLEAN DEFAULT FALSE;
ALTER TABLE violations ADD COLUMN detection_confidence DECIMAL(3,2);
ALTER TABLE violations ADD COLUMN violation_type ENUM('LOCATION', 'TIME', 'OVERCROWDING', 'FAKE_QR', 'UNAUTHORIZED_VENDOR') NOT NULL;
ALTER TABLE violations ADD COLUMN automated_action_taken BOOLEAN DEFAULT FALSE;
ALTER TABLE violations ADD COLUMN priority_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM';

-- Smart alerts system
CREATE TABLE smart_alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    alert_type ENUM('VENDOR_OUT_OF_ZONE', 'OVERCROWDING', 'SUSPICIOUS_ACTIVITY', 'SYSTEM_ANOMALY', 'PAYMENT_DEFAULT') NOT NULL,
    severity ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    vendor_id BIGINT,
    zone_id BIGINT,
    alert_title VARCHAR(200) NOT NULL,
    alert_message TEXT NOT NULL,
    alert_data JSON,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by BIGINT,
    resolution_notes TEXT,
    auto_escalation BOOLEAN DEFAULT FALSE,
    escalation_level INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    INDEX idx_alerts_type_time (alert_type, created_at),
    INDEX idx_alerts_severity_time (severity, created_at),
    INDEX idx_alerts_unresolved (is_resolved, created_at)
);
```

### 6. Smart Revenue System

```sql
-- Dynamic pricing and payments
CREATE TABLE zone_pricing (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    vendor_category ENUM('VEGETABLE', 'FRUIT', 'FOOD', 'TEA', 'PAN_SHOP', 'OTHER'),
    base_price DECIMAL(10,2) NOT NULL,
    demand_multiplier DECIMAL(5,2) DEFAULT 1.0,
    time_multiplier DECIMAL(5,2) DEFAULT 1.0,
    event_multiplier DECIMAL(5,2) DEFAULT 1.0,
    final_price DECIMAL(10,2) GENERATED ALWAYS AS (
        base_price * demand_multiplier * time_multiplier * event_multiplier
    ) STORED,
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    INDEX idx_pricing_zone_time (zone_id, effective_from, effective_to)
);

-- Enhanced payments table
CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    vendor_id BIGINT NOT NULL,
    payment_type ENUM('MONTHLY_RENT', 'CHALLAN_FINE', 'DYNAMIC_PRICING', 'PENALTY') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('RAZORPAY', 'UPI', 'CASH', 'BANK_TRANSFER', 'WALLET') NOT NULL,
    payment_status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    gateway_transaction_id VARCHAR(128),
    gateway_response JSON,
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    late_fee DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    zone_id BIGINT,
    billing_period_start TIMESTAMP,
    billing_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    INDEX idx_payments_vendor_status (vendor_id, payment_status),
    INDEX idx_payments_due_date (due_date),
    INDEX idx_payments_type_date (payment_type, created_at)
);
```

### 7. Citizen Engagement System

```sql
-- Citizen reports and ratings
ALTER TABLE ratings ADD COLUMN report_id VARCHAR(50) UNIQUE;
ALTER TABLE ratings ADD COLUMN citizen_feedback TEXT;
ALTER TABLE ratings ADD COLUMN issue_type ENUM('HYGIENE', 'PRICING', 'BEHAVIOR', 'LOCATION', 'QUALITY', 'OTHER');
ALTER TABLE ratings ADD COLUMN media_urls JSON;
ALTER TABLE ratings ADD COLUMN helpful_count INT DEFAULT 0;
ALTER TABLE ratings ADD COLUMN verified_purchase BOOLEAN DEFAULT FALSE;

-- Citizen rewards and gamification
CREATE TABLE citizen_rewards (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    reward_type ENUM('VALID_REPORT', 'HELPFUL_RATING', 'DAILY_CHECKIN', 'REFERRAL') NOT NULL,
    points_earned INT NOT NULL,
    reference_id BIGINT, -- Report ID, Rating ID, etc.
    reward_metadata JSON,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_rewards_user_date (user_id, created_at),
    INDEX idx_rewards_type_date (reward_type, created_at)
);

-- Leaderboard
CREATE TABLE citizen_leaderboard (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    total_points INT DEFAULT 0,
    current_rank INT DEFAULT 0,
    reports_submitted INT DEFAULT 0,
    ratings_given INT DEFAULT 0,
    accuracy_score DECIMAL(5,2) DEFAULT 0,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_leaderboard_points (total_points DESC),
    INDEX idx_leaderboard_rank (current_rank)
);
```

### 8. Audit & Security System

```sql
-- Comprehensive audit logs
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SCAN', 'VERIFY', 'PAYMENT') NOT NULL,
    entity_type ENUM('VENDOR', 'ZONE', 'VIOLATION', 'CHALLAN', 'PAYMENT', 'USER', 'ALERT') NOT NULL,
    entity_id BIGINT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(128),
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    risk_score INT DEFAULT 0,
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_audit_user_time (user_id, created_at),
    INDEX idx_audit_action_time (action_type, created_at),
    INDEX idx_audit_entity (entity_type, entity_id, created_at),
    INDEX idx_audit_suspicious (is_suspicious, created_at)
);

-- Security events
CREATE TABLE security_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_type ENUM('FAILED_LOGIN', 'BRUTE_FORCE', 'SUSPICIOUS_SCAN', 'DATA_TAMPERING', 'UNAUTHORIZED_ACCESS') NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    user_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    event_data JSON,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_security_type_time (event_type, created_at),
    INDEX idx_security_severity_time (severity, created_at),
    INDEX idx_security_blocked (is_blocked, created_at)
);
```

### 9. Analytics & Reporting System

```sql
-- Pre-computed analytics for dashboard
CREATE TABLE analytics_daily (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    report_date DATE NOT NULL UNIQUE,
    total_vendors INT DEFAULT 0,
    active_vendors INT DEFAULT 0,
    total_violations INT DEFAULT 0,
    total_challans INT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    avg_compliance_rate DECIMAL(5,2) DEFAULT 0,
    zone_utilization JSON,
    vendor_category_distribution JSON,
    violation_hotspots JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analytics_date (report_date)
);

-- Real-time metrics cache
CREATE TABLE realtime_metrics (
    metric_key VARCHAR(100) PRIMARY KEY,
    metric_value JSON NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_metrics_expiry (expires_at)
);
```

---

## 🔧 Performance Optimizations

### Indexes Strategy
- Composite indexes for frequent query patterns
- Spatial indexes for geofencing queries
- Time-based indexes for analytics
- JSON indexes for structured data

### Partitioning Strategy
```sql
-- Partition large tables by date
ALTER TABLE vendor_tracking_logs PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Partition audit logs monthly
ALTER TABLE audit_logs PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p202401 VALUES LESS THAN (TO_DAYS('2024-02-01')),
    PARTITION p202402 VALUES LESS THAN (TO_DAYS('2024-03-01')),
    -- ... more partitions
);
```

### Data Retention Policy
- Tracking logs: 2 years
- Audit logs: 7 years (compliance)
- Face verification images: 90 days
- Analytics data: 10 years

---

## 🚀 Migration Strategy

### Phase 1: Core Schema Enhancement
1. Add new columns to existing tables
2. Create new core tables (geofencing, AI, blockchain)
3. Migrate existing data with backward compatibility

### Phase 2: Advanced Features
1. Implement analytics tables
2. Add citizen engagement features
3. Create audit and security tables

### Phase 3: Performance Optimization
1. Add indexes and partitions
2. Implement data retention policies
3. Optimize queries for real-time performance

This enhanced schema supports all the future-ready features while maintaining scalability and performance for a government-grade smart city platform.
