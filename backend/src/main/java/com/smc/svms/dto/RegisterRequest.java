package com.smc.svms.dto;

import com.smc.svms.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50)
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100)
    private String password;

    @Email
    private String email;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String phone;
    
    private UserRole role; // Usually PUBLIC or VENDOR
}
