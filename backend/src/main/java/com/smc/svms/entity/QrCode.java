package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "qr_codes", indexes = {
    @Index(name = "idx_qr_vendor", columnList = "vendor_id")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QrCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false, unique = true)
    @JsonIgnoreProperties("qrCode")
    private Vendor vendor;

    @Column(name = "qr_code_url", nullable = false, length = 255)
    private String qrCodeUrl;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    public QrCode() {}
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    
    public String getQrCodeUrl() { return qrCodeUrl; }
    public void setQrCodeUrl(String qrCodeUrl) { this.qrCodeUrl = qrCodeUrl; }
    
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    // Static builder method
    public static QrCodeBuilder builder() {
        return new QrCodeBuilder();
    }
    
    public static class QrCodeBuilder {
        private Vendor vendor;
        private String qrCodeUrl;
        private LocalDateTime generatedAt;
        private Boolean isActive = true;
        
        public QrCodeBuilder vendor(Vendor vendor) {
            this.vendor = vendor;
            return this;
        }
        
        public QrCodeBuilder qrCodeUrl(String qrCodeUrl) {
            this.qrCodeUrl = qrCodeUrl;
            return this;
        }
        
        public QrCodeBuilder generatedAt(LocalDateTime generatedAt) {
            this.generatedAt = generatedAt;
            return this;
        }
        
        public QrCodeBuilder isActive(Boolean isActive) {
            this.isActive = isActive;
            return this;
        }
        
        public QrCode build() {
            QrCode qrCode = new QrCode();
            qrCode.vendor = this.vendor;
            qrCode.qrCodeUrl = this.qrCodeUrl;
            qrCode.generatedAt = this.generatedAt;
            qrCode.isActive = this.isActive;
            return qrCode;
        }
    }
}
