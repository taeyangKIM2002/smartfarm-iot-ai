package com.example.smart_farm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SmartFarmApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartFarmApplication.class, args);
	}

}
