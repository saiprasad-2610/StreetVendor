package com.smc.svms.dto;

import com.smc.svms.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private Long id;
    private String token;
    private String username;
    private String fullName;
    private UserRole role;
    private String vendorId; // String vendor ID (e.g., SMC-V-xxx)
    private Long vendorDbId; // Numeric vendor database ID for payments
}
