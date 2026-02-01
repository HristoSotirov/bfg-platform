package com.bfg.platform.common.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

public interface S3Service {
    
    enum Bucket {
        PHOTOS("bfg-platform-photos"),
        LOGOS("bfg-platform-logos");
        
        private final String name;
        
        Bucket(String name) {
            this.name = name;
        }
        
        public String getName() {
            return name;
        }
    }
    
    enum FileType {
        ATHLETE_PHOTO(Bucket.PHOTOS, "athletes", "Photo file"),
        CLUB_LOGO(Bucket.LOGOS, "clubs/logo", "Logo file");
        
        private final Bucket bucket;
        private final String pathPrefix;
        private final String displayName;
        
        FileType(Bucket bucket, String pathPrefix, String displayName) {
            this.bucket = bucket;
            this.pathPrefix = pathPrefix;
            this.displayName = displayName;
        }
        
        public Bucket getBucket() {
            return bucket;
        }
        
        public String getPathPrefix() {
            return pathPrefix;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    String uploadImageFile(FileType fileType, UUID entityId, MultipartFile file) throws java.io.IOException;
    
    String uploadFile(String bucketName, String objectName, InputStream inputStream, String contentType, long contentLength);
    void deleteFile(String bucketName, String objectName);
    String getFileUrl(String bucketName, String objectName);
    boolean fileExists(String bucketName, String objectName);
    InputStream getFile(String bucketName, String objectName);
    String getFileContentType(String bucketName, String objectName);
}

