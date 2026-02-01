# BFG Platform - Платформа на Българската Федерация по Гребане

## Описание

BFG Platform е уеб-базирана платформа за управление на дейностите на Българската Федерация по Гребане. Системата предоставя пълноценно управление на клубове, спортисти, акредитации, снимки и потребители с различни роли и права за достъп.

## Функционалности

### Управление на потребители
- **Система за автентификация** с JWT токени (access и refresh токени)
- **Роли на потребителите:**
  - `APP_ADMIN` - Администратор на приложението
  - `FEDERATION_ADMIN` - Администратор на федерацията
  - `CLUB_ADMIN` - Администратор на клуб
  - `COACH` - Треньор
- Управление на потребители с различни права за достъп

### Управление на клубове
- Създаване, редактиране и изтриване на клубове
- Миграция на клубове
- Управление на треньори към клубове

### Управление на спортисти
- Създаване, редактиране и изтриване на спортисти
- Пълна информация за спортистите:
  - Лични данни (име, дата на раждане, пол)
  - Медицинска информация
  - Застраховка (от-до дати)

### Управление на снимки на спортисти
- Качване на снимки на спортисти
- История на снимки
- Съхранение в S3-съвместимо хранилище (MinIO)

### Управление на картотеки
- Създаване и управление на картотеки на спортисти
- Подновяване на картотеки
- Миграция на картотеки

### API и документация
- REST API с OpenAPI 3.0 спецификация
- Автоматично генериране на API клиенти
- Swagger UI за интерактивна документация
- Поддръжка на expand параметри за вложени ресурси
- Разширени query параметри (филтриране, търсене, сортиране, странициране)

## Технологии

### Backend
- **Java 17+**
- **Spring Boot 3.1.4**
  - Spring Web MVC
  - Spring Data JPA
  - Spring Security
  - Spring Validation
- **PostgreSQL 15** - Релационна база данни
- **Liquibase** - Управление на миграции на базата данни
- **MinIO** - S3-съвместимо обектно хранилище за файлове
- **JWT (JSON Web Tokens)** - Автентификация и авторизация
  - RS256 алгоритъм за подписване
  - Access токени (15 минути по подразбиране)
  - Refresh токени (7 дни по подразбиране)
- **OpenAPI Generator** - Генериране на API модели и интерфейси
- **SpringDoc OpenAPI** - Swagger UI интеграция
- **Lombok** - Намаляване на boilerplate код

### Инфраструктура
- **Docker & Docker Compose** - Контейнеризация на услуги
- **Maven** - Управление на зависимости и build процес

### Архитектура
- **Layered Architecture** (Controller → Service → Repository)
- **DTO Pattern** - Разделение на entity и DTO модели
- **Mapper Pattern** - Преобразуване между entity и DTO
- **Specification Pattern** - Динамични заявки с JPA Specifications
- **Query Adapter Pattern** - Парсиране и обработка на query параметри

## Структура на проекта

```
bfg-platform/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/bfg/platform/
│   │   │   │   ├── athlete/           # Управление на спортисти
│   │   │   │   ├── auth/              # Автентификация и JWT
│   │   │   │   ├── club/              # Управление на клубове
│   │   │   │   ├── user/              # Управление на потребители
│   │   │   │   ├── common/            # Общи компоненти
│   │   │   │   │   ├── exception/     # Обработка на грешки
│   │   │   │   │   ├── query/         # Query параметри и парсери
│   │   │   │   │   ├── security/      # Авторизация
│   │   │   │   │   └── storage/       # S3/MinIO интеграция
│   │   │   │   ├── config/            # Конфигурации
│   │   │   │   └── bootstrap/         # Инициализация на данни
│   │   │   └── resources/
│   │   │       ├── application.yaml  # Конфигурация
│   │   │       ├── db/changelog/     # Liquibase миграции
│   │   │       └── static/openapi/   # OpenAPI спецификация
│   │   └── test/                     # Тестове
│   ├── docker-compose.yml            # Docker Compose конфигурация
│   └── pom.xml                       # Maven конфигурация
└── frontend/                         # Frontend приложение (в разработка)
```

## Изисквания

- **Java 17 или по-нова версия**
- **Maven 3.6+**
- **Docker и Docker Compose** (за локална разработка)
- **PostgreSQL 15** (или използване на Docker контейнер)
- **MinIO** (или използване на Docker контейнер)

## Инсталация и стартиране

### 1. Клониране на проекта

```bash
git clone <repository-url>
cd bfg-platform
```

### 2. Стартиране на инфраструктурата с Docker Compose

От директорията `backend/` стартирайте PostgreSQL и MinIO:

```bash
cd backend
docker-compose up -d
```

Това ще стартира:
- **PostgreSQL** на порт `5434` (за да избегне конфликти с локален PostgreSQL)
- **MinIO** на портове `9000` (API) и `9001` (Console)

### 3. Конфигуриране на MinIO

1. Отворете MinIO Console: http://localhost:9001
2. Влезте с:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Създайте bucket с име `bfg-platform-photos`

### 4. Конфигуриране на базата данни

Базата данни се създава автоматично при първо стартиране на приложението чрез Liquibase миграции.

### 5. Стартиране на приложението

От директорията `backend/`:

```bash
mvn clean install
mvn spring-boot:run
```

### 6. Първоначална настройка

При първо стартиране системата автоматично създава администраторски потребител с:
- **Username:** `admin` (по подразбиране)
- **Password:** `admin123` (по подразбиране)

Тези стойности могат да бъдат променени чрез environment променливи или в `application.yaml`.

### 7. Достъп до приложението

- **API Base URL:** http://localhost:8080
- **Swagger UI:** http://localhost:8080/swagger-ui.html
- **API Docs:** http://localhost:8080/api-docs
- **OpenAPI Spec:** http://localhost:8080/openapi/openapi.yaml

## Конфигурация

### Environment променливи

Приложението поддържа конфигурация чрез environment променливи. Основните параметри:

#### База данни
```bash
DATABASE_URL=jdbc:postgresql://localhost:5434/bfg_platform
DATABASE_USERNAME=bfg_user
DATABASE_PASSWORD=bfg_password
```

#### JWT
```bash
JWT_ISSUER=bfg-platform
JWT_AUDIENCE=bfg-platform
JWT_ACCESS_TTL_SECONDS=900          # 15 минути
JWT_REFRESH_TTL_SECONDS=604800      # 7 дни
JWT_PRIVATE_KEY_PEM=<private-key>   # RSA private key (PEM формат)
JWT_PUBLIC_KEY_PEM=<public-key>     # RSA public key (PEM формат)
JWT_ALLOW_EPHEMERAL_KEYS=true       # За локална разработка
```

#### MinIO/S3
```bash
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=bfg-platform-photos
S3_REGION=us-east-1
```

#### Bootstrap (първоначална настройка)
```bash
BOOTSTRAP_TOKEN=local-dev
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=admin123
BOOTSTRAP_ADMIN_FIRST_NAME=App
BOOTSTRAP_ADMIN_LAST_NAME=Admin
```

#### Тестови данни
```bash
BFG_TEST_DATA_ENABLED=false
```

### Локална разработка

За локална разработка можете да използвате стойностите по подразбиране в `application.yaml`.
