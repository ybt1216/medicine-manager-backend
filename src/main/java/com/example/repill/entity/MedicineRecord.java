package com.example.repill.entity;

import jakarta.persistence.*;
import lombok.*;
import org.apache.catalina.User;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineRecord {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id")
    private Profile profile;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String imagePath;

    private String ocrName;

    private String officialName;

    //@Lob
    private String effect;

    //@Lob
    private String usage;

    //@Lob
    private String caution;

    //@Lob
    private String storageMethod;

    private Integer durationDays;

    private LocalDate completedDate;

    private Integer medicineCount;
}