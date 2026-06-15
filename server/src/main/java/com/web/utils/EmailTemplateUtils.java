package com.web.utils;

public class EmailTemplateUtils {

    // ─────────────────────────────────────────────
    //  SHARED BUILDING BLOCKS
    // ─────────────────────────────────────────────

    private static String buildHeader(String subtitle) {
        return "<tr><td style=\"background:linear-gradient(135deg,#0284c7 0%,#0ea5e9 100%);padding:36px 40px;text-align:center;\">"
                + "<div style=\"font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;\">&#128137; iVaccine</div>"
                + "<div style=\"font-size:13px;color:#bae6fd;margin-top:6px;letter-spacing:0.3px;\">H&#7879; th&#7889;ng qu&#7843;n l&#253; ti&#234;m ch&#7911;ng</div>"
                + (subtitle != null && !subtitle.isEmpty()
                        ? "<div style=\"display:inline-block;margin-top:14px;background:rgba(255,255,255,0.18);border-radius:20px;padding:5px 18px;font-size:13px;color:#e0f2fe;\">" + subtitle + "</div>"
                        : "")
                + "</td></tr>"
                + "<tr><td style=\"height:3px;background:linear-gradient(90deg,#10b981,#0ea5e9,#7c3aed);\"></td></tr>";
    }

    private static String buildFooter() {
        return "<tr><td style=\"background:#f8fafc;padding:28px 40px;text-align:center;border-top:1px solid #e2e8f0;\">"
                + "<p style=\"margin:0 0 6px;font-size:13px;color:#94a3b8;\">&#169; 2025 iVaccine &#8212; H&#7879; th&#7889;ng qu&#7843;n l&#253; ti&#234;m ch&#7911;ng</p>"
                + "<p style=\"margin:0 0 6px;font-size:13px;color:#94a3b8;\">Website: <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;text-decoration:none;\">vaxms.shop</a></p>"
                + "<p style=\"margin:0;font-size:12px;color:#cbd5e1;font-style:italic;\">&#128274; Email t&#7921; &#273;&#7897;ng, vui l&#242;ng kh&#244;ng reply v&#224;o email n&#224;y.</p>"
                + "</td></tr>";
    }

    private static String wrapBody(String innerHtml) {
        return "<tr><td style=\"padding:40px;\">" + innerHtml + "</td></tr>";
    }

    private static String buildInfoTable(String[][] rows) {
        StringBuilder sb = new StringBuilder();
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;margin:20px 0;\">");
        for (String[] row : rows) {
            sb.append("<tr>")
              .append("<td style=\"padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;\">" + row[0] + "</td>")
              .append("<td style=\"padding:10px 16px;font-size:14px;color:#1e293b;font-weight:500;\">" + row[1] + "</td>")
              .append("</tr>");
        }
        sb.append("</table>");
        return sb.toString();
    }

    private static String buildStatusBadge(String status) {
        String color, bg, label;
        switch (status.toLowerCase()) {
            case "confirmed":
                color = "#065f46"; bg = "#d1fae5"; label = "&#10003; X&#225;c nh&#7853;n"; break;
            case "cancelled":
                color = "#7f1d1d"; bg = "#fee2e2"; label = "&#10007; H&#7911;y b&#7887;"; break;
            case "injected":
                color = "#1e3a8a"; bg = "#dbeafe"; label = "&#128137; &#272;&#227; ti&#234;m"; break;
            case "finished":
                color = "#164e63"; bg = "#cffafe"; label = "&#9989; Ho&#224;n th&#224;nh"; break;
            case "not_injected":
                color = "#78350f"; bg = "#fef3c7"; label = "&#9888; Ch&#432;a ti&#234;m"; break;
            default:
                color = "#374151"; bg = "#f3f4f6"; label = status;
        }
        return "<span style=\"display:inline-block;padding:5px 16px;border-radius:9999px;font-size:13px;font-weight:700;color:" + color + ";background:" + bg + ";\">" + label + "</span>";
    }

    private static String buildCtaButton(String url, String label, String bgColor) {
        return "<div style=\"text-align:center;margin:28px 0;\">"
                + "<a href=\"" + url + "\" style=\"display:inline-block;padding:14px 40px;background:" + bgColor + ";color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(0,0,0,0.12);\">" + label + "</a>"
                + "</div>";
    }

    private static String buildGreeting(String customerName) {
        return "<p style=\"margin:0 0 8px;font-size:16px;color:#1e293b;font-weight:600;\">Xin ch&#224;o, <span style=\"color:#0284c7;\">" + customerName + "</span>!</p>";
    }

    private static String buildDivider() {
        return "<hr style=\"border:none;border-top:1px solid #e2e8f0;margin:24px 0;\">";
    }

    private static String assemble(String header, String body, String footer) {
        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"></head>"
                + "<body style=\"margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Tahoma,Arial,sans-serif;\">"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"padding:40px 0;\">"
                + "<tr><td align=\"center\">"
                + "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;\">"
                + header
                + body
                + footer
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</body></html>";
    }

    // ─────────────────────────────────────────────
    //  1. BOOKING CONFIRMATION
    // ─────────────────────────────────────────────

    public static String bookingConfirmation(String customerName, String vaccineName, String injectDate, String timeSlot, String centerName) {
        String header = buildHeader("&#128197; X&#225;c nh&#7853;n &#273;&#259;ng k&#253; ti&#234;m ch&#7911;ng");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("Ch&#250;ng t&#244;i &#273;&#227; nh&#7853;n &#273;&#432;&#7907;c &#273;&#259;ng k&#253; ti&#234;m ch&#7911;ng c&#7911;a b&#7841;n. ")
            .append("D&#432;&#7899;i &#273;&#226;y l&#224; th&#244;ng tin chi ti&#7871;t v&#7873; l&#7883;ch h&#7865;n c&#7911;a b&#7841;n:")
            .append("</p>");

        body.append(buildInfoTable(new String[][]{
            {"&#128200; V&#7855;c-xin:", vaccineName},
            {"&#128197; Ng&#224;y ti&#234;m:", injectDate},
            {"&#9200; Gi&#7901; h&#7865;n:", timeSlot},
            {"&#127968; Trung t&#226;m:", centerName}
        }));

        body.append("<div style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:#92400e;\">&#9888; <strong>L&#432;u &#253;:</strong> Vui l&#242;ng &#273;&#7871;n &#273;&#250;ng gi&#7901; v&#224; mang theo CMND/C&#259;n c&#432;&#7899;c c&#244;ng d&#226;n &#273;&#7875; l&#224;m th&#7911; t&#7909;c ti&#234;m ch&#7911;ng.</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">N&#7871;u c&#243; th&#7855;c m&#7855;c, vui l&#242;ng li&#234;n h&#7879; qua website <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;\">vaxms.shop</a>.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    public static String bookingConfirmationPayLater(String customerName, String vaccineName, String injectDate, String timeSlot, String centerName) {
        String header = buildHeader("&#128197; X&#225;c nh&#7853;n &#273;&#259;ng k&#253; ti&#234;m ch&#7911;ng");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("Ch&#250;ng t&#244;i &#273;&#227; nh&#7853;n &#273;&#432;&#7907;c &#273;&#259;ng k&#253; ti&#234;m ch&#7911;ng c&#7911;a b&#7841;n v&#224; l&#7921;a ch&#7885;n <strong>Thanh to&#225;n sau t&#7841;i trung t&#226;m</strong>. ")
            .append("D&#432;&#7899;i &#273;&#226;y l&#224; th&#244;ng tin chi ti&#7871;t v&#7873; l&#7883;ch h&#7865;n:")
            .append("</p>");

        body.append(buildInfoTable(new String[][]{
            {"&#128200; V&#7855;c-xin:", vaccineName},
            {"&#128197; Ng&#224;y ti&#234;m:", injectDate},
            {"&#9200; Gi&#7901; h&#7865;n:", timeSlot},
            {"&#127968; Trung t&#226;m:", centerName},
            {"&#128181; H&#236;nh th&#7913;c:", "Thanh to&#225;n sau t&#7841;i trung t&#226;m"}
        }));

        body.append("<div style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:#92400e;\">&#9888; <strong>L&#432;u &#253;:</strong> Vui l&#242;ng &#273;&#7871;n &#273;&#250;ng gi&#7901;, mang theo CMND/C&#259;n c&#432;&#7899;c c&#244;ng d&#226;n v&#224; th&#7921;c hi&#7878;n thanh to&#225;n (ti&#7873;n m&#7863;t ho&#7865;c qu&#7865;t th&#7867;) t&#7841;i qu&#7847;y ti&#7871;p &#273;&#243;n c&#7911;a trung t&#226;m tr&#432;&#7899;c khi v&#224;o ti&#234;m.</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">N&#7871;u c&#243; th&#7855;c m&#7855;c, vui l&#242;ng li&#234;n h&#7879; qua website <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;\">vaxms.shop</a>.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  2. BOOKING STATUS UPDATE
    // ─────────────────────────────────────────────

    public static String bookingStatusUpdate(String customerName, String vaccineName, String newStatus) {
        String header = buildHeader("&#128260; C&#7853;p nh&#7853;t tr&#7841;ng th&#225;i l&#7883;ch h&#7865;n");

        String statusDesc;
        switch (newStatus.toLowerCase()) {
            case "confirmed":
                statusDesc = "L&#7883;ch h&#7865;n c&#7911;a b&#7841;n &#273;&#227; &#273;&#432;&#7907;c <strong>x&#225;c nh&#7853;n</strong>. Vui l&#242;ng &#273;&#7871;n &#273;&#250;ng gi&#7901; &#273;&#227; h&#7865;n.";
                break;
            case "cancelled":
                statusDesc = "L&#7883;ch h&#7865;n c&#7911;a b&#7841;n &#273;&#227; b&#7883; <strong>h&#7911;y b&#7887;</strong>. N&#7871;u c&#243; th&#7855;c m&#7855;c, vui l&#242;ng li&#234;n h&#7879; v&#7899;i ch&#250;ng t&#244;i.";
                break;
            case "injected":
                statusDesc = "B&#7841;n &#273;&#227; &#273;&#432;&#7907;c ghi nh&#7853;n <strong>&#273;&#227; ti&#234;m</strong> v&#7855;c-xin. C&#7843;m &#417;n b&#7841;n &#273;&#227; s&#7917; d&#7909;ng d&#7883;ch v&#7909;!";
                break;
            case "finished":
                statusDesc = "L&#7883;ch ti&#234;m c&#7911;a b&#7841;n &#273;&#227; <strong>ho&#224;n th&#224;nh</strong>. Ch&#250;c b&#7841;n s&#7913;c kh&#7887;e!";
                break;
            case "not_injected":
                statusDesc = "H&#7879; th&#7889;ng ghi nh&#7853;n b&#7841;n <strong>ch&#432;a ti&#234;m ho&#7863;c b&#7883; ho&#227;n ti&#234;m</strong>. Vui l&#242;ng truy c&#7853;p website v&#224; t&#7921; &#273;&#7893;i l&#7883;ch m&#7899;i trong v&#242;ng 24 gi&#7901;.";
                break;
            default:
                statusDesc = "Tr&#7841;ng th&#225;i l&#7883;ch h&#7865;n c&#7911;a b&#7841;n &#273;&#227; &#273;&#432;&#7907;c c&#7853;p nh&#7853;t.";
        }

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("Tr&#7841;ng th&#225;i l&#7883;ch h&#7865;n ti&#234;m ch&#7911;ng c&#7911;a b&#7841;n v&#7899;i v&#7855;c-xin <strong style=\"color:#0284c7;\">")
            .append(vaccineName).append("</strong> &#273;&#227; &#273;&#432;&#7907;c c&#7853;p nh&#7853;t:</p>");

        body.append("<div style=\"text-align:center;margin:20px 0;\">")
            .append(buildStatusBadge(newStatus))
            .append("</div>");

        body.append("<div style=\"background:#f8fafc;border-radius:8px;padding:16px 20px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:14px;color:#475569;line-height:1.7;\">").append(statusDesc).append("</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">Truy c&#7853;p <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;\">vaxms.shop</a> &#273;&#7875; xem chi ti&#7871;t l&#7883;ch h&#7865;n.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  3. ACCOUNT ACTIVATION (OTP)
    // ─────────────────────────────────────────────

    public static String accountActivation(String customerName, String otpCode) {
        String header = buildHeader("&#128274; X&#225;c th&#7921;c t&#224;i kho&#7843;n");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));
        body.append("<p style=\"margin:12px 0 24px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("C&#7843;m &#417;n b&#7841;n &#273;&#227; &#273;&#259;ng k&#253; t&#224;i kho&#7843;n t&#7841;i <strong>iVaccine</strong>. ")
            .append("S&#7917; d&#7909;ng m&#227; OTP d&#432;&#7899;i &#273;&#226;y &#273;&#7875; x&#225;c th&#7921;c t&#224;i kho&#7843;n c&#7911;a b&#7841;n:")
            .append("</p>");

        body.append("<div style=\"text-align:center;margin:28px 0;\">");
        body.append("<p style=\"margin:0 0 12px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px;\">M&#227; OTP c&#7911;a b&#7841;n</p>");
        body.append("<div style=\"display:inline-block;background:#f0f9ff;border:2px dashed #0ea5e9;border-radius:12px;padding:20px 48px;\">");
        body.append("<span style=\"font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:900;color:#0284c7;letter-spacing:12px;\">").append(otpCode).append("</span>");
        body.append("</div>");
        body.append("<p style=\"margin:14px 0 0;font-size:12px;color:#94a3b8;\">M&#227; c&#243; hi&#7879;u l&#7921;c trong <strong>5 ph&#250;t</strong></p>");
        body.append("</div>");

        body.append("<div style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:#92400e;\">&#128274; <strong>B&#7843;o m&#7853;t:</strong> Kh&#244;ng chia s&#7867; m&#227; OTP n&#224;y v&#7899;i b&#7845;t k&#7923; ai. iVaccine s&#7869; kh&#244;ng bao gi&#7901; y&#234;u c&#7847;u m&#227; OTP qua &#273;i&#7879;n tho&#7841;i.</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">N&#7871;u b&#7841;n kh&#244;ng y&#234;u c&#7847;u m&#227; n&#224;y, vui l&#242;ng b&#7887; qua email n&#224;y.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  4. PASSWORD RESET
    // ─────────────────────────────────────────────

    public static String passwordReset(String customerName, String resetUrl) {
        String header = buildHeader("&#128272; &#272;&#7863;t l&#7841;i m&#7853;t kh&#7849;u");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("Ch&#250;ng t&#244;i nh&#7853;n &#273;&#432;&#7907;c y&#234;u c&#7847;u &#273;&#7863;t l&#7841;i m&#7853;t kh&#7849;u cho t&#224;i kho&#7843;n iVaccine c&#7911;a b&#7841;n. ")
            .append("Nh&#7845;n v&#224;o n&#250;t b&#234;n d&#432;&#7899;i &#273;&#7875; t&#7841;o m&#7853;t kh&#7849;u m&#7899;i:")
            .append("</p>");

        body.append(buildCtaButton(resetUrl, "&#128272; &#272;&#7863;t l&#7841;i m&#7853;t kh&#7849;u", "#0284c7"));

        body.append("<p style=\"text-align:center;margin:-16px 0 20px;font-size:12px;color:#94a3b8;\">Ho&#7863;c sao ch&#233;p &#273;&#432;&#7901;ng d&#7851;n n&#224;y v&#224;o tr&#236;nh duy&#7879;t:</p>");
        body.append("<div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin:0 0 20px;word-break:break-all;\">");
        body.append("<a href=\"").append(resetUrl).append("\" style=\"font-size:12px;color:#0ea5e9;text-decoration:none;\">").append(resetUrl).append("</a>");
        body.append("</div>");

        body.append("<div style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0 0 6px;font-size:13px;color:#7f1d1d;font-weight:700;\">&#9888; L&#432;u &#253; b&#7843;o m&#7853;t</p>");
        body.append("<ul style=\"margin:0;padding-left:18px;font-size:13px;color:#991b1b;line-height:1.8;\">");
        body.append("<li>Li&#234;n k&#7871;t c&#243; hi&#7879;u l&#7921;c trong <strong>15 ph&#250;t</strong>.</li>");
        body.append("<li>N&#7871;u b&#7841;n kh&#244;ng y&#234;u c&#7847;u, h&#227;y b&#7887; qua email n&#224;y v&#224; m&#7853;t kh&#7849;u s&#7869; kh&#244;ng thay &#273;&#7893;i.</li>");
        body.append("<li>Kh&#244;ng chia s&#7867; li&#234;n k&#7871;t n&#224;y v&#7899;i b&#7845;t k&#7923; ai.</li>");
        body.append("</ul>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">C&#7847;n h&#7895; tr&#7907;? Truy c&#7853;p <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;\">vaxms.shop</a>.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  5. PAYMENT REMINDER
    // ─────────────────────────────────────────────

    public static String paymentReminder(String customerName, String vaccineName, String deadline) {
        String header = buildHeader("&#9200; Nh&#7855;c nh&#7903; thanh to&#225;n");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("L&#7883;ch h&#7865;n ti&#234;m ch&#7911;ng c&#7911;a b&#7841;n &#273;ang ch&#7901; x&#225;c nh&#7853;n thanh to&#225;n. ")
            .append("Vui l&#242;ng ho&#224;n t&#7845;t thanh to&#225;n tr&#432;&#7899;c th&#7901;i h&#7841;n &#273;&#7875; gi&#7919; l&#7883;ch h&#7865;n:")
            .append("</p>");

        body.append("<div style=\"background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin:0 0 20px;\">");
        body.append("<p style=\"margin:0;font-size:15px;font-weight:700;color:#92400e;\">&#9203; Th&#7901;i h&#7841;n thanh to&#225;n: ").append(deadline).append("</p>");
        body.append("<p style=\"margin:6px 0 0;font-size:13px;color:#b45309;\">L&#7883;ch h&#7865;n s&#7869; t&#7921; &#273;&#7897;ng b&#7883; h&#7911;y n&#7871;u kh&#244;ng thanh to&#225;n &#273;&#250;ng h&#7841;n.</p>");
        body.append("</div>");

        body.append(buildInfoTable(new String[][]{
            {"&#128200; V&#7855;c-xin:", vaccineName},
            {"&#8987; H&#7841;n thanh to&#225;n:", deadline}
        }));

        body.append(buildCtaButton("https://vaxms.shop", "&#128179; Thanh to&#225;n ngay", "#f59e0b"));

        body.append("<div style=\"background:#f0f9ff;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:#075985;\">&#128161; N&#7871;u b&#7841;n &#273;&#227; thanh to&#225;n, vui l&#242;ng b&#7887; qua email n&#224;y. H&#7879; th&#7889;ng c&#243; th&#7875; c&#7853;p nh&#7853;t trong v&#242;ng v&#224;i ph&#250;t.</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">H&#7895; tr&#7907;: <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;\">vaxms.shop</a></p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  6. SCHEDULE CHANGE
    // ─────────────────────────────────────────────

    public static String scheduleChange(String customerName, String vaccineName, String newDate, String newTimeSlot, int changesRemaining) {
        String header = buildHeader("&#128197; Thay &#273;&#7893;i l&#7883;ch h&#7865;n");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("Y&#234;u c&#7847;u thay &#273;&#7893;i l&#7883;ch h&#7865;n ti&#234;m ch&#7911;ng c&#7911;a b&#7841;n &#273;&#227; &#273;&#432;&#7907;c ghi nh&#7853;n. D&#432;&#7899;i &#273;&#226;y l&#224; th&#244;ng tin l&#7883;ch m&#7899;i:")
            .append("</p>");

        body.append(buildInfoTable(new String[][]{
            {"&#128200; V&#7855;c-xin:", vaccineName},
            {"&#128197; Ng&#224;y ti&#234;m m&#7899;i:", newDate},
            {"&#9200; Gi&#7901; h&#7865;n m&#7899;i:", newTimeSlot}
        }));

        String remainingColor = changesRemaining > 1 ? "#065f46" : "#7f1d1d";
        String remainingBg = changesRemaining > 1 ? "#d1fae5" : "#fee2e2";
        body.append("<div style=\"background:" + remainingBg + ";border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:" + remainingColor + ";\">");
        body.append("&#128260; B&#7841;n c&#242;n <strong>").append(changesRemaining).append(" l&#7847;n</strong> &#273;&#432;&#7907;c ph&#233;p thay &#273;&#7893;i l&#7883;ch h&#7865;n.");
        if (changesRemaining == 0) {
            body.append(" &#8212; &#272;&#226;y l&#224; l&#7847;n thay &#273;&#7893;i cu&#7889;i c&#249;ng c&#7911;a b&#7841;n.");
        }
        body.append("</p>");
        body.append("</div>");

        body.append("<div style=\"background:#f8fafc;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:#475569;\">&#9888; Vui l&#242;ng &#273;&#7871;n &#273;&#250;ng gi&#7901; &#273;&#227; h&#7865;n m&#7899;i v&#224; mang theo gi&#7845;y t&#7901; tu&#253; th&#226;n.</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">Xem l&#7883;ch h&#7865;n t&#7841;i <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;\">vaxms.shop</a>.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  7. AUTO-CANCEL NOTIFICATION
    // ─────────────────────────────────────────────

    public static String autoCancelNotification(String customerName, String vaccineName, String registeredDate) {
        String header = buildHeader("&#128683; L&#7883;ch h&#7865;n b&#7883; h&#7911;y t&#7921; &#273;&#7897;ng");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("R&#7845;t ti&#7871;c, l&#7883;ch h&#7865;n ti&#234;m ch&#7911;ng c&#7911;a b&#7841;n &#273;&#227; b&#7883; <strong style=\"color:#ef4444;\">h&#7911;y t&#7921; &#273;&#7897;ng</strong> do kh&#244;ng ho&#224;n t&#7845;t thanh to&#225;n trong th&#7901;i gian quy &#273;&#7883;nh (24 gi&#7901;).")
            .append("</p>");

        body.append("<div style=\"text-align:center;margin:20px 0;\">")
            .append(buildStatusBadge("cancelled"))
            .append("</div>");

        body.append(buildInfoTable(new String[][]{
            {"&#128200; V&#7855;c-xin:", vaccineName},
            {"&#128197; Ng&#224;y &#273;&#259;ng k&#253;:", registeredDate},
            {"&#128683; L&#253; do h&#7911;y:", "Kh&#244;ng thanh to&#225;n sau 24 gi&#7901;"}
        }));

        body.append("<div style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0 0 8px;font-size:13px;color:#7f1d1d;font-weight:700;\">T&#7841;i sao l&#7883;ch h&#7865;n b&#7883; h&#7911;y?</p>");
        body.append("<p style=\"margin:0;font-size:13px;color:#991b1b;line-height:1.7;\">H&#7879; th&#7889;ng t&#7921; &#273;&#7897;ng h&#7911;y l&#7883;ch h&#7865;n n&#7871;u kh&#244;ng nh&#7853;n &#273;&#432;&#7907;c thanh to&#225;n trong v&#242;ng 24 gi&#7901; k&#7875; t&#7915; khi &#273;&#259;ng k&#253; &#273;&#7875; &#273;&#7843;m b&#7843;o c&#225;c kh&#225;ch h&#224;ng kh&#225;c c&#243; c&#417; h&#7897;i &#273;&#7863;t l&#7883;ch.</p>");
        body.append("</div>");

        body.append(buildCtaButton("https://vaxms.shop", "&#128197; &#272;&#7863;t l&#7883;ch m&#7899;i", "#0284c7"));

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">N&#7871;u c&#243; th&#7855;c m&#7855;c, vui l&#242;ng li&#234;n h&#7879; qua <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;\">vaxms.shop</a>.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  8. NEW ACCOUNT WITH BOOKING
    // ─────────────────────────────────────────────

    public static String newAccountWithBooking(String customerName, String email, String password,
                                               String vaccineName, String injectDate, String timeSlot,
                                               boolean isNewAccount) {
        String subtitle = isNewAccount ? "&#127381; T&#224;i kho&#7843;n m&#7899;i &amp; L&#7883;ch h&#7865;n" : "&#128197; X&#225;c nh&#7853;n l&#7883;ch h&#7865;n";
        String header = buildHeader(subtitle);

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName));

        if (isNewAccount) {
            body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
                .append("Ch&#250;ng t&#244;i &#273;&#227; t&#7841;o m&#7897;t t&#224;i kho&#7843;n iVaccine cho b&#7841;n v&#224; &#273;&#259;ng k&#253; l&#7883;ch h&#7865;n th&#224;nh c&#244;ng. ")
                .append("D&#432;&#7899;i &#273;&#226;y l&#224; th&#244;ng tin t&#224;i kho&#7843;n v&#224; l&#7883;ch h&#7865;n c&#7911;a b&#7841;n:")
                .append("</p>");

            body.append("<div style=\"background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px 20px;margin:0 0 20px;\">");
            body.append("<p style=\"margin:0 0 8px;font-size:14px;font-weight:700;color:#064e3b;\">&#128274; Th&#244;ng tin &#273;&#259;ng nh&#7853;p</p>");
            body.append(buildInfoTable(new String[][]{
                {"&#128140; Email:", email},
                {"&#128272; M&#7853;t kh&#7849;u:", "<span style=\"font-family:'Courier New',Courier,monospace;background:#f1f5f9;padding:2px 8px;border-radius:4px;\">" + password + "</span>"}
            }));
            body.append("<p style=\"margin:8px 0 0;font-size:12px;color:#065f46;\">&#9888; Vui l&#242;ng &#273;&#7893;i m&#7853;t kh&#7849;u sau khi &#273;&#259;ng nh&#7853;p l&#7847;n &#273;&#7847;u.</p>");
            body.append("</div>");
        } else {
            body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
                .append("L&#7883;ch h&#7865;n ti&#234;m ch&#7911;ng c&#7911;a b&#7841;n &#273;&#227; &#273;&#432;&#7907;c &#273;&#259;ng k&#253; th&#224;nh c&#244;ng. D&#432;&#7899;i &#273;&#226;y l&#224; chi ti&#7871;t l&#7883;ch h&#7865;n:")
                .append("</p>");
        }

        body.append("<p style=\"margin:0 0 8px;font-size:14px;font-weight:700;color:#1e293b;\">&#128197; Th&#244;ng tin l&#7883;ch h&#7865;n</p>");
        body.append(buildInfoTable(new String[][]{
            {"&#128200; V&#7855;c-xin:", vaccineName},
            {"&#128197; Ng&#224;y ti&#234;m:", injectDate},
            {"&#9200; Gi&#7901; h&#7865;n:", timeSlot}
        }));

        body.append(buildCtaButton("https://vaxms.shop", "&#128101; &#272;&#259;ng nh&#7853;p v&#224;o iVaccine", "#0284c7"));

        body.append("<div style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:#92400e;\">&#9200; <strong>Nh&#7855;c nh&#7903;:</strong> Vui l&#242;ng ho&#224;n t&#7845;t thanh to&#225;n trong v&#242;ng <strong>24 gi&#7901;</strong> &#273;&#7875; gi&#7919; l&#7883;ch h&#7865;n. L&#7883;ch s&#7869; t&#7921; &#273;&#7897;ng h&#7911;y n&#7871;u qu&#225; h&#7841;n.</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">C&#7847;n h&#7895; tr&#7907;? Truy c&#7853;p <a href=\"https://vaxms.shop\" style=\"color:#0ea5e9;\">vaxms.shop</a>.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  CERTIFICATE ISSUED
    // ─────────────────────────────────────────────

    public static String certificateIssued(String customerName, String vaccineName,
                                           String serialNo, String verifyUrl, String downloadHint) {
        String header = buildHeader("&#128221; Gi&#7845;y x&#225;c nh&#7853;n ti&#234;m ch&#7911;ng");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName != null ? customerName : "Qu&#253; kh&#225;ch"));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("Ch&#250;c m&#7915;ng b&#7841;n &#273;&#227; ho&#224;n th&#224;nh mũi tiêm <strong style=\"color:#0284c7;\">")
            .append(vaccineName != null ? vaccineName : "vaccine")
            .append("</strong>. Gi&#7845;y x&#225;c nh&#7853;n ti&#234;m ch&#7911;ng &#273;&#227; &#273;&#432;&#7907;c c&#7845;p:")
            .append("</p>");

        body.append("<div style=\"text-align:center;margin:24px 0;background:#f0f9ff;border:2px dashed #0ea5e9;border-radius:12px;padding:24px;\">");
        body.append("<p style=\"margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;\">M&#227; gi&#7845;y x&#225;c nh&#7853;n</p>");
        body.append("<p style=\"margin:0;font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:900;color:#0284c7;letter-spacing:2px;\">")
            .append(serialNo != null ? serialNo : "—")
            .append("</p>");
        body.append("</div>");

        body.append("<p style=\"margin:20px 0 12px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("&#128205; <strong>T&#7843;i file PDF:</strong> Truy c&#7853;p trang <em>L&#7883;ch &#273;&#227; &#273;&#259;ng k&#253;</em> trong t&#224;i kho&#7843;n c&#7911;a b&#7841;n &#273;&#7875; t&#7843;i gi&#7845;y x&#225;c nh&#7853;n.")
            .append("</p>");
        body.append(buildCtaButton(downloadHint, "&#128190; T&#7843;i gi&#7845;y x&#225;c nh&#7853;n", "#0284c7"));

        body.append("<p style=\"margin:20px 0 12px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("&#128270; <strong>Ki&#7875;m tra t&#237;nh h&#7907;p l&#7879;:</strong> B&#7845;t k&#7923; ai c&#243; QR code ho&#7863;c m&#227; gi&#7845;y &#273;&#7873;u c&#243; th&#7875; verify online:")
            .append("</p>");
        body.append("<div style=\"text-align:center;margin:14px 0 22px;\">");
        body.append("<a href=\"").append(verifyUrl).append("\" style=\"color:#0ea5e9;font-size:13px;text-decoration:none;word-break:break-all;\">")
            .append(verifyUrl).append("</a>");
        body.append("</div>");

        body.append("<div style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:#92400e;\">&#9888; <strong>L&#432;u &#253;:</strong> Gi&#7845;y x&#225;c nh&#7853;n c&#243; gi&#225; tr&#7883; v&#7899;i ch&#7919; k&#253; s&#7889; (hash). N&#7871;u file b&#7883; ch&#7881;nh s&#7917;a, h&#7879; th&#7889;ng s&#7869; t&#7921; nh&#7853;n di&#7879;n l&#224; kh&#244;ng h&#7907;p l&#7879;.</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">C&#7843;m &#417;n b&#7841;n &#273;&#227; tin t&#432;&#7903;ng iVaccine!</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  UPCOMING INJECTION REMINDER (1 ngày trước lịch tiêm)
    // ─────────────────────────────────────────────

    public static String upcomingInjectionReminder(String customerName, String vaccineName,
                                                   String injectDate, String timeSlot, String centerName,
                                                   String centerAddress) {
        String header = buildHeader("&#9200; Nh&#7855;c l&#7883;ch ti&#234;m ng&#224;y mai");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName != null ? customerName : "Qu&#253; kh&#225;ch"));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("Xin nh&#7855;c b&#7841;n c&#243; l&#7883;ch ti&#234;m v&#7855;c-xin v&#224;o ng&#224;y mai. ")
            .append("Vui l&#242;ng s&#7855;p x&#7871;p th&#7901;i gian &#273;&#7871;n &#273;&#250;ng gi&#7901; nh&#233;!")
            .append("</p>");

        body.append("<div style=\"background:linear-gradient(135deg,#fef3c7,#fed7aa);border-radius:12px;padding:20px;margin:20px 0;text-align:center;\">");
        body.append("<div style=\"font-size:14px;color:#92400e;font-weight:600;margin-bottom:6px;\">&#128197; LỊCH TIÊM SẮP TỚI</div>");
        body.append("<div style=\"font-size:24px;font-weight:900;color:#9a3412;margin:6px 0;\">").append(injectDate != null ? injectDate : "—").append("</div>");
        body.append("<div style=\"font-size:14px;color:#78350f;\">&#9200; ").append(timeSlot != null ? timeSlot : "—").append("</div>");
        body.append("</div>");

        body.append(buildInfoTable(new String[][]{
            {"&#128137; V&#7855;c-xin:",    vaccineName != null ? vaccineName : "—"},
            {"&#127968; Trung t&#226;m:",   centerName  != null ? centerName  : "—"},
            {"&#128205; &#272;&#7883;a ch&#7881;:",    centerAddress != null ? centerAddress : "—"}
        }));

        body.append("<div style=\"background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;\">&#9888; CHU&#7848;N B&#7882; TR&#431;&#7898;C KHI TI&#202;M:</p>");
        body.append("<ul style=\"margin:0;padding-left:20px;font-size:13px;color:#92400e;line-height:1.7;\">");
        body.append("<li>Mang theo CMND/C&#259;n c&#432;&#7899;c c&#244;ng d&#226;n</li>");
        body.append("<li>&#258;n u&#7889;ng b&#236;nh th&#432;&#7901;ng, kh&#244;ng nh&#7883;n &#259;n</li>");
        body.append("<li>Ng&#7911; &#273;&#7911; gi&#7845;c, kh&#244;ng u&#7889;ng r&#432;&#7907;u bia 24h tr&#432;&#7899;c ti&#234;m</li>");
        body.append("<li>B&#225;o nh&#226;n vi&#234;n n&#7871;u &#273;ang s&#7889;t, &#7889;m, d&#7883; &#7913;ng ho&#7863;c &#273;ang u&#7889;ng thu&#7889;c</li>");
        body.append("</ul>");
        body.append("</div>");

        body.append(buildCtaButton("https://vaxms.shop/lich-da-dang-ky", "&#128197; Xem chi ti&#7871;t l&#7883;ch", "#0284c7"));

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">N&#7871;u kh&#244;ng th&#7875; &#273;&#7871;n &#273;&#250;ng h&#7865;n, vui l&#242;ng v&#224;o trang &lt;strong&gt;L&#7883;ch c&#7911;a t&#244;i&lt;/strong&gt; &#273;&#7875; &#273;&#7893;i ho&#7863;c h&#7911;y l&#7883;ch.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }

    // ─────────────────────────────────────────────
    //  NEXT DOSE REMINDER (mũi tiếp theo cho vaccine nhiều mũi)
    // ─────────────────────────────────────────────

    public static String nextDoseReminder(String customerName, String vaccineName,
                                          int currentDose, int totalDoses,
                                          String lastInjectDate, String suggestedDate) {
        String header = buildHeader("&#128137; Nh&#7855;c m&#361;i ti&#234;m ti&#7871;p theo");

        StringBuilder body = new StringBuilder();
        body.append(buildGreeting(customerName != null ? customerName : "Qu&#253; kh&#225;ch"));
        body.append("<p style=\"margin:12px 0 20px;font-size:14px;color:#475569;line-height:1.7;\">")
            .append("B&#7841;n &#273;&#227; ti&#234;m m&#361;i <strong>").append(currentDose).append("/").append(totalDoses).append("</strong> v&#7855;c-xin <strong style=\"color:#0284c7;\">")
            .append(vaccineName != null ? vaccineName : "")
            .append("</strong>. &#272;&#227; &#273;&#7871;n l&#250;c &#273;&#259;ng k&#253; m&#361;i ti&#7871;p theo!")
            .append("</p>");

        body.append("<div style=\"background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-radius:12px;padding:20px;margin:20px 0;text-align:center;\">");
        body.append("<div style=\"font-size:13px;color:#1e3a8a;font-weight:600;\">M&#361;i ti&#234;m ti&#7871;p theo</div>");
        body.append("<div style=\"font-size:36px;font-weight:900;color:#1e40af;margin:8px 0;\">M&#361;i ").append(currentDose + 1).append("/").append(totalDoses).append("</div>");
        body.append("<div style=\"font-size:13px;color:#1e3a8a;\">D&#7921; ki&#7871;n: <strong>").append(suggestedDate != null ? suggestedDate : "—").append("</strong></div>");
        body.append("</div>");

        body.append(buildInfoTable(new String[][]{
            {"&#128137; V&#7855;c-xin:",    vaccineName != null ? vaccineName : "—"},
            {"&#128200; M&#361;i &#273;&#227; ti&#234;m:", currentDose + "/" + totalDoses},
            {"&#128197; M&#361;i g&#7847;n nh&#7845;t:", lastInjectDate != null ? lastInjectDate : "—"},
            {"&#9200; D&#7921; ki&#7871;n m&#361;i k&#7871; ti&#7871;p:", suggestedDate != null ? suggestedDate : "—"}
        }));

        body.append(buildCtaButton("https://vaxms.shop/dang-ky-tiem-chung", "&#128197; &#272;&#259;ng k&#253; m&#361;i ti&#7871;p theo", "#0284c7"));

        body.append("<div style=\"background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin:20px 0;\">");
        body.append("<p style=\"margin:0;font-size:13px;color:#0c4a6e;line-height:1.7;\">");
        body.append("&#128161; <strong>L&#432;u &#253;:</strong> Vi&#7879;c ti&#234;m &#273;&#7911; m&#361;i &#273;&#250;ng l&#7883;ch r&#7845;t quan tr&#7885;ng &#273;&#7875; &#273;&#7843;m b&#7843;o hi&#7879;u qu&#7843; mi&#7877;n d&#7883;ch t&#7889;t nh&#7845;t. Vui l&#242;ng &#273;&#259;ng k&#253; s&#7899;m.");
        body.append("</p>");
        body.append("</div>");

        body.append(buildDivider());
        body.append("<p style=\"margin:0;font-size:13px;color:#94a3b8;\">C&#7847;n t&#432; v&#7845;n? Li&#234;n h&#7879; hotline <strong>0342.046.981</strong> ho&#7863;c truy c&#7853;p website.</p>");

        return assemble(header, wrapBody(body.toString()), buildFooter());
    }
}
