package com.smc.svms.service;

import com.smc.svms.entity.Alert;
import com.smc.svms.dto.AlertRequest;
import com.smc.svms.dto.AlertStatistics;
import java.time.LocalDate;
import java.util.List;

public interface AlertService {
    Alert createAlert(AlertRequest request);
    List<Alert> getPendingAlerts();
    List<Alert> getAlertsForOfficer(Long officerId);
    AlertStatistics getAlertStatistics(LocalDate startDate, LocalDate endDate);
}
