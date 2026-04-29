package com.smc.svms.dto;

public class ScanRequest {
    private String vendorId;
    private Double latitude;
    private Double longitude;
    private String imageProofUrl;
    private Double gpsAccuracy;
    private String deviceId;
    private String weatherCondition;
    
    // Scanner identity fields - CRITICAL for fraud prevention
    private ScannerType scannerType; // VENDOR_SELF, ENFORCEMENT_OFFICER, PUBLIC_USER
    private String scannerId;      // User ID of the person scanning (if authenticated)
    private String scannerName;    // Name of the scanner
    private String sessionToken;   // Session token for authenticated scanners
    
    public enum ScannerType {
        VENDOR_SELF,           // Vendor scanning their own QR code
        ENFORCEMENT_OFFICER,   // Authenticated SMC officer
        PUBLIC_USER,           // Anonymous public user
        SYSTEM                 // Automated system scan
    }
    
    public ScanRequest() {}
    
    // Getters
    public String getVendorId() { return vendorId; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getImageProofUrl() { return imageProofUrl; }
    public Double getGpsAccuracy() { return gpsAccuracy; }
    public String getDeviceId() { return deviceId; }
    public String getWeatherCondition() { return weatherCondition; }
    
    // Getters for scanner fields
    public ScannerType getScannerType() { return scannerType; }
    public String getScannerId() { return scannerId; }
    public String getScannerName() { return scannerName; }
    public String getSessionToken() { return sessionToken; }
    
    // Setters
    public void setVendorId(String vendorId) { this.vendorId = vendorId; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public void setImageProofUrl(String imageProofUrl) { this.imageProofUrl = imageProofUrl; }
    public void setGpsAccuracy(Double gpsAccuracy) { this.gpsAccuracy = gpsAccuracy; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public void setWeatherCondition(String weatherCondition) { this.weatherCondition = weatherCondition; }
    
    // Setters for scanner fields
    public void setScannerType(ScannerType scannerType) { this.scannerType = scannerType; }
    public void setScannerId(String scannerId) { this.scannerId = scannerId; }
    public void setScannerName(String scannerName) { this.scannerName = scannerName; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }
    
    /**
     * Check if this scan is from an authenticated enforcement officer
     */
    public boolean isEnforcementOfficer() {
        return scannerType == ScannerType.ENFORCEMENT_OFFICER && 
               scannerId != null && 
               !scannerId.isEmpty();
    }
    
    /**
     * Check if this scan is from the vendor themselves
     */
    public boolean isVendorSelfScan() {
        return scannerType == ScannerType.VENDOR_SELF;
    }
    
    /**
     * Check if this scan is from an anonymous public user
     */
    public boolean isPublicUser() {
        return scannerType == null || scannerType == ScannerType.PUBLIC_USER;
    }
}
