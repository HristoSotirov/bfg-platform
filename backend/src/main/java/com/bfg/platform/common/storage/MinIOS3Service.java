package com.bfg.platform.common.storage;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;

@Service
@Slf4j
public class MinIOS3Service implements S3Service {

    private final MinioClient minioClient;
    private final String defaultBucketName;

    public MinIOS3Service(MinioClient minioClient, @Value("${s3.bucket-name:bfg-platform-photos}") String defaultBucketName) {
        this.minioClient = minioClient;
        this.defaultBucketName = defaultBucketName;
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
        // For MinIO, we construct the URL manually
        // In production with real S3, you might want to use presigned URLs
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

