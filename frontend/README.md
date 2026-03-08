# BFG Platform Frontend

## Стартиране на приложението

### Първоначална настройка (само при първо стартиране)

1. **Инсталиране на зависимости:**
   ```bash
   cd frontend
   npm install
   ```

2. **Генериране на API клиент от OpenAPI спецификацията:**
   ```bash
   npm run generate:api
   ```

### Стартиране на development server

```bash
cd frontend
npm start
```

Или директно:
```bash
npm start
```

Приложението ще стартира на: **http://localhost:4200**

### Важни бележки

1. **Backend трябва да е стартиран** на `http://localhost:8080` преди да стартирате frontend
2. При първо стартиране може да отнеме малко повече време за компилация
3. При промени в кода, приложението автоматично ще се презарежда (hot reload)

### Други полезни команди

- **Build за production:**
  ```bash
  npm run build
  ```

- **Watch mode (автоматичен rebuild при промени):**
  ```bash
  npm run watch
  ```

- **Регенериране на API клиент:**
  ```bash
  npm run generate:api
  ```

## Структура на проекта

- `src/app/core/` - Core services, guards, interceptors, API client (generated)
- `src/app/shared/` - Reusable компоненти
- `src/app/features/` - Feature modules (auth, home)
- `src/app/layout/` - Layout компоненти

API клиентът се генерира от backend OpenAPI (`backend/src/main/resources/static/openapi/`).

## Конфигурация

- **Development API URL:** `http://localhost:8080` (в `src/environments/environment.ts`)
- **Production API URL:** `https://api.bfg-platform.bg` (в `src/environments/environment.prod.ts`)
