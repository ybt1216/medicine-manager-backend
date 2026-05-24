package com.example.repill.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import com.example.repill.dto.MedicineInfoDto;
import com.example.repill.dto.OcrAnalyzeResponse;
import com.example.repill.repository.MedicineRecordRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.UUID;

import java.util.List;
import java.util.ArrayList;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

@Service
@RequiredArgsConstructor
public class ClovaOcrService {

    @Value("${ocr.invoke-url}")
    private String invokeUrl;

    @Value("${ocr.secret-key}")
    private String secretKey;

    public OcrAnalyzeResponse analyze(MultipartFile file) {

        try {
            String boundary = "----" + UUID.randomUUID();

            URL url = new URL(invokeUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            conn.setUseCaches(false);
            conn.setDoInput(true);
            conn.setDoOutput(true);
            conn.setRequestMethod("POST");

            conn.setRequestProperty(
                    "Content-Type",
                    "multipart/form-data; boundary=" + boundary
            );

            conn.setRequestProperty("X-OCR-SECRET", secretKey);

            OutputStream outputStream = conn.getOutputStream();

            PrintWriter writer = new PrintWriter(
                    new OutputStreamWriter(outputStream, "UTF-8"),
                    true
            );

            String originalFilename = file.getOriginalFilename();

            byte[] fileBytes = file.getBytes();

            String uploadDir = "C:/uploads/";

            File dir = new File(uploadDir);

            if (!dir.exists()) {
                dir.mkdirs();
            }

            String savedFileName =
                    UUID.randomUUID() + "_" + originalFilename;

            File savedFile = new File(uploadDir + savedFileName);

            file.transferTo(savedFile);

            String extension = originalFilename
                    .substring(originalFilename.lastIndexOf(".") + 1)
                    .toLowerCase();

            if (extension.equals("jpeg")) {
                extension = "jpg";
            }

            // JSON message
            String jsonMessage = "{"
                    + "\"images\":[{\"format\":\"" + extension + "\",\"name\":\"demo\"}],"
                    + "\"requestId\":\"" + UUID.randomUUID() + "\","
                    + "\"version\":\"V2\","
                    + "\"timestamp\":" + System.currentTimeMillis()
                    + "}";

            // message part
            writer.append("--").append(boundary).append("\r\n");
            writer.append("Content-Disposition: form-data; name=\"message\"\r\n");
            writer.append("Content-Type: application/json\r\n\r\n");
            writer.append(jsonMessage).append("\r\n");

            // file part
            writer.append("--").append(boundary).append("\r\n");
            writer.append(
                    "Content-Disposition: form-data; name=\"file\"; filename=\""
                            + originalFilename + "\"\r\n"
            );

            writer.append("Content-Type: application/octet-stream\r\n\r\n");

            writer.flush();

            outputStream.write(fileBytes);

            outputStream.flush();

            writer.append("\r\n").flush();

            writer.append("--").append(boundary).append("--").append("\r\n");

            writer.close();

            int responseCode = conn.getResponseCode();

            InputStream is = responseCode >= 200 && responseCode < 300
                    ? conn.getInputStream()
                    : conn.getErrorStream();

            BufferedReader br = new BufferedReader(
                    new InputStreamReader(is, "UTF-8")
            );

            StringBuilder response = new StringBuilder();

            String line;

            while ((line = br.readLine()) != null) {
                response.append(line);
            }

            br.close();

            // JSON 파싱
            ObjectMapper mapper = new ObjectMapper();

            JsonNode root = mapper.readTree(response.toString());

            StringBuilder resultText = new StringBuilder();

            JsonNode fields = root
                    .path("images")
                    .get(0)
                    .path("fields");

            for (JsonNode field : fields) {

                resultText.append(
                        field.path("inferText").asText()
                );

                if (field.path("lineBreak").asBoolean()) {
                    resultText.append("\n");
                } else {
                    resultText.append(" ");
                }
            }

            String imagePath = "/uploads/" + savedFileName;

            String fullText = resultText.toString();

            String prescribedDate = extractDate(fullText);

            Integer durationDays = extractDurationDays(fullText);

            String completedDate = calculateCompletedDate(prescribedDate, durationDays);

            List<MedicineInfoDto> medicines = new ArrayList<>();

            List<String> medicineNames = extractMedicineNames(fullText); //약 이름 추출

            Integer medicineCount = medicines.size();

            return new OcrAnalyzeResponse(
                    fullText,
                    imagePath,
                    medicineNames,
                    medicines,
                    prescribedDate,
                    durationDays,
                    completedDate,
                    medicineCount
            );

        } catch (Exception e) {
            e.printStackTrace();

            return new OcrAnalyzeResponse(
                    null,
                    null,
                    new ArrayList<>(),
                    new ArrayList<>(),
                    null,
                    null,
                    null,
                    0
            );
        }
    }

    private String extractDate(String text) {
        Pattern pattern = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
        Matcher matcher = pattern.matcher(text);

        if (matcher.find()) {
            return matcher.group();
        }

        return null;
    }

    private Integer extractDurationDays(String text) {
        Pattern pattern = Pattern.compile("투약일수\\s*(\\d+)");
        Matcher matcher = pattern.matcher(text);

        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }

        return null;
    }

    private List<String> extractMedicineNames(String text) {
        List<String> result = new ArrayList<>();

        String[] lines = text.split("\\n");

        for (String line : lines) {
            String name = line.trim()
                    .replace("*", "")
                    .replace("비)", "")
                    .trim();

            if (name.isBlank()) continue;

            // 약 이름 패턴
            boolean looksLikeMedicine =
                    name.contains("정")
                            || name.contains("캡슐")
                            || name.contains("mg")
                            || name.contains("MG")
                            || name.contains("밀리그램")
                            || name.contains("밀리그람");

            if (!looksLikeMedicine) continue;

            // 성상/설명 제거
            if (name.contains("흰색")) continue;
            if (name.contains("황색")) continue;
            if (name.contains("분홍색")) continue;
            if (name.contains("연녹색")) continue;
            if (name.contains("정제")) continue;
            if (name.contains("경질캡슐")) continue;
            if (name.contains("보관")) continue;
            if (name.contains("주의")) continue;
            if (name.contains("복용")) continue;
            if (name.contains("감소")) continue;
            if (name.contains("개선")) continue;
            if (name.contains("완화")) continue;
            if (name.contains("촉진")) continue;
            if (name.contains("해소")) continue;
            if (name.contains("억제")) continue;
            if (name.contains("보호")) continue;

            // 너무 짧은 일반 단어 제거
            if (name.length() < 4) continue;
            if (name.equals("서방정")) continue;
            if (name.equals("안정")) continue;
            if (name.equals("위산")) continue;

            // 복약량/횟수/일수 문장 제거
            if (name.matches(".*\\d+정씩.*")) continue;
            if (name.matches(".*\\d+회.*")) continue;
            if (name.matches(".*\\d+일분.*")) continue;
            if (name.contains("씩")) continue;
            if (name.contains("일분")) continue;

            if (!result.contains(name)) {
                result.add(name);
            }
        }

        return result;
    }

    private String calculateCompletedDate(String prescribedDate, Integer durationDays) {
        if (prescribedDate == null || durationDays == null) {
            return null;
        }

        LocalDate date = LocalDate.parse(
                prescribedDate,
                DateTimeFormatter.ofPattern("yyyy-MM-dd")
        );

        return date.plusDays(durationDays).toString();
    }
}