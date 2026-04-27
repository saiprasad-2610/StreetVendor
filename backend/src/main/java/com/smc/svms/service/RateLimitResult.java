package com.smc.svms.service;

public class RateLimitResult {
    private boolean allowed;
    private String message;
    
    public RateLimitResult() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private RateLimitResult r = new RateLimitResult();
        public Builder allowed(boolean v) { r.allowed = v; return this; }
        public Builder message(String v) { r.message = v; return this; }
        public RateLimitResult build() { return r; }
    }
    
    public boolean isAllowed() { return allowed; }
    public String getMessage() { return message; }
}
