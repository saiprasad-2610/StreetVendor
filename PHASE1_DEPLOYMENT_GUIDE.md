# Phase 1 Deployment Guide - SMC Vendor Management System

## Overview
This guide provides step-by-step instructions for deploying the Phase 1 enhanced SMC Vendor Management System with all practical features implemented.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Web Deployment](#frontend-web-deployment)
6. [Mobile App Deployment](#mobile-app-deployment)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Testing & Verification](#testing--verification)
9. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

### System Requirements
- **Server**: Linux (Ubuntu 20.04+ recommended) or Windows Server 2019+
- **CPU**: Minimum 4 cores, recommended 8+ cores
- **RAM**: Minimum 8GB, recommended 16GB+
- **Storage**: Minimum 100GB SSD, recommended 500GB+
- **Network**: Stable internet connection with SSL certificate

### Software Dependencies
- **Java**: OpenJDK 17+
- **Node.js**: v18+ (for frontend)
- **MySQL**: 8.0+
- **Redis**: 6.0+
- **Nginx**: 1.18+ (for reverse proxy)
- **SSL Certificate**: For HTTPS

### Development Tools
- **Git**: For version control
- **Maven**: For Java build management
- **React Native CLI**: For mobile app building

## Environment Setup

### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y openjdk-17-jdk mysql-server redis-server nginx git curl wget

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
java -version
node --version
npm --version
mysql --version
redis-server --version
```

### 2. Database Setup
```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
mysql -u root -p
```

```sql
CREATE DATABASE smc_vendor_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smc_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON smc_vendor_management.* TO 'smc_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Redis Configuration
```bash
# Configure Redis
sudo nano /etc/redis/redis.conf

# Update these settings:
# bind 127.0.0.1
# requirepass YourRedisPassword123
# maxmemory 512mb
# maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## Backend Deployment

### 1. Application Setup
```bash
# Create application directory
sudo mkdir -p /opt/smc-vendor-management
sudo chown $USER:$USER /opt/smc-vendor-management
cd /opt/smc-vendor-management

# Clone or copy the application
# If using Git:
git clone <repository-url> .

# Build the application
cd backend
./mvnw clean package -DskipTests

# Create application directory
sudo mkdir -p /opt/smc-vendor-management/backend
sudo cp target/smc-vendor-management-*.jar /opt/smc-vendor-management/backend/app.jar
```

### 2. Configuration Setup
```bash
# Create application.properties
sudo nano /opt/smc-vendor-management/backend/application.properties
```

```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/smc_vendor_management
spring.datasource.username=smc_user
spring.datasource.password=YourSecurePassword123!
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA Configuration
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# Redis Configuration
spring.redis.host=localhost
spring.redis.port=6379
spring.redis.password=YourRedisPassword123

# JWT Configuration
app.jwt.secret=SSVMS2024SolapurMunicipalCorporationSecretKeyForJWTTokenGenerationMustBeLongEnough256Bits!!
app.jwt.expiration-ms=86400000

# File Upload Configuration
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB

# Server Configuration
server.port=8080
server.servlet.context-path=/api

# CORS Configuration
cors.allowed-origins=http://localhost:3000,https://your-domain.com
```

### 3. System Service Setup
```bash
# Create systemd service
sudo nano /etc/systemd/system/smc-vendor-management.service
```

```ini
[Unit]
Description=SMC Vendor Management System
After=network.target mysql.service redis.service

[Service]
Type=simple
User=smc
Group=smc
WorkingDirectory=/opt/smc-vendor-management/backend
ExecStart=/usr/bin/java -jar app.jar
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Create service user
sudo useradd -r -s /bin/false smc

# Set permissions
sudo chown -R smc:smc /opt/smc-vendor-management/backend

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable smc-vendor-management
sudo systemctl start smc-vendor-management

# Check status
sudo systemctl status smc-vendor-management
```

## Frontend Web Deployment

### 1. Build Application
```bash
cd /opt/smc-vendor-management/frontend

# Install dependencies
npm install

# Configure environment variables
nano .env.production
```

```env
REACT_APP_API_BASE_URL=https://your-domain.com/api
REACT_APP_MAP_API_KEY=your-map-api-key
REACT_APP_VERSION=1.0.0
```

```bash
# Build for production
npm run build

# Copy to web directory
sudo mkdir -p /var/www/smc-vendor-management
sudo cp -r build/* /var/www/smc-vendor-management/
sudo chown -R www-data:www-data /var/www/smc-vendor-management
```

### 2. Nginx Configuration
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/smc-vendor-management
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Frontend
    location / {
        root /var/www/smc-vendor-management;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File Uploads
    location /api/uploads {
        alias /var/www/smc-vendor-management/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/smc-vendor-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Create uploads directory
sudo mkdir -p /var/www/smc-vendor-management/uploads
sudo chown -R www-data:www-data /var/www/smc-vendor-management/uploads
```

## Mobile App Deployment

### 1. Build Android App
```bash
cd /opt/smc-vendor-management/mobile

# Install dependencies
npm install

# Configure Android
cd android
./gradlew clean
./gradlew assembleRelease

# APK will be in: android/app/build/outputs/apk/release/app-release.apk
```

### 2. Distribution Options

#### Option A: Direct APK Distribution
```bash
# Create distribution directory
mkdir -p /var/www/smc-vendor-management/mobile
cp android/app/build/outputs/apk/release/app-release.apk /var/www/smc-vendor-management/mobile/
```

#### Option B: Google Play Store
1. Create Google Play Developer account
2. Upload signed APK/AAB
3. Complete store listing
4. Submit for review

#### Option C: Enterprise Distribution
```bash
# Create enterprise distribution package
# Use tools like AppCenter, Firebase App Distribution, or internal MDM
```

### 3. Mobile App Configuration
```javascript
// Update API base URL in mobile/src/services/APIService.js
const BASE_URL = 'https://your-domain.com/api';
```

## Post-Deployment Configuration

### 1. Database Migration
```bash
# Run Flyway migrations (if using)
cd /opt/smc-vendor-management/backend
java -jar app.jar --spring.flyway.migrate

# Or manually import the migration SQL
mysql -u smc_user -p smc_vendor_management < backend/src/main/resources/db/migration/V1__enhanced_database_schema.sql
```

### 2. Initial Data Setup
```sql
-- Create admin user
INSERT INTO users (username, password, email, role, created_at) 
VALUES ('admin', '$2a$12$encrypted_password_hash', 'admin@solapur.gov.in', 'ADMIN', NOW());

-- Create initial zones
INSERT INTO zones (name, zone_type, latitude, longitude, radius_meters, is_active, created_at) VALUES
('Main Market Area', 'ALLOWED', 17.6599, 75.9064, 500, true, NOW()),
('Railway Station', 'TIME_RESTRICTED', 17.6587, 75.9041, 200, true, NOW()),
('Bus Stand', 'ALLOWED', 17.6695, 75.9077, 300, true, NOW());
```

### 3. SSL Certificate Setup
```bash
# Install Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 4. Monitoring Setup
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Set up log rotation
sudo nano /etc/logrotate.d/smc-vendor-management
```

```
/var/log/smc-vendor-management/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 smc smc
    postrotate
        systemctl reload smc-vendor-management
    endscript
}
```

## Testing & Verification

### 1. Backend Health Check
```bash
# Test API endpoints
curl -X GET https://your-domain.com/api/health
curl -X GET https://your-domain.com/api/zones
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin_password"}'
```

### 2. Frontend Verification
- Open browser: https://your-domain.com
- Test login functionality
- Verify zone management
- Test analytics dashboard
- Check citizen reporting

### 3. Mobile App Testing
- Install APK on test device
- Test QR scanning
- Test offline functionality
- Verify sync capabilities
- Test violation reporting

### 4. Integration Tests
```bash
# Run automated tests
cd backend && ./mvnw test
cd frontend && npm test

# Manual checklist:
- [ ] User authentication works
- [ ] Zone CRUD operations
- [ ] QR code scanning
- [ ] Violation detection
- [ ] Citizen reporting
- [ ] Analytics data
- [ ] Alert system
- [ ] Offline sync
```

## Monitoring & Maintenance

### 1. Application Monitoring
```bash
# Check service status
sudo systemctl status smc-vendor-management

# View logs
sudo journalctl -u smc-vendor-management -f

# Check database
mysql -u smc_user -p -e "SHOW PROCESSLIST;"

# Check Redis
redis-cli ping
redis-cli info memory
```

### 2. Performance Monitoring
```bash
# Install monitoring tools
sudo apt install -y prometheus grafana

# Configure basic metrics collection
# Set up Grafana dashboards for:
# - Application response time
# - Database connections
# - Memory usage
# - API request rates
```

### 3. Backup Strategy
```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/opt/backups/smc-vendor-management"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u smc_user -p smc_vendor_management > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /opt/smc-vendor-management/backend

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

```bash
# Schedule daily backups
sudo crontab -e
# Add: 0 2 * * * /opt/scripts/backup_smc.sh
```

### 4. Security Maintenance
```bash
# Regular security updates
sudo apt update && sudo apt upgrade -y

# Monitor logs for suspicious activity
sudo tail -f /var/log/nginx/access.log | grep -v "GET /health"

# Check for failed login attempts
sudo journalctl -u smc-vendor-management | grep "Failed login"

# SSL certificate renewal (auto-renewal should be configured)
sudo certbot certificates
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
sudo journalctl -u smc-vendor-management -n 50

# Common fixes:
# - Check database connection
# - Verify Redis is running
# - Check port conflicts
# - Verify file permissions
```

#### 2. Database Connection Issues
```bash
# Test connection
mysql -u smc_user -p -h localhost smc_vendor_management

# Check MySQL status
sudo systemctl status mysql

# Reset MySQL password if needed
sudo mysql_secure_installation
```

#### 3. Frontend Not Loading
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check file permissions
sudo ls -la /var/www/smc-vendor-management/
```

#### 4. Mobile App Connection Issues
```bash
# Check API accessibility
curl -I https://your-domain.com/api/health

# Verify CORS headers
curl -H "Origin: https://your-domain.com" -H "Access-Control-Request-Method: GET" -X OPTIONS https://your-domain.com/api/zones
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_violations_created_at ON violations(created_at);
CREATE INDEX idx_citizen_reports_phone ON citizen_reports(reporter_phone);

-- Analyze tables
ANALYZE TABLE vendors, violations, citizen_reports, zones;
```

#### 2. Application Optimization
```bash
# Increase JVM heap size
# Update systemd service file:
ExecStart=/usr/bin/java -Xmx2g -Xms1g -jar app.jar

# Enable connection pooling in application.properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
```

## Rollback Plan

### 1. Database Rollback
```bash
# Restore from backup
mysql -u smc_user -p smc_vendor_management < backup_file.sql
```

### 2. Application Rollback
```bash
# Stop current version
sudo systemctl stop smc-vendor-management

# Restore previous version
sudo cp /opt/backups/app-previous.jar /opt/smc-vendor-management/backend/app.jar

# Start service
sudo systemctl start smc-vendor-management
```

### 3. Frontend Rollback
```bash
# Restore previous build
sudo rm -rf /var/www/smc-vendor-management/*
sudo cp -r /opt/backups/frontend-previous/* /var/www/smc-vendor-management/
sudo systemctl reload nginx
```

## Support Contact

For deployment issues:
- **Technical Support**: tech-support@solapur.gov.in
- **System Administrator**: admin@solapur.gov.in
- **Emergency Contact**: +91-XXXXXXXXXX

## Documentation Links

- [API Documentation](https://your-domain.com/api/docs)
- [User Manual](https://your-domain.com/docs/user-manual)
- [Admin Guide](https://your-domain.com/docs/admin-guide)
- [Mobile App Guide](https://your-domain.com/docs/mobile-guide)

---

**Note**: This deployment guide assumes a single-server setup. For production environments with high traffic, consider load balancing, database clustering, and CDN setup.
