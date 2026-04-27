-- Enhanced Database Schema for Phase 1 Implementation
-- This migration adds new tables and enhances existing ones for practical Phase 1 features

-- Enhanced zones table with polygon support
ALTER TABLE zones 
ADD COLUMN zone_category ENUM('PERMANENT', 'TEMPORARY', 'EVENT_BASED', 'PREMIUM') DEFAULT 'PERMANENT',
ADD COLUMN max_vendors INT DEFAULT 10,
ADD COLUMN polygon_coordinates JSON,
ADD COLUMN time_restrictions JSON,
ADD COLUMN manager_email VARCHAR(100),
ADD COLUMN manager_phone VARCHAR(20);

-- Add indexes for enhanced zones
CREATE INDEX idx_zones_category ON zones(zone_category);
CREATE INDEX idx_zones_manager ON zones(manager_email);

-- Enhanced violations table
ALTER TABLE violations
ADD COLUMN detection_method ENUM('MANUAL', 'RULE_BASED', 'CITIZEN_REPORT') DEFAULT 'MANUAL',
ADD COLUMN reported_by VARCHAR(100),
ADD COLUMN reporter_phone VARCHAR(20),
ADD COLUMN auto_detected BOOLEAN DEFAULT FALSE,
ADD COLUMN confidence_score DECIMAL(3,2),
ADD COLUMN distance_from_zone DECIMAL(10,2),
ADD COLUMN image_proof_url VARCHAR(500);

-- Add indexes for enhanced violations
CREATE INDEX idx_violations_detection_method ON violations(detection_method);
CREATE INDEX idx_violations_reporter ON violations(reported_by);
CREATE INDEX idx_violations_confidence ON violations(confidence_score);

-- Create citizen reports table
CREATE TABLE citizen_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT,
    reporter_name VARCHAR(100) NOT NULL,
    reporter_phone VARCHAR(20) NOT NULL,
    reporter_email VARCHAR(100),
    report_type ENUM('LOCATION_VIOLATION', 'TIME_VIOLATION', 'OVERCROWDING', 'UNAUTHORIZED_VENDOR', 'HYGIENE_ISSUE', 'PRICE_COMPLAINT', 'BEHAVIOR_ISSUE', 'OTHER') NOT NULL,
    description TEXT NOT NULL,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    location_address VARCHAR(500),
    image_proof_url VARCHAR(500),
    additional_images JSON,
    status ENUM('PENDING_REVIEW', 'UNDER_INVESTIGATION', 'CONFIRMED', 'DISMISSED', 'RESOLVED') DEFAULT 'PENDING_REVIEW',
    validation_score DECIMAL(3,2),
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_report_id BIGINT,
    officer_assigned_id BIGINT,
    resolution_notes TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (officer_assigned_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (duplicate_report_id) REFERENCES citizen_reports(id) ON DELETE SET NULL,
    
    INDEX idx_citizen_reports_phone_created (reporter_phone, created_at),
    INDEX idx_citizen_reports_ip_created (ip_address, created_at),
    INDEX idx_citizen_reports_vendor_created (vendor_id, created_at),
    INDEX idx_citizen_reports_status_created (status, created_at),
    INDEX idx_citizen_reports_location (location_latitude, location_longitude),
    INDEX idx_citizen_reports_type_created (report_type, created_at)
);

-- Create zone pricing table
CREATE TABLE zone_pricing (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    vendor_category ENUM('VEGETABLE', 'FRUIT', 'FOOD', 'TEA', 'PAN_SHOP', 'OTHER') NOT NULL,
    base_rate DECIMAL(10,2) NOT NULL,
    time_multiplier DECIMAL(3,2) DEFAULT 1.00,
    category_multiplier DECIMAL(3,2) DEFAULT 1.00,
    zone_multiplier DECIMAL(3,2) DEFAULT 1.00,
    event_multiplier DECIMAL(3,2) DEFAULT 1.00,
    seasonal_multiplier DECIMAL(3,2) DEFAULT 1.00,
    min_rate DECIMAL(10,2),
    max_rate DECIMAL(10,2),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    INDEX idx_zone_pricing_zone_category_date (zone_id, vendor_category, effective_date),
    INDEX idx_zone_pricing_active (is_active, effective_date)
);

-- Create local events table for event-based pricing
CREATE TABLE local_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    event_type ENUM('FESTIVAL', 'EXHIBITION', 'SPORTS_EVENT', 'MARKET', 'OTHER') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    impact_multiplier DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    INDEX idx_local_events_zone_date (zone_id, start_date, end_date)
);

-- Create alerts table
CREATE TABLE alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    alert_type VARCHAR(30) NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    vendor_id BIGINT,
    zone_id BIGINT,
    officer_id BIGINT,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    reference_id VARCHAR(100),
    reference_type VARCHAR(30),
    status ENUM('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED') DEFAULT 'PENDING',
    assigned_to VARCHAR(100),
    priority_level INT NOT NULL,
    auto_escalated BOOLEAN DEFAULT FALSE,
    escalation_level INT DEFAULT 0,
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_alerts_status_created (status, created_at),
    INDEX idx_alerts_severity_created (severity, created_at),
    INDEX idx_alerts_priority_created (priority_level, created_at),
    INDEX idx_alerts_officer_created (officer_id, created_at),
    INDEX idx_alerts_vendor_created (vendor_id, created_at)
);

-- Create monthly bills table
CREATE TABLE monthly_bills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT NOT NULL,
    billing_month YEAR(4) MONTH(2) NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    discounts DECIMAL(10,2) DEFAULT 0.00,
    penalties DECIMAL(10,2) DEFAULT 0.00,
    final_amount DECIMAL(10,2) NOT NULL,
    billing_data JSON,
    status ENUM('PENDING', 'GENERATED', 'PAID', 'OVERDUE') DEFAULT 'PENDING',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    INDEX idx_monthly_bills_vendor_month (vendor_id, billing_month),
    INDEX idx_monthly_bills_status (status)
);

-- Enhanced users table with security fields
ALTER TABLE users 
ADD COLUMN failed_login_attempts INT DEFAULT 0,
ADD COLUMN last_failed_login TIMESTAMP NULL,
ADD COLUMN account_locked_until TIMESTAMP NULL,
ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_secret VARCHAR(32) NULL,
ADD COLUMN device_fingerprint VARCHAR(100) NULL,
ADD COLUMN last_login_ip VARCHAR(45) NULL,
ADD COLUMN last_login_at TIMESTAMP NULL;

-- Create security events table
CREATE TABLE security_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_type ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_FAILED_INVALID_USER', 'LOGIN_FAILED_WRONG_PASSWORD', 
                     'LOGIN_FAILED_DISABLED', 'LOGIN_FAILED_LOCKED', 'LOGIN_FAILED_SESSION_EXPIRED',
                     'BRUTE_FORCE_BLOCKED', 'RATE_LIMIT_EXCEEDED', 'UNAUTHORIZED_ACCESS', 
                     'DDOS_SUSPECTED', 'SUSPICIOUS_ACTIVITY', 'SECURITY_BREACH') NOT NULL,
    username VARCHAR(100),
    user_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    event_details TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_security_events_type_created (event_type, created_at),
    INDEX idx_security_events_username_created (username, created_at),
    INDEX idx_security_events_ip_created (ip_address, created_at)
);

-- Create audit logs table
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100),
    action_type ENUM('API_ACCESS', 'DATA_ACCESS', 'DATA_MODIFICATION', 'SECURITY_EVENT', 'USER_ACTION') NOT NULL,
    entity_type ENUM('USER', 'VENDOR', 'ZONE', 'VIOLATION', 'PAYMENT', 'REPORT', 'API') NOT NULL,
    entity_id VARCHAR(100),
    operation VARCHAR(50),
    result VARCHAR(20),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    risk_score DECIMAL(3,2),
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_logs_username_created (username, created_at),
    INDEX idx_audit_logs_entity_created (entity_type, entity_id, created_at),
    INDEX idx_audit_logs_suspicious_created (is_suspicious, created_at)
);

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_reset_tokens_token (token),
    INDEX idx_password_reset_tokens_user_id (user_id)
);

-- Insert default pricing data
INSERT INTO zone_pricing (zone_id, vendor_category, base_rate, effective_date)
SELECT 
    z.id,
    v.category,
    CASE v.category
        WHEN 'VEGETABLE' THEN 500.00
        WHEN 'FRUIT' THEN 600.00
        WHEN 'FOOD' THEN 800.00
        WHEN 'TEA' THEN 400.00
        WHEN 'PAN_SHOP' THEN 300.00
        ELSE 500.00
    END,
    CURDATE()
FROM zones z
CROSS JOIN (SELECT DISTINCT category FROM vendors) v
WHERE z.is_active = TRUE;

-- Create view for active zone pricing
CREATE VIEW active_zone_pricing AS
SELECT 
    zp.id,
    zp.zone_id,
    z.name as zone_name,
    zp.vendor_category,
    zp.base_rate,
    zp.time_multiplier,
    zp.category_multiplier,
    zp.zone_multiplier,
    zp.event_multiplier,
    zp.seasonal_multiplier,
    zp.min_rate,
    zp.max_rate,
    zp.effective_date,
    zp.expiry_date,
    zp.is_active
FROM zone_pricing zp
JOIN zones z ON zp.zone_id = z.id
WHERE zp.is_active = TRUE 
AND (zp.expiry_date IS NULL OR zp.expiry_date >= CURDATE())
AND zp.effective_date <= CURDATE();

-- Create view for vendor compliance summary
CREATE VIEW vendor_compliance_summary AS
SELECT 
    v.id as vendor_id,
    v.name as vendor_name,
    v.category,
    v.status,
    COUNT(viol.id) as total_violations,
    COUNT(CASE WHEN viol.status = 'RESOLVED' THEN 1 END) as resolved_violations,
    COUNT(CASE WHEN viol.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as violations_last_30_days,
    CASE 
        WHEN COUNT(viol.id) = 0 THEN 1.0
        WHEN COUNT(CASE WHEN viol.status = 'RESOLVED' THEN 1 END) = 0 THEN 0.0
        ELSE COUNT(CASE WHEN viol.status = 'RESOLVED' THEN 1 END) / COUNT(viol.id)
    END as compliance_score
FROM vendors v
LEFT JOIN violations viol ON v.id = viol.vendor_id
WHERE v.status = 'APPROVED'
GROUP BY v.id, v.name, v.category, v.status;
