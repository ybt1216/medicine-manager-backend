package com.example.repill.service;

import com.example.repill.dto.AiExtractResult;
import com.example.repill.dto.MedicineAnalyzeResponse;
import com.example.repill.entity.MedicineRecord;
import com.example.repill.repository.MedicineRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicineAnalyzeService {

    private final OpenAiVisionService openAiVisionService;
    private final MedicineRecordRepository medicineRecordRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public MedicineAnalyzeResponse analyze(MultipartFile image) {
        try {
            if (image == null || image.isEmpty()) {
                throw new RuntimeException("이미지 파일이 비어 있습니다.");
            }

            Path uploadPath = Path.of(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            String originalFilename = image.getOriginalFilename();
            String extension = getExtension(originalFilename);
            String savedFilename = UUID.randomUUID() + "." + extension;

            Path savedPath = uploadPath.resolve(savedFilename);

            Files.copy(
                    image.getInputStream(),
                    savedPath,
                    StandardCopyOption.REPLACE_EXISTING
            );

            AiExtractResult aiResult = openAiVisionService.analyzeImage(savedPath.toFile());

            MedicineRecord record = new MedicineRecord();
            record.setImagePath(savedPath.toString());
            record.setVisibleText(joinList(aiResult.getVisibleText()));
            record.setImprint(aiResult.getImprint());
            record.setColor(aiResult.getColor());
            record.setShape(aiResult.getShape());
            record.setDosageForm(aiResult.getDosageForm());
            record.setHasScoreLine(aiResult.getHasScoreLine());
            record.setPackageText(joinList(aiResult.getPackageText()));
            record.setExpirationDate(aiResult.getExpirationDate());
            record.setConfidence(aiResult.getConfidence());
            record.setCaution(aiResult.getCaution());

            MedicineRecord savedRecord = medicineRecordRepository.save(record);

            return MedicineAnalyzeResponse.builder()
                    .recordId(savedRecord.getId())
                    .message("analysis completed")
                    .imagePath(savedPath.toString())
                    .aiResult(aiResult)
                    .notice("AI 분석 결과는 참고용입니다. 최종 약 식별은 공식 의약품 DB와 사용자 확인이 필요합니다.")
                    .build();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("약 이미지 분석 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    private String joinList(List<String> list) {
        if (list == null || list.isEmpty()) {
            return "";
        }
        return String.join(", ", list);
    }
}