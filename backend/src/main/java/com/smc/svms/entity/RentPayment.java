package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rent_payments", indexes = {
    @Index(name = "idx_rent_vendor", columnList = "vendor_id"),
    @Index(name = "idx_rent_month_year", columnList = "payment_month, payment_year"),
    @Index(name = "idx_rent_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class RentPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    @JsonIgnoreProperties({"location", "qrCode", "createdBy", "updatedAt", "createdAt"})
    private Vendor vendor;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_month", nullable = false)
    private Integer paymentMonth;

    @Column(name = "payment_year", nullable = false)
    private Integer paymentYear;

    @Column(name = "razorpay_order_id")
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    @CreationTimestamp
    @Column(name = "paid_at", updatable = false)
    private LocalDateTime paidAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    public enum PaymentStatus {
        PENDING, PAID, FAILED
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    
    public Integer getPaymentMonth() { return paymentMonth; }
    public void setPaymentMonth(Integer paymentMonth) { this.paymentMonth = paymentMonth; }
    
    public Integer getPaymentYear() { return paymentYear; }
    public void setPaymentYear(Integer paymentYear) { this.paymentYear = paymentYear; }
    
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }
    
    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }
    
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    
    // Static builder method
    public static RentPaymentBuilder builder() {
        return new RentPaymentBuilder();
    }
    
    public static class RentPaymentBuilder {
        private Vendor vendor;
        private BigDecimal amount;
        private Integer paymentMonth;
        private Integer paymentYear;
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private LocalDateTime paidAt;
        private PaymentStatus status = PaymentStatus.PENDING;

        public RentPaymentBuilder vendor(Vendor vendor) {
            this.vendor = vendor;
            return this;
        }

        public RentPaymentBuilder amount(BigDecimal amount) {
            this.amount = amount;
            return this;
        }

        public RentPaymentBuilder paymentMonth(Integer paymentMonth) {
            this.paymentMonth = paymentMonth;
            return this;
        }

        public RentPaymentBuilder paymentYear(Integer paymentYear) {
            this.paymentYear = paymentYear;
            return this;
        }

        public RentPaymentBuilder razorpayOrderId(String razorpayOrderId) {
            this.razorpayOrderId = razorpayOrderId;
            return this;
        }

        public RentPaymentBuilder razorpayPaymentId(String razorpayPaymentId) {
            this.razorpayPaymentId = razorpayPaymentId;
            return this;
        }

        public RentPaymentBuilder paidAt(LocalDateTime paidAt) {
            this.paidAt = paidAt;
            return this;
        }

        public RentPaymentBuilder status(PaymentStatus status) {
            this.status = status;
            return this;
        }

        public RentPayment build() {
            RentPayment payment = new RentPayment();
            payment.vendor = this.vendor;
            payment.amount = this.amount;
            payment.paymentMonth = this.paymentMonth;
            payment.paymentYear = this.paymentYear;
            payment.razorpayOrderId = this.razorpayOrderId;
            payment.razorpayPaymentId = this.razorpayPaymentId;
            payment.paidAt = this.paidAt;
            payment.status = this.status;
            return payment;
        }
    }
}
