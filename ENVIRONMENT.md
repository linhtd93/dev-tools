# Environment Setup Guide

## Environments Supported

DevTools Pro hỗ trợ 3 environment: **Development**, **Staging**, và **Production**

### 1. Development Environment

```bash
npm run dev
```

- Port: `http://localhost:3000`
- Debug: ✅ Bật
- Log Level: `debug`
- Source Maps: ✅ Bật

### 2. Staging Environment

```bash
npm run stg
```

- API URL: `https://api-stg.devtools.pro`
- Debug: ✅ Bật (để test)
- Log Level: `info`
- Source Maps: ✅ Bật

### 3. Production Environment

```bash
npm run prod
```

- API URL: `https://api.devtools.pro`
- Debug: ❌ Tắt
- Log Level: `error`
- Source Maps: ❌ Tắt (bảo mật)

## Build Commands

### Build cho Development
```bash
npm run build:dev
```

### Build cho Staging
```bash
npm run build:stg
```

### Build cho Production
```bash
npm run build:prod
```

## Environment Variables

### File `.env.development` (Development)
```
VITE_APP_NAME=DevTools Pro
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### File `.env.staging` (Staging)
```
VITE_APP_NAME=DevTools Pro
VITE_API_URL=https://api-stg.devtools.pro
VITE_ENVIRONMENT=staging
VITE_ENABLE_DEBUG=true
VITE_LOG_LEVEL=info
```

### File `.env.production` (Production)
```
VITE_APP_NAME=DevTools Pro
VITE_API_URL=https://api.devtools.pro
VITE_ENVIRONMENT=production
VITE_ENABLE_DEBUG=false
VITE_LOG_LEVEL=error
```

## Usage trong Code

```javascript
import { config, currentEnv } from '@/config/envConfig'

console.log(currentEnv) // 'development' | 'staging' | 'production'
console.log(config.apiUrl) // API URL tương ứng
console.log(config.enableDebug) // True/False
```

## CI/CD Deployment

- **Dev**: Tự động deploy khi push vào `dev` branch
- **Staging**: Deploy manual từ `staging` branch
- **Production**: Deploy manual từ `main` branch (thường có tag version)

## Preview Production Build

```bash
npm run build:prod
npm run preview
```

Port preview: `http://localhost:4173`
