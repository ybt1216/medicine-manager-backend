package com.example.repill.service;

import com.example.repill.dto.AiExtractResult;
import com.example.repill.dto.MedicineAnalyzeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class
        MedicineAnalyzeService {

    private final OpenAiVisionService openAiVisionService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public MedicineAnalyzeResponse analyze(MultipartFile image) {
        try {
            // 1. 업로드 폴더 생성
            Path dirPath = Path.of(uploadDir);
            Files.createDirectories(dirPath);

            // 2. 파일 이름 안전 처리
            String originalFilename = image.getOriginalFilename();
            if (originalFilename == null || originalFilename.isEmpty()) {
                throw new RuntimeException("파일 이름이 없습니다.");
            }

            String extension = getExtension(originalFilename);
            if (extension == null || extension.isEmpty()) {
                extension = "jpg"; // 기본값
            }

            String savedFilename = UUID.randomUUID() + "." + extension;

            // 3. 파일 저장
            Path savedPath = dirPath.resolve(savedFilename);
            image.transferTo(savedPath.toFile());

            // 4. OpenAI 분석
            AiExtractResult aiResult = openAiVisionService.analyzeImage(savedPath.toFile());

            // 5. 응답
            return MedicineAnalyzeResponse.builder()
                    .message("analysis completed")
                    .imagePath(savedPath.toString())
                    .aiResult(aiResult)
                    .notice("AI 분석 결과는 참고용입니다. 최종 약 식별은 공식 의약품 DB와 사용자 확인이 필요합니다.")
                    .build();

        } catch (Exception e) {
            e.printStackTrace(); // 디버깅용
            throw new RuntimeException("약 이미지 분석 중 오류가 발생했습니다.", e);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}