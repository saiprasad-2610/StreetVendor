package com.smc.svms.enums;

/**
 * Actions that can be taken when reviewing a violation
 */
public enum ViolationAction {
    ISSUE_CHALLAN,    // Issue a fine/challan to the vendor
    ISSUE_WARNING,    // Send a warning notification (max 3 warnings)
    NO_ACTION         // Dismiss as fake/invalid violation
}
