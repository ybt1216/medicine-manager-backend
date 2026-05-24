package com.example.repill.controller;

import com.example.repill.dto.SaveMedicineRecordRequest;
import com.example.repill.service.MedicineRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/medicine-records")
public class MedicineRecordController {

    private final MedicineRecordService medicineRecordService;

    @PostMapping
    public String save(@RequestBody SaveMedicineRecordRequest request) {
        medicineRecordService.saveRecords(request);
        return "저장 완료";
    }
}