package com.project.saas_background_remover.controller;

import com.project.saas_background_remover.service.PayService;
import com.project.saas_background_remover.service.Service;
import com.razorpay.RazorpayException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;


//key id rzp_test_VvOgTdmVcaIn3F
//key secret X3nrrfeH1Ir8gXxwTwNMf9u1
@RestController
@RequestMapping("/api/image")
@CrossOrigin("*")
public class Controller {
    private final Service service;
    public Controller(Service service) {
        this.service = service;
    }
    private final String CLIPDROP_URL = "https://clipdrop-api.co/remove-background/v1";
    private final String CLIPDROP_API_KEY = "a659d207e9803640e69e4d5d319b3e893922fe79109aebfa64d9c2adeb7838ad6345213b7ed8d9c93a0aeb05c40ff066";
    @PostMapping("/remove")
    public ResponseEntity<?> removeBackground(@RequestParam("file") MultipartFile file) throws IOException {
        try {
            HttpHeaders httpHeaders = new HttpHeaders();
            httpHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
            httpHeaders.set("x-api-key", CLIPDROP_API_KEY);
            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image_file", resource);
            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, httpHeaders);
            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    CLIPDROP_URL, HttpMethod.POST, request, byte[].class
            );
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(response.getBody());
        } catch (Exception e) {
            System.out.println(e.getStackTrace());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error removing background: " + e.getMessage());
        }
        }


        @Autowired
        private PayService payService;

        @PostMapping("/create-order")
        public String createOrder(@RequestParam int amount,@RequestParam String currency) throws RazorpayException {
            return payService.createOrder(amount,currency);
        }
    }

