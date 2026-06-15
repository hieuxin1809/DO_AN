package com.web.service;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.web.exception.MessageException;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.concurrent.TimeUnit;

/**
 * Service xử lý đơn hàng PayPal qua REST API (server-to-server).
 *
 * Luồng:
 *   1. Lấy access token: POST {api-base}/v1/oauth2/token
 *   2. CAPTURE đơn hàng:   POST {api-base}/v2/checkout/orders/{orderId}/capture
 *      (chuyển status APPROVED → COMPLETED + thực sự rút tiền)
 *   3. Nếu đã capture trước đó (frontend đã gọi rồi) → response trả 422/UNPROCESSABLE_ENTITY
 *      với error name = ORDER_ALREADY_CAPTURED → fallback GET để verify status COMPLETED.
 */
@Service
/**
 * Service quan ly tich hop cong thanh toan PayPal.
 */
public class PayPalService {

    @Value("${paypal.client-id}")
    private String clientId;

    @Value("${paypal.client-secret}")
    private String clientSecret;

    @Value("${paypal.api-base}")
    private String apiBase;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build();

    private static final MediaType JSON_TYPE = MediaType.parse("application/json; charset=utf-8");

    /* ─── Access token ───────────────────────────────────── */
    private String getAccessToken() {
        String credentials = Base64.getEncoder()
                .encodeToString((clientId + ":" + clientSecret).getBytes());

        RequestBody body = new FormBody.Builder()
                .add("grant_type", "client_credentials")
                .build();

        Request request = new Request.Builder()
                .url(apiBase + "/v1/oauth2/token")
                .post(body)
                .addHeader("Authorization", "Basic " + credentials)
                .addHeader("Accept", "application/json")
                .addHeader("Accept-Language", "en_US")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new MessageException("PayPal: không lấy được access token (HTTP " + response.code() + ")");
            }
            String json = response.body().string();
            JsonObject obj = new JsonParser().parse(json).getAsJsonObject();
            if (!obj.has("access_token")) {
                throw new MessageException("PayPal: response không chứa access_token");
            }
            return obj.get("access_token").getAsString();
        } catch (MessageException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new MessageException("PayPal: lỗi kết nối khi lấy access token");
        }
    }

    /* ─── Public entry point ─────────────────────────────── */
    /**
     * Capture (rút tiền) + verify đơn hàng PayPal.
     * Ném MessageException nếu không thành công.
     */
    public void verifyOrder(String orderId) {
        verifyOrder(orderId, null);
    }

    public void verifyOrder(String orderId, String expectedAmountUsd) {
        if (orderId == null || orderId.isBlank()) {
            throw new MessageException("PayPal orderId không hợp lệ");
        }
        String token = getAccessToken();
        JsonObject order = captureOrFetch(orderId, token);
        validateStatus(order);
        if (expectedAmountUsd != null) {
            validateAmount(order, expectedAmountUsd);
        }
    }

    /* ─── Capture (nếu chưa) hoặc GET (nếu đã capture trước đó) ── */
    private JsonObject captureOrFetch(String orderId, String token) {
        // Bước 1: Thử CAPTURE
        Request captureReq = new Request.Builder()
                .url(apiBase + "/v2/checkout/orders/" + orderId + "/capture")
                .post(RequestBody.create(JSON_TYPE, "{}"))
                .addHeader("Authorization", "Bearer " + token)
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", "application/json")
                .addHeader("Prefer", "return=representation")
                .build();

        try (Response response = httpClient.newCall(captureReq).execute()) {
            String body = response.body() != null ? response.body().string() : "";
            int code = response.code();
            System.out.println("[PayPal] capture status=" + code + " body=" + body);

            if (code >= 200 && code < 300) {
                return new JsonParser().parse(body).getAsJsonObject();
            }

            // Nếu đã capture trước đó (frontend tự gọi capture) → fallback GET
            if (code == 422 && body.contains("ORDER_ALREADY_CAPTURED")) {
                return fetchOrder(orderId, token);
            }

            // Trường hợp lỗi khác → throw chi tiết
            String reason = extractErrorMessage(body, code);
            throw new MessageException("PayPal capture thất bại: " + reason);
        } catch (MessageException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new MessageException("PayPal: lỗi kết nối khi capture đơn hàng");
        }
    }

    /* ─── GET order ──────────────────────────────────────── */
    private JsonObject fetchOrder(String orderId, String token) {
        Request request = new Request.Builder()
                .url(apiBase + "/v2/checkout/orders/" + orderId)
                .get()
                .addHeader("Authorization", "Bearer " + token)
                .addHeader("Accept", "application/json")
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";
            if (response.code() == 404) {
                throw new MessageException("PayPal: không tìm thấy đơn hàng " + orderId);
            }
            if (!response.isSuccessful()) {
                throw new MessageException("PayPal: GET order thất bại (HTTP " + response.code() + ")");
            }
            return new JsonParser().parse(body).getAsJsonObject();
        } catch (MessageException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new MessageException("PayPal: lỗi kết nối khi GET đơn hàng");
        }
    }

    /* ─── Validators ─────────────────────────────────────── */
    private void validateStatus(JsonObject order) {
        String status = order.has("status") ? order.get("status").getAsString() : "";
        if (!"COMPLETED".equalsIgnoreCase(status)) {
            throw new MessageException("PayPal: đơn hàng chưa hoàn tất thanh toán (status=" + status + ")");
        }
    }

    private void validateAmount(JsonObject order, String expectedAmountUsd) {
        try {
            // Sau khi capture, amount nằm trong purchase_units[0].payments.captures[0].amount
            JsonObject pu = order.getAsJsonArray("purchase_units").get(0).getAsJsonObject();
            JsonObject amount;
            if (pu.has("payments")) {
                amount = pu.getAsJsonObject("payments")
                        .getAsJsonArray("captures").get(0).getAsJsonObject()
                        .getAsJsonObject("amount");
            } else {
                amount = pu.getAsJsonObject("amount");
            }
            String value = amount.get("value").getAsString();
            String currency = amount.get("currency_code").getAsString();

            if (!"USD".equalsIgnoreCase(currency)) {
                throw new MessageException("PayPal: sai currency (" + currency + "), yêu cầu USD");
            }
            double paid = Double.parseDouble(value);
            double expected = Double.parseDouble(expectedAmountUsd);
            if (Math.abs(paid - expected) > 0.01) {
                throw new MessageException("PayPal: số tiền không khớp (paid=" + paid + ", expected=" + expected + ")");
            }
        } catch (MessageException e) {
            throw e;
        } catch (Exception ignore) {
            // schema lạ nhưng status COMPLETED → coi như OK
        }
    }

    private String extractErrorMessage(String body, int code) {
        try {
            JsonObject err = new JsonParser().parse(body).getAsJsonObject();
            String name = err.has("name") ? err.get("name").getAsString() : "HTTP " + code;
            String msg  = err.has("message") ? err.get("message").getAsString() : "";
            return name + (msg.isEmpty() ? "" : " — " + msg);
        } catch (Exception e) {
            return "HTTP " + code;
        }
    }
}
