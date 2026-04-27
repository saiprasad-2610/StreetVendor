package com.smc.svms.dto;

public class ScanRequest {
    private String vendorId;
    private Double latitude;
    private Double longitude;
    private String imageProofUrl;
    private Double gpsAccuracy;
    private String deviceId;
    private String weatherCondition;
    
    public ScanRequest() {}
    
    // Getters
    public String getVendorId() { return vendorId; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getImageProofUrl() { return imageProofUrl; }
    public Double getGpsAccuracy() { return gpsAccuracy; }
    public String getDeviceId() { return deviceId; }
    public String getWeatherCondition() { return weatherCondition; }
    
    // Setters
    public void setVendorId(String vendorId) { this.vendorId = vendorId; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public void setImageProofUrl(String imageProofUrl) { this.imageProofUrl = imageProofUrl; }
    public void setGpsAccuracy(Double gpsAccuracy) { this.gpsAccuracy = gpsAccuracy; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public void setWeatherCondition(String weatherCondition) { this.weatherCondition = weatherCondition; }
}
