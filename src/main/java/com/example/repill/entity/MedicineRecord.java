package com.example.repill.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class MedicineRecord {//DB 테이블과 직접 연결되는 객체

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String imagePath;

    @Column(length = 1000)
    private String visibleText;

    private String imprint;
    private String color;
    private String shape;
    private String dosageForm;
    private Boolean hasScoreLine;

    @Column(length = 1000)
    private String packageText;

    private String expirationDate;
    private Double confidence;

    @Column(length = 2000)
    private String caution;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}