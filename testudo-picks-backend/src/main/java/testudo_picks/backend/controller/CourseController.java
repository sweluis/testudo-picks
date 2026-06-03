package testudo_picks.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import testudo_picks.backend.service.CourseScraperScheduler;
import org.slf4j.Logger;
import testudo_picks.backend.logger.AppLogger;


@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseScraperScheduler scraper;

    private static final Logger logger = AppLogger.getLogger(CourseController.class);

    public CourseController(CourseScraperScheduler scraper) {
        this.scraper = scraper;
    }

    @GetMapping("/test")
    public String getTest() {
        logger.info("GET /api/courses/test called");
        return "TEST SUCCESS";
    }

    @GetMapping("/{type}")
    public ResponseEntity<String> getCourses(@PathVariable String type) {
        logger.info("GET /api/courses/{} called", type);
        String data = scraper.getCoursesByType(type);

        if (data == null) {
            logger.warn("No data found for type: {}", type);
            return ResponseEntity.notFound().build();
        }

        logger.info("Successfully returned data for type: {}", type);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(data);
    }
}