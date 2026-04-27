package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smc.svms.enums.VendorCategory;
import com.smc.svms.enums.VendorStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "vendors", indexes = {
    @Index(name = "idx_vendor_id", columnList = "vendor_id"),
    @Index(name = "idx_vendor_status", columnList = "status"),
    @Index(name = "idx_vendor_phone", columnList = "phone")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_id", nullable = false, unique = true, length = 20)
    private String vendorId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 500)
    private String aadhaar;

    @Column(name = "face_image_url", columnDefinition = "LONGTEXT")
    @Lob
    private String faceImageUrl;

    @Column(name = "monthly_rent", precision = 10, scale = 2)
    private java.math.BigDecimal monthlyRent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VendorCategory category;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VendorStatus status = VendorStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToOne(mappedBy = "vendor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private VendorLocation location;

    @OneToOne(mappedBy = "vendor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private QrCode qrCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
