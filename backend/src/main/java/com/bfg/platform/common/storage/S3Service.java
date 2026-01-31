package com.bfg.platform.common.storage;

import java.io.InputStream;

public interface S3Service {
    String uploadFile(String bucketName, String objectName, InputStream inputStream, String contentType, long contentLength);
    void deleteFile(String bucketName, String objectName);
    String getFileUrl(String bucketName, String objectName);
    boolean fileExists(String bucketName, String objectName);
}

