package com.example.repill.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import com.example.repill.dto.OcrAnalyzeResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

            outputStream.write(file.getBytes());

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

            String fullText = resultText.toString();

            String prescribedDate = extractDate(fullText);

            Integer durationDays = extractDurationDays(fullText);

            String completedDate = calculateCompletedDate(prescribedDate, durationDays);

            List<String> medicineNames = extractMedicineNames(fullText);

            List<String> cautions = extractCautions(fullText);

            Integer medicineCount = medicineNames.size();

            return new OcrAnalyzeResponse(
                    fullText,
                    medicineNames,
                    prescribedDate,
                    durationDays,
                    completedDate,
                    cautions,
                    medicineCount
            );

        } catch (Exception e) {
            e.printStackTrace();

            return new OcrAnalyzeResponse(
                    null,
                    new ArrayList<>(),
                    null,
                    null,
                    null,
                    new ArrayList<>(),
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

        Pattern pattern = Pattern.compile(
                "[가-힣A-Za-z0-9*]+(정|캡슐|시럽|산|액|연고|크림|밀리그램|mg|MG)"
        );

        Matcher matcher = pattern.matcher(text);

        while (matcher.find()) {
            String name = matcher.group()
                    .replace("*", "")
                    .trim();

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
    private List<String> extractCautions(String text) {
        List<String> result = new ArrayList<>();

        String[] lines = text.split("\\n");

        for (String line : lines) {
            String trimmed = line.trim();

            if (trimmed.contains("주의")
                    || trimmed.contains("마세요")
                    || trimmed.contains("상의")
                    || trimmed.contains("알리세요")
                    || trimmed.contains("위장장애")
                    || trimmed.contains("녹내장")
                    || trimmed.contains("간질환")
                    || trimmed.contains("신장질환")
                    || trimmed.contains("음주")
                    || trimmed.contains("흡연")
                    || trimmed.contains("보관")) {

                if (!result.contains(trimmed)) {
                    result.add(trimmed);
                }
            }
        }

        return result;
    }


}