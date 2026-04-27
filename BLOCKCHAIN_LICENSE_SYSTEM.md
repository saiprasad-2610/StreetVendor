# 🔗 Blockchain-Based License System Architecture

## 🏛️ Immutable License Management

### 1. Smart Contract Design (Solidity)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VendorLicenseRegistry {
    struct VendorLicense {
        address vendorAddress;
        string vendorId;
        string name;
        string aadhaarHash; // Hashed for privacy
        string category;
        uint256 issueDate;
        uint256 expiryDate;
        string zoneId;
        bool isActive;
        uint256 version;
        bytes32 previousLicenseHash;
    }
    
    struct LicenseVerification {
        bytes32 licenseHash;
        address verifier;
        uint256 timestamp;
        bool isValid;
        string verificationType;
    }
    
    // Mappings
    mapping(bytes32 => VendorLicense) public licenses;
    mapping(string => bytes32) public vendorIdToLicenseHash;
    mapping(address => bool) public authorizedOfficers;
    mapping(bytes32 => LicenseVerification[]) public verificationHistory;
    
    // Events
    event LicenseIssued(bytes32 indexed licenseHash, string vendorId);
    event LicenseRevoked(bytes32 indexed licenseHash, string reason);
    event LicenseVerified(bytes32 indexed licenseHash, address verifier);
    
    address public municipalAuthority;
    uint256 public licenseVersion = 1;
    
    modifier onlyAuthorized() {
        require(authorizedOfficers[msg.sender] || msg.sender == municipalAuthority, 
                "Unauthorized: Not an authorized officer");
        _;
    }
    
    constructor() {
        municipalAuthority = msg.sender;
        authorizedOfficers[msg.sender] = true;
    }
    
    /**
     * Issue new vendor license on blockchain
     */
    function issueLicense(
        string memory _vendorId,
        string memory _name,
        string memory _aadhaarHash,
        string memory _category,
        uint256 _expiryDate,
        string memory _zoneId
    ) external onlyAuthorized returns (bytes32) {
        
        require(vendorIdToLicenseHash[_vendorId] == bytes32(0), 
                "License already exists for this vendor");
        
        // Create license hash
        bytes32 licenseHash = keccak256(abi.encodePacked(
            _vendorId, _name, _aadhaarHash, _category, 
            block.timestamp, _expiryDate, _zoneId, licenseVersion
        ));
        
        // Store license
        licenses[licenseHash] = VendorLicense({
            vendorAddress: address(0), // Will be set when vendor registers wallet
            vendorId: _vendorId,
            name: _name,
            aadhaarHash: _aadhaarHash,
            category: _category,
            issueDate: block.timestamp,
            expiryDate: _expiryDate,
            zoneId: _zoneId,
            isActive: true,
            version: licenseVersion,
            previousLicenseHash: bytes32(0)
        });
        
        vendorIdToLicenseHash[_vendorId] = licenseHash;
        
        emit LicenseIssued(licenseHash, _vendorId);
        
        return licenseHash;
    }
    
    /**
     * Verify vendor license authenticity
     */
    function verifyLicense(bytes32 _licenseHash) external returns (bool) {
        VendorLicense memory license = licenses[_licenseHash];
        
        require(license.issueDate > 0, "License does not exist");
        
        bool isValid = license.isActive && 
                      (license.expiryDate == 0 || license.expiryDate > block.timestamp);
        
        // Record verification
        verificationHistory[_licenseHash].push(LicenseVerification({
            licenseHash: _licenseHash,
            verifier: msg.sender,
            timestamp: block.timestamp,
            isValid: isValid,
            verificationType: "QR_SCAN"
        }));
        
        emit LicenseVerified(_licenseHash, msg.sender);
        
        return isValid;
    }
    
    /**
     * Revoke license
     */
    function revokeLicense(bytes32 _licenseHash, string memory _reason) external onlyAuthorized {
        require(licenses[_licenseHash].issueDate > 0, "License does not exist");
        
        licenses[_licenseHash].isActive = false;
        
        emit LicenseRevoked(_licenseHash, _reason);
    }
    
    /**
     * Get license details
     */
    function getLicense(bytes32 _licenseHash) external view returns (VendorLicense memory) {
        return licenses[_licenseHash];
    }
    
    /**
     * Get verification history
     */
    function getVerificationHistory(bytes32 _licenseHash) external view returns (LicenseVerification[] memory) {
        return verificationHistory[_licenseHash];
    }
}
```

### 2. Blockchain Integration Service (Java)

```java
@Service
@Transactional
public class BlockchainLicenseService {
    
    @Autowired
    private BlockchainLicenseRepository licenseRepository;
    
    @Autowired
    private VendorRepository vendorRepository;
    
    @Autowired
    private Web3j web3j;
    
    @Value("${blockchain.contract.address}")
    private String contractAddress;
    
    @Value("${blockchain.private.key}")
    private String privateKey;
    
    private VendorLicenseRegistry contract;
    
    @PostConstruct
    public void init() {
        // Load smart contract
        this.contract = VendorLicenseRegistry.load(
            contractAddress, 
            web3j, 
            Credentials.create(privateKey), 
            Contract.GAS_PRICE, 
            Contract.GAS_LIMIT
        );
    }
    
    /**
     * Issue new blockchain license for vendor
     */
    public BlockchainLicense issueLicense(Vendor vendor) throws Exception {
        
        // 1. Prepare license data
        String aadhaarHash = hashAadhaar(vendor.getAadhaar());
        String zoneId = vendor.getLocation() != null ? 
            vendor.getLocation().getZone().getId().toString() : "UNASSIGNED";
        
        // 2. Call smart contract
        TransactionReceipt receipt = contract.issueLicense(
            vendor.getVendorId(),
            vendor.getName(),
            aadhaarHash,
            vendor.getCategory().name(),
            System.currentTimeMillis() + (365L * 24 * 60 * 60 * 1000), // 1 year expiry
            zoneId
        ).send();
        
        // 3. Extract license hash from transaction logs
        String licenseHash = extractLicenseHashFromReceipt(receipt);
        
        // 4. Save to database
        BlockchainLicense blockchainLicense = BlockchainLicense.builder()
            .vendorId(vendor.getId())
            .licenseHash(licenseHash)
            .blockchainTxId(receipt.getTransactionHash())
            .smartContractAddress(contractAddress)
            .licenseData(createLicenseData(vendor))
            .createdAt(LocalDateTime.now())
            .build();
        
        return licenseRepository.save(blockchainLicense);
    }
    
    /**
     * Verify license authenticity
     */
    public LicenseVerificationResult verifyLicense(String licenseHash) throws Exception {
        
        // 1. Check blockchain
        Tuple<Boolean, String> blockchainResult = verifyOnBlockchain(licenseHash);
        
        // 2. Check local database
        Optional<BlockchainLicense> localLicense = licenseRepository.findByLicenseHash(licenseHash);
        
        // 3. Create verification record
        LicenseVerification verification = LicenseVerification.builder()
            .licenseId(localLicense.map(BlockchainLicense::getId).orElse(null))
            .vendorId(localLicense.map(l -> l.getVendorId()).orElse(null))
            .verificationType("QR_SCAN")
            .verificationResult(blockchainResult.component1() ? "SUCCESS" : "FAILED")
            .verificationData(Map.of(
                "blockchain_valid", blockchainResult.component1(),
                "blockchain_message", blockchainResult.component2(),
                "local_exists", localLicense.isPresent()
            ))
            .createdAt(LocalDateTime.now())
            .build();
        
        // Save verification
        licenseVerificationRepository.save(verification);
        
        return LicenseVerificationResult.builder()
            .isValid(blockchainResult.component1() && localLicense.isPresent())
            .blockchainValid(blockchainResult.component1())
            .localExists(localLicense.isPresent())
            .verification(verification)
            .build();
    }
    
    /**
     * Revoke license on blockchain
     */
    public void revokeLicense(Long vendorId, String reason) throws Exception {
        
        BlockchainLicense license = licenseRepository.findByVendorId(vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("License not found"));
        
        // Revoke on blockchain
        TransactionReceipt receipt = contract.revokeLicense(
            license.getLicenseHash(), 
            reason
        ).send();
        
        // Update local record
        license.setRevoked(true);
        license.setRevokedAt(LocalDateTime.now());
        license.setRevokedReason(reason);
        licenseRepository.save(license);
    }
    
    private String hashAadhaar(String aadhaar) {
        return DigestUtils.sha256Hex(aadhaar + "SALT_FOR_PRIVACY");
    }
    
    private String extractLicenseHashFromReceipt(TransactionReceipt receipt) {
        // Parse transaction logs to extract license hash
        List<Log> logs = receipt.getLogs();
        for (Log log : logs) {
            if (log.getTopics().size() > 0) {
                return log.getTopics().get(1).toString(); // License hash is in topic[1]
            }
        }
        throw new RuntimeException("License hash not found in transaction receipt");
    }
    
    private Tuple<Boolean, String> verifyOnBlockchain(String licenseHash) throws Exception {
        try {
            boolean isValid = contract.verifyLicense(licenseHash).send();
            return Tuple.of(isValid, isValid ? "License is valid" : "License is invalid or expired");
        } catch (Exception e) {
            return Tuple.of(false, "Blockchain verification failed: " + e.getMessage());
        }
    }
}
```

### 3. Enhanced Vendor Entity with Blockchain Integration

```java
@Entity
@Table(name = "vendors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vendor {
    
    // Existing fields...
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "vendor_id", nullable = false, unique = true, length = 20)
    private String vendorId;
    
    // ... existing fields
    
    // New blockchain fields
    @OneToOne(mappedBy = "vendor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private BlockchainLicense blockchainLicense;
    
    @Column(name = "blockchain_verified")
    private Boolean blockchainVerified = false;
    
    @Column(name = "blockchain_verified_at")
    private LocalDateTime blockchainVerifiedAt;
    
    @Column(name = "wallet_address")
    private String walletAddress;
    
    @Column(name = "license_version")
    private Integer licenseVersion = 1;
    
    // Verification methods
    public boolean isBlockchainVerified() {
        return blockchainVerified != null && blockchainVerified && 
               blockchainVerifiedAt != null && 
               blockchainVerifiedAt.isAfter(LocalDateTime.now().minusDays(1));
    }
    
    public boolean hasValidLicense() {
        return blockchainLicense != null && 
               !blockchainLicense.isRevoked() && 
               blockchainLicense.getLicenseData() != null;
    }
}
```

### 4. QR Code with Blockchain Verification

```java
@Service
public class BlockchainQRService {
    
    @Autowired
    private BlockchainLicenseService blockchainService;
    
    /**
     * Generate QR code with blockchain verification URL
     */
    public String generateBlockchainQR(Vendor vendor) throws Exception {
        
        if (!vendor.hasValidLicense()) {
            throw new IllegalStateException("Vendor does not have a valid blockchain license");
        }
        
        // Create verification URL
        String verificationUrl = String.format(
            "%s/api/blockchain/verify/%s", 
            getBaseUrl(), 
            vendor.getBlockchainLicense().getLicenseHash()
        );
        
        // Generate QR code
        BitMatrix bitMatrix = new MultiFormatWriter().encode(
            verificationUrl, 
            BarcodeFormat.QR_CODE, 
            300, 
            300
        );
        
        // Save QR code image
        String fileName = "blockchain-qr-" + vendor.getVendorId() + ".png";
        String filePath = saveQRCode(bitMatrix, fileName);
        
        return filePath;
    }
    
    /**
     * Verify QR code and return license details
     */
    public LicenseVerificationResponse verifyQR(String licenseHash) {
        
        try {
            // Verify on blockchain
            LicenseVerificationResult result = blockchainService.verifyLicense(licenseHash);
            
            if (!result.isValid()) {
                return LicenseVerificationResponse.builder()
                    .valid(false)
                    .message("Invalid or revoked license")
                    .build();
            }
            
            // Get license details
            BlockchainLicense license = blockchainService.getLicenseByHash(licenseHash);
            Vendor vendor = license.getVendor();
            
            return LicenseVerificationResponse.builder()
                .valid(true)
                .vendorId(vendor.getVendorId())
                .vendorName(vendor.getName())
                .category(vendor.getCategory())
                .licenseHash(licenseHash)
                .blockchainTxId(license.getBlockchainTxId())
                .verificationTime(LocalDateTime.now())
                .blockchainVerified(true)
                .build();
                
        } catch (Exception e) {
            return LicenseVerificationResponse.builder()
                .valid(false)
                .message("Verification failed: " + e.getMessage())
                .build();
        }
    }
}
```

### 5. Blockchain API Controller

```java
@RestController
@RequestMapping("/api/blockchain")
@Validated
public class BlockchainController {
    
    @Autowired
    private BlockchainLicenseService blockchainService;
    
    @Autowired
    private BlockchainQRService qrService;
    
    /**
     * Verify license by scanning QR code
     */
    @GetMapping("/verify/{licenseHash}")
    public ResponseEntity<ApiResponse<LicenseVerificationResponse>> verifyLicense(
            @PathVariable String licenseHash,
            @RequestHeader(value = "X-Client-IP", required = false) String clientIP,
            @RequestHeader(value = "User-Agent", required = false) String userAgent) {
        
        try {
            LicenseVerificationResponse response = qrService.verifyQR(licenseHash);
            
            // Log verification for audit
            logVerification(licenseHash, clientIP, userAgent, response.isValid());
            
            return ResponseEntity.ok(ApiResponse.success(response));
            
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("Verification failed: " + e.getMessage()));
        }
    }
    
    /**
     * Issue blockchain license for vendor
     */
    @PostMapping("/issue/{vendorId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BlockchainLicense>> issueLicense(
            @PathVariable Long vendorId) {
        
        try {
            Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
            
            if (vendor.hasValidLicense()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Vendor already has a valid license"));
            }
            
            BlockchainLicense license = blockchainService.issueLicense(vendor);
            
            return ResponseEntity.ok(ApiResponse.success(license));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to issue license: " + e.getMessage()));
        }
    }
    
    /**
     * Revoke vendor license
     */
    @PostMapping("/revoke/{vendorId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> revokeLicense(
            @PathVariable Long vendorId,
            @RequestBody @Valid RevokeLicenseRequest request) {
        
        try {
            blockchainService.revokeLicense(vendorId, request.getReason());
            
            return ResponseEntity.ok(ApiResponse.success("License revoked successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to revoke license: " + e.getMessage()));
        }
    }
    
    /**
     * Get license verification history
     */
    @GetMapping("/history/{licenseHash}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<List<LicenseVerification>>> getVerificationHistory(
            @PathVariable String licenseHash) {
        
        List<LicenseVerification> history = licenseVerificationRepository
            .findByLicenseHashOrderByCreatedAtDesc(licenseHash);
        
        return ResponseEntity.ok(ApiResponse.success(history));
    }
    
    private void logVerification(String licenseHash, String clientIP, String userAgent, boolean isValid) {
        // Implementation for audit logging
        LicenseVerification verification = LicenseVerification.builder()
            .licenseHash(licenseHash)
            .verificationType("QR_SCAN")
            .verificationResult(isValid ? "SUCCESS" : "FAILED")
            .ipAddress(clientIP)
            .userAgent(userAgent)
            .createdAt(LocalDateTime.now())
            .build();
        
        licenseVerificationRepository.save(verification);
    }
}
```

---

## 🔐 Security & Privacy Features

### 1. Aadhaar Masking & Hashing

```java
@Component
public class AadhaarPrivacyService {
    
    @Value("${aadhaar.encryption.key}")
    private String encryptionKey;
    
    /**
     * Mask Aadhaar for display (show only last 4 digits)
     */
    public String maskAadhaar(String aadhaar) {
        if (aadhaar == null || aadhaar.length() < 4) {
            return "XXXX-XXXX-XXXX";
        }
        return "XXXX-XXXX-" + aadhaar.substring(aadhaar.length() - 4);
    }
    
    /**
     * Hash Aadhaar for blockchain storage
     */
    public String hashAadhaar(String aadhaar) {
        String saltedAadhaar = aadhaar + encryptionKey;
        return DigestUtils.sha256Hex(saltedAadhaar);
    }
    
    /**
     * Verify Aadhaar hash
     */
    public boolean verifyAadhaarHash(String aadhaar, String storedHash) {
        return hashAadhaar(aadhaar).equals(storedHash);
    }
}
```

### 2. Immutable Audit Trail

```java
@Entity
@Table(name = "blockchain_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlockchainAuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "license_hash", nullable = false)
    private String licenseHash;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private AuditAction actionType;
    
    @Column(name = "actor_id")
    private Long actorId;
    
    @Column(name = "actor_role")
    private String actorRole;
    
    @Column(name = "blockchain_tx_id")
    private String blockchainTxId;
    
    @Column(name = "previous_state", columnDefinition = "JSON")
    private String previousState;
    
    @Column(name = "new_state", columnDefinition = "JSON")
    private String newState;
    
    @Column(name = "ip_address")
    private String ipAddress;
    
    @Column(name = "user_agent")
    private String userAgent;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
```

---

## 🚀 Deployment Configuration

### 1. Blockchain Network Setup (Docker)

```yaml
# docker-compose.blockchain.yml
version: '3.8'

services:
  ethereum-node:
    image: ethereum/client-go:latest
    ports:
      - "8545:8545"
      - "30303:30303"
    volumes:
      - ethereum_data:/root/.ethereum
    command: --http --http.addr "0.0.0.0" --http.port "8545" --http.api "eth,net,web3,personal" --allow-insecure-unlocked --dev
    environment:
      - GETH_DEV=true
      
  blockchain-explorer:
    image: ethersphere/eth-light-app
    ports:
      - "8080:80"
    depends_on:
      - ethereum-node
    environment:
      - ETH_NODE_URL=http://ethereum-node:8545

volumes:
  ethereum_data:
```

### 2. Smart Contract Deployment Script

```javascript
// scripts/deploy-contract.js
const { ethers } = require("hardhat");

async function main() {
    // Get the contract factory
    const VendorLicenseRegistry = await ethers.getContractFactory("VendorLicenseRegistry");
    
    // Deploy contract
    const contract = await VendorLicenseRegistry.deploy();
    await contract.deployed();
    
    console.log("VendorLicenseRegistry deployed to:", contract.address);
    
    // Save contract address for Spring Boot application
    const fs = require('fs');
    const contractConfig = {
        address: contract.address,
        abi: JSON.parse(fs.readFileSync('./artifacts/contracts/VendorLicenseRegistry.sol/VendorLicenseRegistry.json', 'utf8')).abi
    };
    
    fs.writeFileSync('./contract-config.json', JSON.stringify(contractConfig, null, 2));
    console.log("Contract configuration saved to contract-config.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

This blockchain-based license system provides immutable, tamper-proof vendor licensing with complete audit trails, privacy protection, and real-time verification capabilities suitable for a government-grade smart city platform.
