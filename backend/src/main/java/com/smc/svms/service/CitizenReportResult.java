package com.smc.svms.service;

public class CitizenReportResult {
    private boolean success;
    private Long reportId;
    private String message;
    private Double validationScore;
    
    public CitizenReportResult() {}
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private CitizenReportResult r = new CitizenReportResult();
        public Builder success(boolean v) { r.success = v; return this; }
        public Builder reportId(Long v) { r.reportId = v; return this; }
        public Builder message(String v) { r.message = v; return this; }
        public Builder validationScore(Double v) { r.validationScore = v; return this; }
        public CitizenReportResult build() { return r; }
    }
    
    public boolean isSuccess() { return success; }
    public Long getReportId() { return reportId; }
    public String getMessage() { return message; }
    public Double getValidationScore() { return validationScore; }
}
