package com.example.repill.controller;

import com.example.repill.dto.MedicineRecordResponse;
import com.example.repill.service.MedicineRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/medicine-records")
public class MedicineRecordController {

    private final MedicineRecordService medicineRecordService;

    @GetMapping
    public List<MedicineRecordResponse> getRecords() {
        return medicineRecordService.getRecords();
    }
}