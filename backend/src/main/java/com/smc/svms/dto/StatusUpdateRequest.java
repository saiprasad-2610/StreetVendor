package com.smc.svms.dto;

import com.smc.svms.entity.ReportStatus;
import lombok.Data;

@Data
public class StatusUpdateRequest {
    private ReportStatus status;
    private String resolutionNotes;
}
