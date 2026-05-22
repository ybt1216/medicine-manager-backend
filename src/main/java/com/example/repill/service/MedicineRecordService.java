package com.example.repill.service;

import com.example.repill.dto.MedicineRecordResponse;
import com.example.repill.repository.MedicineRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicineRecordService {

    private final MedicineRecordRepository medicineRecordRepository;

    public List<MedicineRecordResponse> getRecords() {
        return medicineRecordRepository.findAll()
                .stream()
                .map(MedicineRecordResponse::from)
                .toList();
    }
}