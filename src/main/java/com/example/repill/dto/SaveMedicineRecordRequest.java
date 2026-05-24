package com.example.repill.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class SaveMedicineRecordRequest {

    private String email;

    private String imagePath;

    private List<String> medicineNames;

    private Integer durationDays;

    private LocalDate completedDate;

    private Integer medicineCount;
}