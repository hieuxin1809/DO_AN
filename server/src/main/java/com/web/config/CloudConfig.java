package com.web.config;


import com.cloudinary.Cloudinary;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
@SpringBootApplication
public class CloudConfig {

    @Bean
    public Cloudinary cloudinaryConfigs() {
        Cloudinary cloudinary = null;
        Map config = new HashMap();
        config.put("cloud_name", "di44iopzn");
        config.put("api_key", "137934361277596");
        config.put("api_secret", "yIWq9InAXFLF-hZRvQKc47y9DdM");
        cloudinary = new Cloudinary(config);
        return cloudinary;
    }

}
