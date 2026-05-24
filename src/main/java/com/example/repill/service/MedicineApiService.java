package com.example.repill.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class MedicineApiService {

    @Value("${drug.api.service-key}")
    private String serviceKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public JsonNode searchMedicine(String medicineName) {
        try {
            String decodedKey = URLDecoder.decode(serviceKey, StandardCharsets.UTF_8);

            URI uri = UriComponentsBuilder
                    .fromUriString("https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList")
                    .queryParam("serviceKey", decodedKey)
                    .queryParam("type", "json")
                    .queryParam("itemName", medicineName)
                    .queryParam("numOfRows", 1)
                    .queryParam("pageNo", 1)
                    .build()
                    .encode(StandardCharsets.UTF_8)
                    .toUri();

            System.out.println("API 검색어 = " + medicineName);
            System.out.println("API URL = " + uri);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .GET()
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString());

            System.out.println("API 응답 = " + response.body());

            JsonNode root = objectMapper.readTree(response.body());

            JsonNode items = root.path("body").path("items");

            if (items.isMissingNode() || items.isNull() || !items.isArray() || items.size() == 0) {
                items = root.path("response").path("body").path("items");
            }

            if (items.isMissingNode() || items.isNull() || !items.isArray() || items.size() == 0) {
                return null;
            }

            return items.get(0);

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}