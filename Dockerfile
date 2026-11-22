# ==============================================================================
# Learnability Pro - Backend Container Image
# Base: Eclipse Temurin JRE 21 on Alpine Linux (multi-arch: amd64, arm64)
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create unprivileged user and upload directory
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/uploads/pdfs && chown -R appuser:appgroup /app

ARG JAR_FILE=app.jar
COPY ${JAR_FILE} app.jar

USER appuser

EXPOSE 8080 28475

ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"
ENV PORT=28475

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
