package testudo_picks.backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import testudo_picks.backend.logger.AppLogger;

@Service
public class CourseScraperScheduler {

    private static final Logger logger = AppLogger.getLogger(CourseScraperScheduler.class);

    private final Map<String, String> courseCache = new ConcurrentHashMap<>();
    private final List<String> courseTypes = List.of("FSAW", "FSAR", "FSMA", "FSOC", "FSPW", "DSHS", "DSHU", "DSNS", "DSNL", "DSSP", "DVCC", "DVUP", "SCIS");

    public String getCoursesByType(String type) {
        return courseCache.get(type);
    }



    // Runs every 30 minutes
    @Scheduled(fixedRate = 30 * 60 * 1000)
    public void runScraper() {
        for (String type : courseTypes) {
            try {
                ProcessBuilder pb = new ProcessBuilder("node", "scraper.js", type);
                pb.directory(new File("scraper"));

                Process process = pb.start();

                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                StringBuilder output = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line);
                }

                int exitCode = process.waitFor();

                if (exitCode == 0) {
                    courseCache.put(type, output.toString());
                    logger.info("Successful finished caching for {}", type);
                } else {
                    logger.error("Scraper failed for type: {} with output: {}", type, output);
                }

            } catch (Exception e) {
                logger.error("Error running scraper for type: {}", type, e);
            }
        }
        logger.info("FINISHED CACHING FOR ALL COURSE TYPES");
    }
}
