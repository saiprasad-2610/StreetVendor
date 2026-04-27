package com.smc.svms.service;

public class ValidationResult {
    private boolean valid;
    private String errorMessage;
    
    public ValidationResult() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private ValidationResult r = new ValidationResult();
        public Builder valid(boolean v) { r.valid = v; return this; }
        public Builder errorMessage(String v) { r.errorMessage = v; return this; }
        public ValidationResult build() { return r; }
    }
    
    public boolean isValid() { return valid; }
    public String getErrorMessage() { return errorMessage; }
}
