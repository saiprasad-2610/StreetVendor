package com.smc.svms.service;

import com.smc.svms.entity.Alert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
public class SMSService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SMSService.class);
    
    public void sendAlertSMS(String phoneNumber, Alert alert) {
        log.info("Sending alert SMS to {} for alert: {}", phoneNumber, alert.getTitle());
        // Implementation would use SMS gateway to send actual SMS
    }
}
