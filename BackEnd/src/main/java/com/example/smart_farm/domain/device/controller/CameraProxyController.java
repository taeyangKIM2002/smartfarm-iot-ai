package com.example.smart_farm.domain.device.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@RestController
@RequestMapping("/api/v1/camera/hls")
public class CameraProxyController {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    @Value("${camera.hls-base-url:http://100.75.241.5/hls}")
    private String hlsBaseUrl;

    @GetMapping("/stream.m3u8")
    public ResponseEntity<String> proxyManifest() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(hlsBaseUrl + "/stream.m3u8"))
                .timeout(Duration.ofSeconds(5))
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        String body = response.body().replaceAll("(?m)^(stream\\d+\\.ts)$", "/api/v1/camera/hls/$1");

        return ResponseEntity.status(response.statusCode())
                .contentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"))
                .cacheControl(CacheControl.noCache())
                .body(body);
    }

    @GetMapping("/{segmentName:.+\\.ts}")
    public ResponseEntity<byte[]> proxySegment(@PathVariable String segmentName) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(hlsBaseUrl + "/" + segmentName))
                .timeout(Duration.ofSeconds(5))
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .GET()
                .build();

        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

        return ResponseEntity.status(response.statusCode())
                .contentType(MediaType.parseMediaType("video/mp2t"))
                .cacheControl(CacheControl.noCache())
                .body(response.body());
    }
}
