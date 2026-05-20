package com.example.repill.controller;

import com.example.repill.dto.MedicineAnalyzeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.repill.service.MedicineAnalyzeService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/medicines")
public class MedicineAnalyzeController {

    private final MedicineAnalyzeService medicineAnalyzeService;

    @PostMapping(
            value = "/analyze",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public MedicineAnalyzeResponse analyzeMedicine(
            @RequestPart("image") MultipartFile image
    ) {
        return medicineAnalyzeService.analyze(image);
    }
}
