# ---- Stage 1: Build the Spring Boot JAR ----
FROM maven:3.9.6-eclipse-temurin-17 AS builder

WORKDIR /app

COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests


# ---- Stage 2: Run with Java 17 and Node.js ----
FROM eclipse-temurin:17-jdk

# Install Node.js 20
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    node --version && \
    npm --version

WORKDIR /app

# Copy built JAR from builder
COPY --from=builder /app/target/*.jar app.jar

# Copy the scraper folder
COPY scraper /app/scraper

# Install Node dependencies
WORKDIR /app/scraper
RUN npm install --production

# Back to app root
WORKDIR /app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
