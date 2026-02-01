package com.bfg.platform.common.storage;

import com.bfg.platform.common.exception.ValidationException;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Service
@Slf4j
public class MinIOS3Service implements S3Service {

    private final MinioClient minioClient;
    private final String defaultBucketName;
    
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    public MinIOS3Service(MinioClient minioClient, @Value("${s3.bucket-name:bfg-platform-photos}") String defaultBucketName) {
        this.minioClient = minioClient;
        this.defaultBucketName = defaultBucketName;
    }
    
    @Override
    public String uploadImageFile(FileType fileType, UUID entityId, MultipartFile file) throws java.io.IOException {
        validateImageFile(file, fileType.getDisplayName());
        
        String objectName = generateObjectName(fileType.getPathPrefix(), entityId, file.getOriginalFilename());
        
        String contentType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
        
        return uploadFile(fileType.getBucket().getName(), objectName, file.getInputStream(), contentType, file.getSize());
    }
    
    private void validateImageFile(MultipartFile file, String fileTypeName) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException(fileTypeName + " is required");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ValidationException("File size exceeds 10MB limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/"))) {
            throw new ValidationException("File must be an image");
        }
    }
    
    private String generateObjectName(String pathPrefix, UUID entityId, String originalFilename) {
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
        return String.format("%s/%s/%s%s", pathPrefix, entityId, UUID.randomUUID(), extension);
    }

    @Override
    public String uploadFile(String bucketName, String objectName, InputStream inputStream, String contentType, long contentLength) {
        try {
            String bucket = bucketName != null ? bucketName : defaultBucketName;
            ensureBucketExists(bucket);

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .stream(inputStream, contentLength, -1)
                            .contentType(contentType)
                            .build()
            );

            return getFileUrl(bucket, objectName);
        } catch (Exception e) {
            log.error("Error uploading file to S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }

    @Override
    public void deleteFile(String bucketName, String objectName) {
        try {
            String bucket = bucketName != null ? bucketName : defaultBucketName;
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            log.error("Error deleting file from S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete file from S3", e);
        }
    }

    @Override
    public String getFileUrl(String bucketName, String objectName) {
        String bucket = bucketName != null ? bucketName : defaultBucketName;
        return String.format("/%s/%s", bucket, objectName);
    }

    @Override
    public boolean fileExists(String bucketName, String objectName) {
        try {
            String bucket = bucketName != null ? bucketName : defaultBucketName;
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public InputStream getFile(String bucketName, String objectName) {
        try {
            String bucket = bucketName != null ? bucketName : defaultBucketName;
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            log.error("Error getting file from S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get file from S3", e);
        }
    }

    @Override
    public String getFileContentType(String bucketName, String objectName) {
        try {
            String bucket = bucketName != null ? bucketName : defaultBucketName;
            var stat = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
            return stat.contentType() != null ? stat.contentType() : "application/octet-stream";
        } catch (Exception e) {
            log.error("Error getting file content type from S3: {}", e.getMessage(), e);
            return "application/octet-stream";
        }
    }

    private void ensureBucketExists(String bucketName) {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }
        } catch (Exception e) {
            log.error("Error ensuring bucket exists: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to ensure bucket exists", e);
        }
    }
}

