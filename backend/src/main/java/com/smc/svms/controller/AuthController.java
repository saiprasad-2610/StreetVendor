package com.smc.svms.controller;

import com.smc.svms.dto.AuthResponse;
import com.smc.svms.dto.LoginRequest;
import com.smc.svms.dto.RegisterRequest;
import com.smc.svms.entity.User;
import com.smc.svms.entity.Vendor;
import com.smc.svms.enums.UserRole;
import com.smc.svms.security.JwtUtils;
import com.smc.svms.service.UserService;
import com.smc.svms.repository.VendorRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final JwtUtils jwtUtils;
    private final VendorRepository vendorRepository;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        System.out.println("Login attempt for user: " + request.getUsername());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User user = userService.findByUsername(userDetails.getUsername());
            String token = jwtUtils.generateToken(userDetails);

            // Build response
            AuthResponse.AuthResponseBuilder responseBuilder = AuthResponse.builder()
                    .id(user.getId())
                    .token(token)
                    .username(user.getUsername())
                    .fullName(user.getFullName())
                    .role(user.getRole());

            // Add vendorId and vendorDbId for VENDOR role users
            if (user.getRole() == UserRole.VENDOR) {
                Vendor vendor = vendorRepository.findByCreatedBy(user).orElse(null);
                if (vendor != null) {
                    responseBuilder.vendorId(vendor.getVendorId());
                    responseBuilder.vendorDbId(vendor.getId()); // Numeric ID for payments
                }
            }

            return ResponseEntity.ok(responseBuilder.build());
        } catch (Exception e) {
            System.err.println("Login failed for user: " + request.getUsername() + " Error: " + e.getMessage());
            throw e;
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        User user = User.builder()
                .username(request.getUsername())
                .password(request.getPassword())
                .email(request.getEmail())
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(request.getRole() != null ? request.getRole() : UserRole.PUBLIC)
                .enabled(true)
                .build();

        userService.registerUser(user);
        return ResponseEntity.ok("User registered successfully");
    }
}
