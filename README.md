# Smart Street Vendor Management System (SSVMS)
## Solapur Municipal Corporation

SSVMS is a production-level digital platform designed for Solapur Municipal Corporation to manage street vendors, enforce legal vending locations using GPS validation, and streamline the violation/challan process.

## 🚀 Getting Started

### Prerequisites
- Java 17 or higher
- Node.js 18 or higher
- MySQL 8.0 or higher
- Maven 3.6+

### 1. Database Setup
1. Create a database named `svms_db` in MySQL.
2. Update `backend/src/main/resources/application.properties` with your MySQL username and password.

### 2. Backend Setup (Spring Boot)
1. Open a terminal in the `backend` directory.
2. Run the application:
   ```bash
   mvn spring-boot:run
   ```
3. The server will start at `http://10.62.25.31:8080`.
4. **Default Admin Credentials:**
   - **Username:** `admin`
   - **Password:** `admin123`

### 3. Frontend Setup (React + Vite)
1. Open a terminal in the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. The app will open at `http://10.62.25.31:3000`.

---

## 🛠 Features

### 1. Vendor Registration & Approval
- Admins can register vendors with GPS coordinates.
- Once approved, a unique **QR Code** is automatically generated for the vendor.
- Location validation is built into the QR scanning process.

### 2. Location Validation (QR Scanner)
- Officers or Public can scan the vendor's QR code.
- The system fetches the vendor's registered location and compares it with the current GPS location using the **Haversine Formula**.
- High-accuracy GPS tracking is enforced (100% precision target).
- If the vendor is within the configured threshold (default **4 meters**) of their assigned spot, the status is **VALID (Green)**.
- This threshold can be changed in `backend/src/main/resources/application.properties` via `app.location.threshold-meters`.
- If the distance is more than 4 meters, an **automatic challan** is issued to the vendor.
- Otherwise, it is flagged as **INVALID (Red)**.

### 3. Violation Reporting
- Illegal vending or location mismatches are logged as violations.
- Supports image proof and GPS tagging.

### 4. Challan System
- Enforcement officers can issue digital challans to vendors.
- Fine amounts, reasons, and due dates are tracked.
- Admin can mark challans as PAID upon collection.

### 5. Live Vending Map
- Real-time visualization of all approved vendors on a map.
- 50m radius circles represent legal vending zones for each vendor.

---

## 🔒 Security & RBAC
- **JWT (JSON Web Token):** All API calls are secured using JWT.
- **Roles:**
  - `ROLE_ADMIN`: Full access (Vendor CRUD, Approve/Reject, Challan Payment).
  - `ROLE_OFFICER`: Scanner access, Issue Challans, View Vendors.
  - `ROLE_PUBLIC`: Scanner access, Report Violation.

---

## 📡 Sample API Requests (CURL)

### Login
```bash
curl -X POST http://10.62.25.31:8080/api/auth/login \
-H "Content-Type: application/json" \
-d '{"username": "admin", "password": "admin123"}'
```

### Create Vendor (Admin)
```bash
curl -X POST http://10.62.25.31:8080/api/vendors \
-H "Authorization: Bearer <YOUR_TOKEN>" \
-H "Content-Type: application/json" \
-d '{
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "aadhaar": "123456789012",
  "category": "VEGETABLE",
  "latitude": 17.6599,
  "longitude": 75.9064,
  "address": "Navi Peth, Solapur"
}'
```

### Validate Location
```bash
curl -X POST http://10.62.25.31:8080/api/scan/validate \
-H "Content-Type: application/json" \
-d '{
  "vendorId": "SMC-V-XXXXXX",
  "latitude": 17.6600,
  "longitude": 75.9065
}'
```
