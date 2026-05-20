package com.example.repill.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import com.example.repill.dto.AiExtractResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OpenAiVisionService {

    @Value("${openai.api-key}")
    private String apiKey;

    @Value("${openai.model}")
    private String model;

    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public AiExtractResult analyzeImage(File imageFile) {
        try {
            String base64Image = Base64.getEncoder()
                    .encodeToString(Files.readAllBytes(imageFile.toPath()));

            String prompt = """
                    너는 약 사진에서 식별 정보를 추출하는 보조 시스템이다.

                    중요:
                    - 진단하지 마라.
                    - 복용법을 지시하지 마라.
                    - 약 이름을 확정하지 마라.
                    - 사진에서 보이는 정보만 추출해라.
                    - 반드시 JSON만 반환해라.

                    반환 형식:
                    {
                      "visibleText": [],
                      "imprint": null,
                      "color": null,
                      "shape": null,
                      "dosageForm": null,
                      "hasScoreLine": null,
                      "packageText": [],
                      "expirationDate": null,
                      "confidence": 0.0,
                      "caution": ""
                    }
                    """;

            var contentArray = objectMapper.createArrayNode()
                    .add(objectMapper.createObjectNode()
                            .put("type", "input_text")
                            .put("text", prompt))
                    .add(objectMapper.createObjectNode()
                            .put("type", "input_image")
                            .put("image_url", "data:image/jpeg;base64," + base64Image));

            var inputArray = objectMapper.createArrayNode()
                    .add(objectMapper.createObjectNode()
                            .put("role", "user")
                            .set("content", contentArray));

            var body = objectMapper.createObjectNode()
                    .put("model", model)
                    .set("input", inputArray);

            String requestBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/responses"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() == 429) { //더미 데이터
                return dummyResult();
            }

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return errorResult("OpenAI API 오류: " + response.statusCode() + " / " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());

            String outputText = root.get("output").get(0)
                    .get("content").get(0)
                    .get("text")
                    .asText();

            return objectMapper.readValue(outputText, AiExtractResult.class);

        } catch (Exception e) {
            return errorResult("AI 분석 실패: " + e.getMessage());
        }
    }
    //더미 데이터
    private AiExtractResult dummyResult() {
        AiExtractResult result = new AiExtractResult();
        result.setVisibleText(List.of("TYLENOL", "500"));
        result.setImprint("TYLENOL 500");
        result.setColor("white");
        result.setShape("round");
        result.setDosageForm("tablet");
        result.setHasScoreLine(false);
        result.setPackageText(List.of("타이레놀", "500mg"));
        result.setExpirationDate(null);
        result.setConfidence(0.8);
        result.setCaution("개발용 더미 응답입니다. 실제 AI 분석 결과가 아닙니다.");
        return result;
    }

    private AiExtractResult errorResult(String message) {
        AiExtractResult result = new AiExtractResult();
        result.setVisibleText(List.of());
        result.setPackageText(List.of());
        result.setConfidence(0.0);
        result.setCaution(message);
        return result;
    }
}