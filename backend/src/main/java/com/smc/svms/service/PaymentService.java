package com.smc.svms.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.smc.svms.dto.PaymentOrderResponse;
import com.smc.svms.dto.PaymentVerificationRequest;
import com.smc.svms.entity.Challan;
import com.smc.svms.entity.RentPayment;
import com.smc.svms.repository.ChallanRepository;
import com.smc.svms.repository.RentPaymentRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final ChallanRepository challanRepository;
    private final com.smc.svms.repository.VendorRepository vendorRepository;
    private final RentPaymentRepository rentPaymentRepository;

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Value("${razorpay.currency}")
    private String currency;

    private RazorpayClient razorpayClient;

    @PostConstruct
    public void init() {
        try {
            if (keyId == null || keyId.isEmpty() || keySecret == null || keySecret.isEmpty()) {
                log.warn("Razorpay keys are missing. Payment service will be unavailable.");
                return;
            }
            this.razorpayClient = new RazorpayClient(keyId, keySecret);
            log.info("Razorpay client initialized successfully.");
        } catch (Exception e) {
            log.error("Failed to initialize Razorpay client: {}", e.getMessage());
        }
    }

    public PaymentOrderResponse createOrder(Long challanId) throws RazorpayException {
        if (razorpayClient == null) {
            throw new RuntimeException("Payment service is currently unavailable");
        }
        Challan challan = challanRepository.findById(challanId)
                .orElseThrow(() -> new RuntimeException("Challan not found"));

        if (challan.getStatus().name().equals("PAID")) {
            throw new RuntimeException("Challan is already paid");
        }

        // Razorpay expects amount in paise (multiply by 100)
        int amountInPaise = challan.getFineAmount().multiply(new BigDecimal("100")).intValue();

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", amountInPaise);
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", "challan_" + challan.getChallanNumber());

        Order order = razorpayClient.orders.create(orderRequest);

        return PaymentOrderResponse.builder()
                .orderId(order.get("id"))
                .currency(order.get("currency"))
                .amount(order.get("amount"))
                .keyId(keyId)
                .build();
    }

    public PaymentOrderResponse createRentOrder(Long vendorId) throws RazorpayException {
        if (razorpayClient == null) {
            throw new RuntimeException("Payment service is currently unavailable");
        }
        com.smc.svms.entity.Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));

        if (vendor.getMonthlyRent() == null || vendor.getMonthlyRent().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Monthly rent is not set for this vendor");
        }

        int amountInPaise = vendor.getMonthlyRent().multiply(new BigDecimal("100")).intValue();

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", amountInPaise);
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", "rent_" + vendor.getVendorId() + "_" + System.currentTimeMillis());

        Order order = razorpayClient.orders.create(orderRequest);

        return PaymentOrderResponse.builder()
                .orderId(order.get("id"))
                .currency(order.get("currency"))
                .amount(order.get("amount"))
                .keyId(keyId)
                .build();
    }

    @Transactional
    public boolean verifyPayment(PaymentVerificationRequest request) {
        if (razorpayClient == null) {
            throw new RuntimeException("Payment service is currently unavailable");
        }
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", request.getRazorpayOrderId());
            options.put("razorpay_payment_id", request.getRazorpayPaymentId());
            options.put("razorpay_signature", request.getRazorpaySignature());

            boolean isValid = Utils.verifyPaymentSignature(options, keySecret);

            if (isValid) {
                // Check if it's a rent payment
                if (request.getIsRent() != null && request.getIsRent() && request.getVendorId() != null) {
                    com.smc.svms.entity.Vendor vendor = vendorRepository.findById(request.getVendorId())
                            .orElseThrow(() -> new RuntimeException("Vendor not found"));
                    
                    LocalDate now = LocalDate.now();
                    RentPayment rentPayment = RentPayment.builder()
                            .vendor(vendor)
                            .amount(vendor.getMonthlyRent())
                            .paymentMonth(now.getMonthValue())
                            .paymentYear(now.getYear())
                            .razorpayOrderId(request.getRazorpayOrderId())
                            .razorpayPaymentId(request.getRazorpayPaymentId())
                            .build();
                    
                    rentPaymentRepository.save(rentPayment);
                    return true;
                }

                if (request.getChallanId() != null) {
                    Challan challan = challanRepository.findById(request.getChallanId())
                            .orElseThrow(() -> new RuntimeException("Challan not found"));
                    
                    challan.setStatus(com.smc.svms.enums.ChallanStatus.PAID);
                    challan.setPaidAt(java.time.LocalDateTime.now());
                    challanRepository.save(challan);
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    public java.util.List<RentPayment> getAllRentPayments() {
        return rentPaymentRepository.findAll();
    }

    public java.util.List<RentPayment> getMyRentPayments(String username) {
        return rentPaymentRepository.findByVendorVendorId(
            vendorRepository.findByCreatedByUsername(username)
                .orElseThrow(() -> new RuntimeException("Vendor not found")).getVendorId()
        );
    }
}
