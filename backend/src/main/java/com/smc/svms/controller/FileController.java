package com.smc.svms.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Value("${app.qr-code-dir}")
    private String qrCodeDir;

    @Value("${app.upload-dir}")
    private String uploadDir;

    @GetMapping("/qr-codes/{fileName:.+}")
    public ResponseEntity<Resource> getQrCode(@PathVariable String fileName) {
        return serveFile(qrCodeDir, fileName, MediaType.IMAGE_PNG);
    }

    @GetMapping("/violations/{fileName:.+}")
    public ResponseEntity<Resource> getViolationImage(@PathVariable String fileName) {
        return serveFile(uploadDir, fileName, MediaType.IMAGE_JPEG);
    }

    private ResponseEntity<Resource> serveFile(String directory, String fileName, MediaType mediaType) {
        try {
            Path path = Paths.get(directory).resolve(fileName);
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(mediaType)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
