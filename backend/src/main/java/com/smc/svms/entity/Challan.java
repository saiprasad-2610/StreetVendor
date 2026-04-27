package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smc.svms.enums.ChallanStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "challans", indexes = {
    @Index(name = "idx_challan_vendor", columnList = "vendor_id"),
    @Index(name = "idx_challan_number", columnList = "challan_number"),
    @Index(name = "idx_challan_status", columnList = "status")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Challan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "challan_number", nullable = false, unique = true, length = 30)
    private String challanNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    @JsonIgnoreProperties({"location", "qrCode", "createdBy"})
    private Vendor vendor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_by", nullable = false)
    private User issuedBy;

    @Column(name = "fine_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal fineAmount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(length = 255)
    private String location;

    @Column(name = "image_proof_url", columnDefinition = "LONGTEXT")
    @Lob
    private String imageProofUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChallanStatus status = ChallanStatus.UNPAID;

    @CreationTimestamp
    @Column(name = "issued_at", updatable = false)
    private LocalDateTime issuedAt;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
    
    public Challan() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getChallanNumber() { return challanNumber; }
    public void setChallanNumber(String challanNumber) { this.challanNumber = challanNumber; }
    
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    
    public User getIssuedBy() { return issuedBy; }
    public void setIssuedBy(User issuedBy) { this.issuedBy = issuedBy; }
    
    public BigDecimal getFineAmount() { return fineAmount; }
    public void setFineAmount(BigDecimal fineAmount) { this.fineAmount = fineAmount; }
    
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    
    public String getImageProofUrl() { return imageProofUrl; }
    public void setImageProofUrl(String imageProofUrl) { this.imageProofUrl = imageProofUrl; }
    
    public ChallanStatus getStatus() { return status; }
    public void setStatus(ChallanStatus status) { this.status = status; }
    
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }
    
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    // Static builder method
    public static ChallanBuilder builder() {
        return new ChallanBuilder();
    }
    
    public static class ChallanBuilder {
        private String challanNumber;
        private Vendor vendor;
        private User issuedBy;
        private BigDecimal fineAmount;
        private String reason;
        private String location;
        private String imageProofUrl;
        private ChallanStatus status = ChallanStatus.UNPAID;
        private LocalDate dueDate;
        
        public ChallanBuilder challanNumber(String challanNumber) {
            this.challanNumber = challanNumber;
            return this;
        }
        
        public ChallanBuilder vendor(Vendor vendor) {
            this.vendor = vendor;
            return this;
        }
        
        public ChallanBuilder issuedBy(User issuedBy) {
            this.issuedBy = issuedBy;
            return this;
        }
        
        public ChallanBuilder fineAmount(BigDecimal fineAmount) {
            this.fineAmount = fineAmount;
            return this;
        }
        
        public ChallanBuilder reason(String reason) {
            this.reason = reason;
            return this;
        }
        
        public ChallanBuilder location(String location) {
            this.location = location;
            return this;
        }
        
        public ChallanBuilder imageProofUrl(String imageProofUrl) {
            this.imageProofUrl = imageProofUrl;
            return this;
        }
        
        public ChallanBuilder status(ChallanStatus status) {
            this.status = status;
            return this;
        }
        
        public ChallanBuilder dueDate(LocalDate dueDate) {
            this.dueDate = dueDate;
            return this;
        }
        
        public Challan build() {
            Challan challan = new Challan();
            challan.challanNumber = this.challanNumber;
            challan.vendor = this.vendor;
            challan.issuedBy = this.issuedBy;
            challan.fineAmount = this.fineAmount;
            challan.reason = this.reason;
            challan.location = this.location;
            challan.imageProofUrl = this.imageProofUrl;
            challan.status = this.status;
            challan.dueDate = this.dueDate;
            return challan;
        }
    }
}
