package com.example.repill.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AiExtractResult {
    private List<String> visibleText;
    private String imprint;
    private String color;
    private String shape;
    private String dosageForm;
    private Boolean hasScoreLine;
    private List<String> packageText;
    private String expirationDate;
    private Double confidence;
    private String caution;
}