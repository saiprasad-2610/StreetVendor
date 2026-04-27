package com.smc.svms.service;

public class DuplicateCheckResult {
    private boolean duplicate;
    private Long existingReportId;
    private double similarity;
    
    public DuplicateCheckResult() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private DuplicateCheckResult r = new DuplicateCheckResult();
        public Builder duplicate(boolean v) { r.duplicate = v; return this; }
        public Builder existingReportId(Long v) { r.existingReportId = v; return this; }
        public Builder similarity(double v) { r.similarity = v; return this; }
        public DuplicateCheckResult build() { return r; }
    }
    
    public boolean isDuplicate() { return duplicate; }
    public Long getExistingReportId() { return existingReportId; }
    public double getSimilarity() { return similarity; }
}
