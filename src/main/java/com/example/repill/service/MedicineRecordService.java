package com.example.repill.service;

import com.example.repill.dto.SaveMedicineRecordRequest;
import com.example.repill.entity.MedicineRecord;
import com.example.repill.entity.Profile;
import com.example.repill.repository.MedicineRecordRepository;
import com.example.repill.repository.ProfileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.apache.catalina.User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MedicineRecordService {

    private final MedicineRecordRepository medicineRecordRepository;
    private final MedicineApiService medicineApiService;
    private final ProfileRepository profileRepository;

    public void saveRecords(SaveMedicineRecordRequest request) {

        System.out.println("saveRecords 실행됨");

        Profile profile = profileRepository.findByEmail(request.getEmail())
                .orElseThrow();

        for (String medicineName : request.getMedicineNames()) {

            String searchName = normalizeMedicineNameForApi(medicineName);

            JsonNode drugInfo = medicineApiService.searchMedicine(searchName);

            String officialName = null;
            String effect = null;
            String usage = null;
            String caution = null;
            String storageMethod = null;

            if (drugInfo != null && !drugInfo.isNull() && !drugInfo.isMissingNode()) {
                officialName = drugInfo.path("itemName").asText(null);
                effect = drugInfo.path("efcyQesitm").asText(null);
                usage = drugInfo.path("useMethodQesitm").asText(null);
                caution = drugInfo.path("atpnQesitm").asText(null);
                storageMethod = drugInfo.path("depositMethodQesitm").asText(null);

                effect = summarizeEffect(effect);
                usage = summarizeUsage(usage);
                caution = summarizeCaution(caution);
                storageMethod = summarizeStorage(storageMethod);            }

            MedicineRecord record = MedicineRecord.builder()
                    .profile(profile)
                    .ocrName(medicineName)
                    .officialName(officialName)
                    .effect(effect)
                    .usage(usage)
                    .caution(caution)
                    .storageMethod(storageMethod)
                    .durationDays(request.getDurationDays())
                    .completedDate(request.getCompletedDate())
                    .medicineCount(request.getMedicineCount())
                    .build();

            medicineRecordRepository.save(record);

            System.out.println("DB 저장 완료 = " + medicineName);
        }
    }

    private String normalizeMedicineNameForApi(String name) {
        return name
                .replace("mg", "밀리그램")
                .replace("MG", "밀리그램")
                .replace("밀리그람", "밀리그램")
                .replace(" ", "")
                .trim();
    }

    private String summarizeCaution(String caution) {

        if (caution == null) {
            return null;
        }

        StringBuilder summary = new StringBuilder();

        if (caution.contains("위장출혈")) {
            summary.append("위장출혈 주의\n");
        }

        if (caution.contains("임부")) {
            summary.append("임부 복용 주의\n");
        }

        if (caution.contains("수유")) {
            summary.append("수유 중 복용 주의\n");
        }

        if (caution.contains("운전")) {
            summary.append("운전 및 기계조작 주의\n");
        }

        if (caution.contains("알코올")) {
            summary.append("음주 주의\n");
        }

        if (caution.contains("천식")) {
            summary.append("천식 환자 주의\n");
        }

        if (caution.contains("고혈압")) {
            summary.append("고혈압 환자 주의\n");
        }

        if (summary.isEmpty()) {
            return "복용 전 주의사항 확인";
        }

        return summary.toString().trim();
    }

    private String summarizeEffect(String effect) {

        if (effect == null) {
            return null;
        }

        if (effect.contains("염증")) {
            return "염증·통증 완화";
        }

        if (effect.contains("위산")) {
            return "위산 억제";
        }

        if (effect.contains("해열")) {
            return "해열·진통";
        }

        return effect.length() > 30
                ? effect.substring(0, 30) + "..."
                : effect;
    }

    private String summarizeUsage(String usage) {

        if (usage == null) {
            return null;
        }

        if (usage.contains("1일")) {

            int end = usage.indexOf("복용");

            if (end != -1) {
                return usage.substring(0, end + 2);
            }
        }

        return usage.length() > 40
                ? usage.substring(0, 40) + "..."
                : usage;
    }

    private String summarizeStorage(String storage) {

        if (storage == null) {
            return null;
        }

        if (storage.contains("실온")) {
            return "실온 보관";
        }

        if (storage.contains("냉장")) {
            return "냉장 보관";
        }

        return storage.length() > 20
                ? storage.substring(0, 20) + "..."
                : storage;
    }

}