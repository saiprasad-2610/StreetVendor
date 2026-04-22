package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smc.svms.enums.ValidationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "violations", indexes = {
    @Index(name = "idx_violation_vendor", columnList = "vendor_id"),
    @Index(name = "idx_violation_reported_by", columnList = "reported_by"),
    @Index(name = "idx_violation_status", columnList = "validation_status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Violation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    @JsonIgnoreProperties({"location", "qrCode", "createdBy"})
    private Vendor vendor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by", nullable = true)
    private User reportedBy;

    @Column(name = "image_proof_url", columnDefinition = "LONGTEXT")
    @Lob
    private String imageProofUrl;

    @Column(name = "gps_latitude", precision = 10, scale = 8)
    private BigDecimal gpsLatitude;

    @Column(name = "gps_longitude", precision = 11, scale = 8)
    private BigDecimal gpsLongitude;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "reporter_name")
    private String reporterName;

    @Column(name = "reporter_phone")
    private String reporterPhone;

    @Column(name = "captured_at")
    private LocalDateTime capturedAt;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 20)
    private ValidationStatus validationStatus = ValidationStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
