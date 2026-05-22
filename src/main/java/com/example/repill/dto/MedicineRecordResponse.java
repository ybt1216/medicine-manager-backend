package com.example.repill.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import com.example.repill.entity.MedicineRecord;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@JsonPropertyOrder({
        "id",
        "imagePath",
        "visibleText",
        "imprint",
        "color",
        "shape",
        "dosageForm",
        "hasScoreLine",
        "packageText",
        "expirationDate",
        "confidence",
        "caution",
        "createdAt"
})

@Getter
@Builder
public class MedicineRecordResponse { //기록 조회 API의 응답 DTO

    private Long id;
    private String imagePath;
    private String visibleText;
    private String imprint;
    private String color;
    private String shape;
    private String dosageForm;
    private Boolean hasScoreLine;
    private String packageText;
    private String expirationDate;
    private Double confidence;
    private String caution;
    private LocalDateTime createdAt;

    public static MedicineRecordResponse from(MedicineRecord record) {
        return MedicineRecordResponse.builder()
                .id(record.getId())
                .imagePath(record.getImagePath())
                .visibleText(record.getVisibleText())
                .imprint(record.getImprint())
                .color(record.getColor())
                .shape(record.getShape())
                .dosageForm(record.getDosageForm())
                .hasScoreLine(record.getHasScoreLine())
                .packageText(record.getPackageText())
                .expirationDate(record.getExpirationDate())
                .confidence(record.getConfidence())
                .caution(record.getCaution())
                .createdAt(record.getCreatedAt())
                .build();
    }
}