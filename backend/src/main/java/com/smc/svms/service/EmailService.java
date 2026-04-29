package com.smc.svms.service;

import com.smc.svms.entity.Alert;
import com.smc.svms.entity.Challan;
import com.smc.svms.entity.Vendor;
import com.smc.svms.entity.Violation;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Async
    public void sendVendorRegistrationApprovedEmail(Vendor vendor) {
        if (vendor.getEmail() == null || vendor.getEmail().isEmpty()) {
            log.warn("Cannot send registration approval email - no email for vendor: {}", vendor.getVendorId());
            return;
        }

        String subject = "✅ Registration Approved - Solapur Municipal Corporation";
        String htmlContent = buildRegistrationApprovedHtml(vendor);

        sendHtmlEmail(vendor.getEmail(), subject, htmlContent);
        log.info("Registration approval email sent to vendor: {}", vendor.getEmail());
    }

    @Async
    public void sendChallanIssuedEmail(Vendor vendor, Challan challan) {
        if (vendor.getEmail() == null || vendor.getEmail().isEmpty()) {
            log.warn("Cannot send challan email - no email for vendor: {}", vendor.getVendorId());
            return;
        }

        String subject = "🚨 Challan Issued - Fine ₹" + challan.getFineAmount() + " - Solapur Municipal Corporation";
        String htmlContent = buildChallanHtml(vendor, challan);

        sendHtmlEmail(vendor.getEmail(), subject, htmlContent);
        log.info("Challan email sent to vendor: {}", vendor.getEmail());
    }

    @Async
    public void sendWarningIssuedEmail(Vendor vendor, Violation violation, int warningNumber) {
        if (vendor.getEmail() == null || vendor.getEmail().isEmpty()) {
            log.warn("Cannot send warning email - no email for vendor: {}", vendor.getVendorId());
            return;
        }

        String subject = "⚠️ Warning #" + warningNumber + " Issued - Solapur Municipal Corporation";
        String htmlContent = buildWarningHtml(vendor, violation, warningNumber);

        sendHtmlEmail(vendor.getEmail(), subject, htmlContent);
        log.info("Warning email sent to vendor: {}", vendor.getEmail());
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "Solapur Municipal Corporation - SVMS");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Email sent successfully to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to: {}", to, e);
        } catch (Exception e) {
            log.error("Unexpected error sending email to: {}", to, e);
        }
    }

    private String buildRegistrationApprovedHtml(Vendor vendor) {
        String qrCodeSection = "";
        if (vendor.getQrCode() != null && vendor.getQrCode().getQrCodeUrl() != null) {
            qrCodeSection = "<p><strong>Your QR Code:</strong><br><img src=\"" + vendor.getQrCode().getQrCodeUrl() + "\" width=\"200\" alt=\"Your QR Code\"></p>";
        }

        return """
            <!DOCTYPE html>
            <html>
            <head><style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
                .footer { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
                .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style></head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Registration Approved!</h1>
                        <p>Welcome to Solapur Municipal Corporation Street Vendor Program</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>%s</strong>,</p>
                        <p>We are pleased to inform you that your registration has been <strong style="color: #28a745;">APPROVED</strong> by the Solapur Municipal Corporation.</p>
                        <div class="details">
                            <h3>Your Registration Details:</h3>
                            <p><strong>Vendor ID:</strong> %s</p>
                            <p><strong>Name:</strong> %s</p>
                            <p><strong>Category:</strong> %s</p>
                            <p><strong>Monthly Rent:</strong> ₹%s</p>
                            <p><strong>Status:</strong> <span style="color: #28a745;">ACTIVE</span></p>
                        </div>
                        %s
                        <p>You can now use your QR code for daily attendance scanning at your registered location.</p>
                        <a href="#" class="btn">Login to Your Account</a>
                        <p style="margin-top: 30px;">Thank you for being a responsible street vendor!</p>
                    </div>
                    <div class="footer">
                        <p>Solapur Municipal Corporation<br>Smart Street Vendor Management System</p>
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                vendor.getName(),
                vendor.getVendorId(),
                vendor.getName(),
                vendor.getCategory(),
                vendor.getMonthlyRent(),
                qrCodeSection
            );
    }

    private String buildChallanHtml(Vendor vendor, Challan challan) {
        return """
            <!DOCTYPE html>
            <html>
            <head><style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff416c 0%%, #ff4b2b 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ff416c; }
                .fine-box { background: #ffebee; border: 2px solid #f44336; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                .fine-amount { font-size: 36px; color: #f44336; font-weight: bold; }
                .footer { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
                .btn { display: inline-block; background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style></head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚨 CHALLAN ISSUED</h1>
                        <p>Location Violation - Solapur Municipal Corporation</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>%s</strong>,</p>
                        <div class="alert">
                            <strong>Important:</strong> A challan has been issued against your vendor account for violating location rules.
                        </div>
                        <div class="fine-box">
                            <p>Fine Amount</p>
                            <div class="fine-amount">₹%s</div>
                            <p style="color: #666;">Challan #%s</p>
                        </div>
                        <div class="details">
                            <h3>Challan Details:</h3>
                            <p><strong>Vendor ID:</strong> %s</p>
                            <p><strong>Reason:</strong> %s</p>
                            <p><strong>Location:</strong> %s</p>
                            <p><strong>Issued Date:</strong> %s</p>
                            <p><strong>Due Date:</strong> %s</p>
                        </div>
                        <div class="alert" style="background: #ffebee; border-color: #f44336;">
                            <strong>⚠️ Action Required:</strong> Please pay your fine immediately to avoid additional penalties and legal action.
                        </div>
                        <a href="#" class="btn">Pay Fine Now</a>
                        <p style="margin-top: 30px;">For any queries, please contact the Solapur Municipal Corporation office.</p>
                    </div>
                    <div class="footer">
                        <p>Solapur Municipal Corporation<br>Smart Street Vendor Management System</p>
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                vendor.getName(),
                challan.getFineAmount(),
                challan.getId(),
                vendor.getVendorId(),
                challan.getReason(),
                challan.getLocation(),
                challan.getIssuedAt(),
                challan.getIssuedAt().plusDays(7)
            );
    }

    private String buildWarningHtml(Vendor vendor, Violation violation, int warningNumber) {
        String maxWarningMsg = warningNumber >= 3
            ? "<div style='background: #ffebee; border: 2px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 5px;'><strong>🚨 FINAL WARNING:</strong> This is your 3rd and final warning. The next violation will result in automatic challan issuance!</div>"
            : "";

        return """
            <!DOCTYPE html>
            <html>
            <head><style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff9800 0%%, #f57c00 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .warning-badge { background: #ff9800; color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
                .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ff9800; }
                .progress { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; margin: 20px 0; }
                .progress-bar { background: linear-gradient(90deg, #ff9800 0%%, #f44336 100%%); height: 100%%; width: %d%%%; }
                .footer { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
            </style></head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚠️ WARNING ISSUED</h1>
                        <p>Street Vendor Location Violation</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>%s</strong>,</p>
                        <div style="text-align: center;">
                            <span class="warning-badge">WARNING #%d of 3</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar"></div>
                        </div>
                        <p>You have received a warning for violating the location rules set by Solapur Municipal Corporation.</p>
                        %s
                        <div class="details">
                            <h3>Violation Details:</h3>
                            <p><strong>Vendor ID:</strong> %s</p>
                            <p><strong>Violation Type:</strong> %s</p>
                            <p><strong>Description:</strong> %s</p>
                            <p><strong>Date:</strong> %s</p>
                        </div>
                        <div style="background: #fff8e1; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <strong>📋 Guidelines to Follow:</strong>
                            <ul>
                                <li>Operate only at your registered location</li>
                                <li>Ensure your QR code is visible for scanning</li>
                                <li>Report any location changes to the municipal office</li>
                                <li>Pay your monthly rent on time</li>
                            </ul>
                        </div>
                        <p><strong>Please correct your behavior immediately to avoid fines.</strong></p>
                    </div>
                    <div class="footer">
                        <p>Solapur Municipal Corporation<br>Smart Street Vendor Management System</p>
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                warningNumber * 33,
                vendor.getName(),
                warningNumber,
                maxWarningMsg,
                vendor.getVendorId(),
                violation.getViolationType(),
                violation.getDescription(),
                violation.getCapturedAt()
            );
    }
}
