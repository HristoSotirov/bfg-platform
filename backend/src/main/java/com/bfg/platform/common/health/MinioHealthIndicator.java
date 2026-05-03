package com.bfg.platform.common.health;

import io.minio.BucketExistsArgs;
import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class MinioHealthIndicator implements HealthIndicator {

    private final MinioClient minioClient;
    private final String bucketName;

    public MinioHealthIndicator(MinioClient minioClient, @Value("${s3.bucket-name}") String bucketName) {
        this.minioClient = minioClient;
        this.bucketName = bucketName;
    }

    @Override
    public Health health() {
        try {
            boolean exists = minioClient.bucketExists(
                BucketExistsArgs.builder().bucket(bucketName).build());
            if (exists) {
                return Health.up()
                    .withDetail("service", "MinIO/S3")
                    .withDetail("bucket", bucketName)
                    .build();
            }
            return Health.down()
                .withDetail("service", "MinIO/S3")
                .withDetail("error", "Bucket '" + bucketName + "' does not exist")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("service", "MinIO/S3")
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
