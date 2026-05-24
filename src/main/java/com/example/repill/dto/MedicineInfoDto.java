package com.example.repill.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MedicineInfoDto {

    // OCR로 읽은 약 이름
    private String ocrName;

    // 공공 API 공식 약 이름
    private String officialName;

    // 약효
    private String effect;

    // 복용방법
    private String usage;

    // 주의사항
    private String caution;

    // 보관방법
    private String storageMethod;
}