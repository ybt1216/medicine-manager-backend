package com.example.repill.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MedicineAnalyzeResponse {
    private String message;
    private String imagePath;
    private AiExtractResult aiResult;
    private String notice;
}