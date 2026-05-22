package com.example.repill.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MedicineAnalyzeResponse { //이미지 분석이 끝난 뒤 프론트에게 돌려줄 데이터 형태
    private Long recordId;
    private String message;
    private String imagePath;
    private AiExtractResult aiResult;
    private String notice;
}