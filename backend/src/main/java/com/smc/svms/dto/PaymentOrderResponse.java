package com.smc.svms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderResponse {
    private String orderId;
    private String currency;
    private Integer amount;
    private String keyId;
    
    // Explicit builder method for compilation
    public static PaymentOrderResponseBuilder builder() {
        return new PaymentOrderResponseBuilder();
    }
    
    public static class PaymentOrderResponseBuilder {
        private String orderId;
        private String currency;
        private Integer amount;
        private String keyId;
        
        public PaymentOrderResponseBuilder orderId(String orderId) {
            this.orderId = orderId;
            return this;
        }
        
        public PaymentOrderResponseBuilder currency(String currency) {
            this.currency = currency;
            return this;
        }
        
        public PaymentOrderResponseBuilder amount(Integer amount) {
            this.amount = amount;
            return this;
        }
        
        public PaymentOrderResponseBuilder keyId(String keyId) {
            this.keyId = keyId;
            return this;
        }
        
        public PaymentOrderResponse build() {
            PaymentOrderResponse response = new PaymentOrderResponse();
            response.orderId = this.orderId;
            response.currency = this.currency;
            response.amount = this.amount;
            response.keyId = this.keyId;
            return response;
        }
    }
}
