package com.project.saas_background_remover.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class PayService {

    @Value("${razorpay.api.key}")
    private String apiKey;

    @Value("${razorpay.api.secret}")
    private String apiSecret;

    //private static final Logger logger = LoggerFactory.getLogger(PayService.class);

    public String createOrder(int amount, String currency) throws RazorpayException {
        try {
            // Validate currency
            if (!"INR".equalsIgnoreCase(currency)) {
                throw new RazorpayException("Invalid currency. Only INR is supported.");
            }

            // Validate amount
            if (amount <= 0) {
                throw new RazorpayException("Amount must be greater than 0");
            }

            RazorpayClient razorpayClient = new RazorpayClient(apiKey, apiSecret);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amount * 100); // Convert to paise
            orderRequest.put("currency", currency.toUpperCase()); // Ensure uppercase
            orderRequest.put("receipt", "order_" + System.currentTimeMillis());

//            logger.info("Creating order with amount: {} paise, currency: {}", amount * 100, currency);
//            logger.info("Order request: {}", orderRequest.toString());

            Order order = razorpayClient.orders.create(orderRequest);

           // logger.info("Order created successfully: {}", order.toString());

            // Return properly formatted JSON response
            JSONObject response = new JSONObject();
            response.put("id", Optional.ofNullable(order.get("id")));
            response.put("amount", Optional.ofNullable(order.get("amount")));
            response.put("currency", Optional.ofNullable(order.get("currency")));
            response.put("status", Optional.ofNullable(order.get("status")));
            response.put("receipt", Optional.ofNullable(order.get("receipt")));

           // logger.info("Returning response: {}", response.toString());

            return response.toString();

        } catch (RazorpayException e) {
          //  logger.error("Razorpay order creation failed: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
           // logger.error("Unexpected error in order creation: {}", e.getMessage());
            throw new RazorpayException("Order creation failed: " + e.getMessage());
        }
    }

    public boolean verifyPayment(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        try {
            // Create signature verification string
            String generatedSignature = razorpayOrderId + "|" + razorpayPaymentId;

            // Use HMAC SHA256 to generate signature
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(apiSecret.getBytes(), "HmacSHA256");
            mac.init(secretKeySpec);

            byte[] hash = mac.doFinal(generatedSignature.getBytes());
            String expectedSignature = bytesToHex(hash).toLowerCase();

           // logger.info("Payment verification - Expected: {}, Received: {}", expectedSignature, razorpaySignature);

            return expectedSignature.equals(razorpaySignature);

        } catch (Exception e) {
            //logger.error("Payment verification failed: {}", e.getMessage());
            return false;
        }
    }

    // Helper method to convert bytes to hex string
    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
}