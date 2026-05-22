package com.example.repill.controller;

import com.example.repill.dto.OcrAnalyzeResponse;
import com.example.repill.service.ClovaOcrService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/ocr")
public class OcrController {

    private final ClovaOcrService ocrService;

    @PostMapping("/analyze")
    public OcrAnalyzeResponse analyze(@RequestParam("file") MultipartFile file) {
        return ocrService.analyze(file);
    }
}