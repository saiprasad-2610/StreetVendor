package com.smc.svms.config;

import com.smc.svms.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final UserService userService;

    @Bean
    public CommandLineRunner initData(DataSource dataSource) {
        return args -> {
            userService.createDefaultAdmin();

            // Force remove NOT NULL constraint from reported_by column using raw JDBC
            try (java.sql.Connection conn = dataSource.getConnection();
                 java.sql.Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE violations MODIFY COLUMN reported_by BIGINT NULL");
                log.info("Successfully altered reported_by column to NULL");
            } catch (Exception e) {
                log.warn("Could not alter reported_by column: " + e.getMessage());
            }
        };
    }
}
