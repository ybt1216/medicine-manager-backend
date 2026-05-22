package com.example.repill.repository;

import com.example.repill.entity.MedicineRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicineRecordRepository extends JpaRepository<MedicineRecord, Long> {
}