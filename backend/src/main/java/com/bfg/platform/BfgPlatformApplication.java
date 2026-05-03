package com.bfg.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class BfgPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(BfgPlatformApplication.class, args);
    }
}
