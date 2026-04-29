package com.smc.svms.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class RentHistoryDTO {
    private Integer month;
    private String monthName;
    private Integer year;
    private BigDecimal amount;
    private boolean isPaid;
    private LocalDate dueDate;
    private LocalDate paidDate;
    private String paymentId;
    private String status; // "PAID", "PENDING", "OVERDUE"
}
