package com.project.saas_background_remover.dto;

public class CreateOrderRequest {
    private int amount;
    private String currency;
    private String planId;

    // Constructors
    public CreateOrderRequest() {}

    public CreateOrderRequest(int amount, String currency, String planId) {
        this.amount = amount;
        this.currency = currency;
        this.planId = planId;
    }

    // Getters and Setters
    public int getAmount() { return amount; }
    public void setAmount(int amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }
}
