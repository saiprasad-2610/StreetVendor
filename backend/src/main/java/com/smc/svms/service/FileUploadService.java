package com.smc.svms.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileUploadService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FileUploadService.class);
    
    private final String uploadDir = "uploads/";

    public String uploadImage(MultipartFile file, String subfolder) {
        try {
            // Create directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir + subfolder);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(filename);

            // Save file
            Files.copy(file.getInputStream(), filePath);

            log.info("File uploaded successfully: {}", filename);
            return "/api/uploads/" + subfolder + "/" + filename;

        } catch (IOException e) {
            log.error("Failed to upload file", e);
            throw new RuntimeException("Failed to upload file: " + e.getMessage());
        }
    }

    public java.util.List<String> uploadMultipleImages(java.util.List<MultipartFile> files, String subfolder) {
        return files.stream()
                .map(file -> uploadImage(file, subfolder))
                .collect(java.util.stream.Collectors.toList());
    }
}
