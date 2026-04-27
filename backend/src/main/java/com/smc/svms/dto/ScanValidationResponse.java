package com.smc.svms.dto;

import com.smc.svms.enums.ValidationStatus;

public class ScanValidationResponse {
    private String vendorId;
    private String vendorName;
    private String category;
    private ValidationStatus validationStatus;
    private Double distance;
    private String message;
    
    public ScanValidationResponse() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private ScanValidationResponse response = new ScanValidationResponse();
        
        public Builder vendorId(String vendorId) { 
            response.vendorId = vendorId; 
            return this; 
        }
        
        public Builder vendorName(String vendorName) { 
            response.vendorName = vendorName; 
            return this; 
        }
        
        public Builder category(String category) { 
            response.category = category; 
            return this; 
        }
        
        public Builder validationStatus(ValidationStatus validationStatus) { 
            response.validationStatus = validationStatus; 
            return this; 
        }
        
        public Builder distance(Double distance) { 
            response.distance = distance; 
            return this; 
        }
        
        public Builder message(String message) { 
            response.message = message; 
            return this; 
        }
        
        public ScanValidationResponse build() { 
            return response; 
        }
    }
    
    // Getters
    public String getVendorId() { return vendorId; }
    public String getVendorName() { return vendorName; }
    public String getCategory() { return category; }
    public ValidationStatus getValidationStatus() { return validationStatus; }
    public Double getDistance() { return distance; }
    public String getMessage() { return message; }
}
