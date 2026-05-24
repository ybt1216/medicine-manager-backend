package com.example.repill.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OcrAnalyzeResponse { //OCR 분석 전체 결과

    private String fullText;

    private String imagePath;

    private List<String> medicineNames;

    private List<MedicineInfoDto> medicines;

    private String prescribedDate;

    private Integer durationDays;

    private String completedDate;

    private Integer medicineCount;
}