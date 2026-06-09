# 1단계: 빌드 스테이지 (JDK 21)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# 빌드 파일 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
COPY src src

# 실행 권한 부여 및 빌드 (테스트 제외)
RUN chmod +x ./gradlew
RUN ./gradlew clean bootJar -x test --no-daemon

# 2단계: 실행 스테이지 (JRE 21 Alpine)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 빌드 결과물 복사
COPY --from=build /app/build/libs/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]