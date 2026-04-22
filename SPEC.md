# Smart Street Vendor Management System (SSVMS)
## Solapur Municipal Corporation

---

## 1. Project Overview

**Project Name:** Smart Street Vendor Management System (SSVMS)
**Project Type:** Full-stack Web Application (Government-Grade)
**Core Functionality:** Digitally manage street vendors, assign legal vending locations using GPS validation, prevent illegal vending through QR code scanning, and enable public + officer enforcement with a complete violation and challan system.
**Target Users:**
- Admin (SMC Officers)
- Enforcement Officers
- Public Users
- Street Vendors (registered entities)

---

## 2. Technical Stack

### Backend
- **Language:** Java 17+
- **Framework:** Spring Boot 3.x (latest stable)
- **Security:** Spring Security + JWT Authentication
- **Database:** MySQL 8.x with JPA/Hibernate
- **Build Tool:** Maven
- **API Style:** RESTful APIs
- **Password Hashing:** BCrypt

### Frontend
- **Framework:** React.js 18.x
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **State Management:** Context API
- **QR Scanner:** html5-qrcode library

---

## 3. User Roles & Permissions

| Role | Code | Permissions |
|------|------|-------------|
| Admin | ROLE_ADMIN | Full access - vendor management, zone management, reports, dashboard |
| Enforcement Officer | ROLE_OFFICER | Scan QR, issue challans, report violations, view vendors |
| Public User | ROLE_PUBLIC | Report violations, rate vendors, view vendor details |

---

## 4. Core Modules

### 4.1 Vendor Management
- Register vendor (admin-side only)
- Fields: name, phone, Aadhaar (masked/encrypted), face image URL, category, status
- Assign GPS location (latitude, longitude)
- Generate unique Vendor ID
- Generate static QR code (stored as image URL)
- Status workflow: PENDING → APPROVED → REJECTED/SUSPENDED

### 4.2 Location Validation System
- QR code scanning with browser geolocation
- Haversine formula for distance calculation
- Validation threshold: 50 meters
- Returns: vendor details + validation status (VALID/INVALID)

### 4.3 Violation & Complaint System
- Public and officer can report violations
- Fields: vendor_id, image proof, GPS location, timestamp, reported_by
- Auto-validation based on vendor registered location
- Status: VALID_VIOLATION / INVALID_VIOLATION

### 4.4 Challan System
- Officers can issue challans to vendors
- Fields: vendor_id, fine_amount, reason, location, image proof, status
- Status: PAID / UNPAID

### 4.5 Admin Dashboard
- View all vendors with filters
- Approve/Reject/Suspend vendors
- View violations and challans
- Revenue tracking
- Zone management

### 4.6 Map & Zone Management
- Define zones as allowed/restricted
- Prevent vendor allocation in restricted zones
- Visual zone display

### 4.7 Rating System
- Public can rate vendors (1-5 stars)
- Categories: cleanliness, pricing, behavior
- Calculate average ratings

---

## 5. Database Schema

### Tables

```
users
├── id (PK, BIGINT, AUTO_INCREMENT)
├── username (VARCHAR 50, UNIQUE, NOT NULL)
├── password (VARCHAR 255, NOT NULL)
├── email (VARCHAR 100)
├── full_name (VARCHAR 100)
├── phone (VARCHAR 20)
├── role (ENUM: ADMIN, OFFICER, PUBLIC)
├── enabled (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

vendors
├── id (PK, BIGINT, AUTO_INCREMENT)
├── vendor_id (VARCHAR 20, UNIQUE, NOT NULL)
├── name (VARCHAR 100, NOT NULL)
├── phone (VARCHAR 20, NOT NULL)
├── aadhaar (VARCHAR 20, ENCRYPTED)
├── face_image_url (VARCHAR 255)
├── category (ENUM: VEGETABLE, FRUIT, FOOD, TEA, PAN_SHOP, OTHER)
├── status (ENUM: PENDING, APPROVED, REJECTED, SUSPENDED)
├── created_by (FK → users.id)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

vendor_locations
├── id (PK, BIGINT, AUTO_INCREMENT)
├── vendor_id (FK → vendors.id, UNIQUE)
├── latitude (DECIMAL 10, 8)
├── longitude (DECIMAL 11, 8)
├── address (VARCHAR 255)
├── zone_id (FK → zones.id)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

qr_codes
├── id (PK, BIGINT, AUTO_INCREMENT)
├── vendor_id (FK → vendors.id, UNIQUE)
├── qr_code_url (VARCHAR 255)
├── generated_at (TIMESTAMP)
└── is_active (BOOLEAN)

violations
├── id (PK, BIGINT, AUTO_INCREMENT)
├── vendor_id (FK → vendors.id)
├── reported_by (FK → users.id)
├── image_proof_url (VARCHAR 255)
├── gps_latitude (DECIMAL 10, 8)
├── gps_longitude (DECIMAL 11, 8)
├── description (TEXT)
├── validation_status (ENUM: VALID, INVALID, PENDING)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

challans
├── id (PK, BIGINT, AUTO_INCREMENT)
├── challan_number (VARCHAR 30, UNIQUE)
├── vendor_id (FK → vendors.id)
├── issued_by (FK → users.id)
├── fine_amount (DECIMAL 10, 2)
├── reason (TEXT)
├── location (VARCHAR 255)
├── image_proof_url (VARCHAR 255)
├── status (ENUM: PAID, UNPAID)
├── issued_at (TIMESTAMP)
├── due_date (DATE)
└── paid_at (TIMESTAMP)

zones
├── id (PK, BIGINT, AUTO_INCREMENT)
├── name (VARCHAR 100)
├── zone_type (ENUM: ALLOWED, RESTRICTED)
├── latitude (DECIMAL 10, 8)
├── longitude (DECIMAL 11, 8)
├── radius_meters (INT)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

ratings
├── id (PK, BIGINT, AUTO_INCREMENT)
├── vendor_id (FK → vendors.id)
├── user_id (FK → users.id)
├── cleanliness (INT 1-5)
├── pricing (INT 1-5)
├── behavior (INT 1-5)
├── average (DECIMAL 3, 2)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## 6. API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/auth/login | User login, returns JWT | Public |
| POST | /api/auth/register | Register new user | Public |
| POST | /api/auth/refresh | Refresh JWT token | Authenticated |
| GET | /api/auth/me | Get current user | Authenticated |

### Vendors
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/vendors | Create vendor | ADMIN |
| GET | /api/vendors | List all vendors | ADMIN, OFFICER |
| GET | /api/vendors/{id} | Get vendor details | ADMIN, OFFICER |
| PUT | /api/vendors/{id} | Update vendor | ADMIN |
| PUT | /api/vendors/{id}/approve | Approve vendor | ADMIN |
| PUT | /api/vendors/{id}/reject | Reject vendor | ADMIN |
| PUT | /api/vendors/{id}/suspend | Suspend vendor | ADMIN |
| DELETE | /api/vendors/{id} | Delete vendor | ADMIN |

### QR Scan Validation
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/scan/validate | Validate vendor location | ALL |

### Violations
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/violations | Report violation | ALL |
| GET | /api/violations | List violations | ADMIN, OFFICER |
| GET | /api/violations/{id} | Get violation details | ADMIN, OFFICER |

### Challans
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/challans | Issue challan | OFFICER |
| GET | /api/challans | List challans | ADMIN, OFFICER |
| GET | /api/challans/{id} | Get challan details | ADMIN, OFFICER |
| PUT | /api/challans/{id}/pay | Mark challan paid | ADMIN |

### Zones
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/zones | Create zone | ADMIN |
| GET | /api/zones | List zones | ALL |
| PUT | /api/zones/{id} | Update zone | ADMIN |
| DELETE | /api/zones/{id} | Delete zone | ADMIN |

### Ratings
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/ratings | Rate vendor | PUBLIC |
| GET | /api/ratings/vendor/{vendorId} | Get vendor ratings | ALL |

### Dashboard
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/dashboard/stats | Get dashboard statistics | ADMIN |

---

## 7. Security Requirements

- JWT-based authentication
- BCrypt password hashing (strength 12)
- JWT filter for request validation
- Role-based API protection
- Input validation on all endpoints
- Global exception handling
- CORS configuration
- Token expiration: 24 hours
- Refresh token expiration: 7 days

---

## 8. Utility Functions

### Haversine Formula
Calculate distance between two GPS coordinates:
```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1-a))
d = R × c (R = 6371 km)
```

---

## 9. Frontend Pages

1. **Login Page** - JWT authentication
2. **Admin Dashboard** - Statistics and overview
3. **Vendor List** - CRUD operations
4. **Add/Edit Vendor** - Form with image upload
5. **Map View** - Zone visualization and vendor locations
6. **QR Scanner** - Scan and validate vendor
7. **Violation List** - View and manage violations
8. **Challan Management** - Issue and track challans
9. **Zone Management** - Define allowed/restricted zones
10. **Rating View** - View vendor ratings

---

## 10. Acceptance Criteria

1. ✅ Users can authenticate with JWT tokens
2. ✅ Admin can CRUD vendors with GPS locations
3. ✅ QR codes are generated for approved vendors
4. ✅ Location validation using Haversine formula works within 50m threshold
5. ✅ Violations can be reported with GPS validation
6. ✅ Officers can issue challans
7. ✅ Zones can be defined and enforced
8. ✅ Public can rate vendors
9. ✅ Admin dashboard shows statistics
10. ✅ All endpoints are secured with RBAC
11. ✅ Passwords are hashed with BCrypt
12. ✅ Frontend integrates with all backend APIs
