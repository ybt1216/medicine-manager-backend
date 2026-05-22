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
public class OcrAnalyzeResponse {

    private String fullText;

    private List<String> medicineNames;

    private String prescribedDate;

    private Integer durationDays;

    private String completedDate;

    private List<String> cautions;

    private Integer medicineCount;
}