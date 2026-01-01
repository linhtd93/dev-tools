# Deployment Guide - DevTools Pro

Hướng dẫn deploy ứng dụng DevTools Pro lên các hosting platform.

## 1. Build Production

```bash
cd fe
npm run build:prod
```

Output: Tạo folder `fe/dist/` chứa toàn bộ file tối ưu hóa
- `dist/index.html` - File HTML chính
- `dist/assets/` - JavaScript, CSS, images đã minify
- `dist/robots.txt`, `dist/sitemap.xml` - SEO files

## 2. Deploy lên Vercel (Recommended)

### 2.1 Setup Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login vào Vercel account
vercel login
```

### 2.2 Deploy

```bash
cd dev-tools/fe

# Deploy lần đầu (chọn project setup)
vercel

# Deploy update
vercel --prod
```

**Vercel tự động:**
- Nhận diện Vite project
- Build: `npm run build`
- Deploy: Tự động upload `/dist` folder
- Cấp domain tạm hoặc custom domain

**Output:**
```
Vercel URL: https://dev-tools-linhtd93.vercel.app
Custom: https://devtools.pro (nếu có domain)
```

### 2.3 Setup CI/CD tự động

Thêm vào `vercel.json` (đã có sẵn):
```json
{
  "buildCommand": "npm run build:prod",
  "outputDirectory": "dist"
}
```

Mỗi lần push lên GitHub → Vercel tự động build & deploy

---

## 3. Deploy lên Netlify

### 3.1 Setup Netlify

Cách 1: Connect GitHub
- Vào https://netlify.com
- Click "Add new site" → "Import an existing project"
- Connect GitHub repo
- Build settings:
  - Build command: `npm run build:prod`
  - Publish directory: `dist`

Cách 2: Upload thủ công
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=fe/dist
```

**Output:**
```
Netlify URL: https://dev-tools-prod.netlify.app
```

---

## 4. Deploy lên AWS S3 + CloudFront

### 4.1 Upload lên S3

```bash
# Install AWS CLI
brew install awscli

# Configure AWS credentials
aws configure
# Nhập: Access Key ID, Secret Access Key, Region (us-east-1)

# Build
npm run build:prod

# Upload to S3
aws s3 sync fe/dist s3://devtools-pro-bucket --delete --acl public-read

# Invalidate CloudFront cache (nếu dùng CloudFront)
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

**Output:**
```
https://devtools-pro-bucket.s3.amazonaws.com/index.html
hoặc qua CloudFront: https://d123456.cloudfront.net
```

---

## 5. Deploy lên Docker + Server (VPS/Dedicated)

### 5.1 Tạo Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY fe/package*.json ./
RUN npm ci
COPY fe . 
RUN npm run build:prod

# Runtime stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 5.2 Tạo nginx.conf

```nginx
server {
  listen 80;
  server_name devtools.pro;
  
  location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
  }
  
  # Cache static assets
  location ~* \.js$|\.css$|\.woff2$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### 5.3 Build & Run Docker

```bash
# Build image
docker build -t devtools-pro .

# Run container
docker run -d -p 80:80 --name devtools devtools-pro

# Access: http://localhost
```

### 5.4 Deploy lên VPS (DigitalOcean, Linode, etc.)

```bash
# SSH vào VPS
ssh root@your-server-ip

# Clone repo
git clone https://github.com/linhtd93/dev-tools.git
cd dev-tools

# Build & Run Docker
docker build -t devtools-pro .
docker run -d -p 80:80 --restart always --name devtools devtools-pro

# Setup SSL with Let's Encrypt (optional)
docker run --rm -it -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot certonly --standalone -d devtools.pro
```

---

## 6. CI/CD Pipeline - GitHub Actions

### 6.1 Tạo file `.github/workflows/deploy.yml`

```yaml
name: Build & Deploy

on:
  push:
    branches: [main, staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd fe && npm ci
      
      - name: Build
        run: cd fe && npm run build:prod
        env:
          VITE_ENVIRONMENT: production
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: fe
```

### 6.2 Setup Secrets

```bash
# Vào GitHub repo → Settings → Secrets and variables → Actions
# Thêm:
# - VERCEL_TOKEN (từ vercel tokens)
# - VERCEL_ORG_ID (từ vercel account)
# - VERCEL_PROJECT_ID (từ vercel project settings)
```

---

## 7. Domain Setup

### 7.1 Verify & Setup Domain

```bash
# Update DNS records tại domain provider (GoDaddy, Namecheap, etc.)

# Vercel
A Record: 76.76.19.136
CNAME: cname.vercel-dns.com

# Netlify  
CNAME: devtools-prod.netlify.app

# CloudFront
CNAME: d123456.cloudfront.net
```

### 7.2 SSL Certificate

- **Vercel**: Tự động (Let's Encrypt)
- **Netlify**: Tự động (Let's Encrypt)
- **AWS**: ACM Certificate Manager
- **VPS**: Certbot + Let's Encrypt

```bash
# Manual SSL setup
sudo certbot certonly --standalone -d devtools.pro -d www.devtools.pro
```

---

## 8. Monitoring & Logging

### 8.1 Analytics
- Google Analytics: Code đã có trong App.jsx
- Vercel Analytics: Tự động theo dõi

### 8.2 Error Tracking
```bash
# Sentry (Optional)
npm install @sentry/react @sentry/tracing

# Thêm vào main.jsx
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT
})
```

---

## 9. Performance Optimization

### 9.1 Kiểm tra bundle size
```bash
npm run build:prod
npm run preview  # Xem trên http://localhost:4173
```

### 9.2 Analytics
```bash
# Dùng Webpack Bundle Analyzer
npm install --save-dev webpack-bundle-analyzer
```

### 9.3 Caching Strategy
- Static assets (JS/CSS): Cache 1 năm
- HTML: No-cache, revalidate
- Images: Cache 30 ngày

---

## 10. Rollback & Versioning

### 10.1 Versioning
```bash
# Update version trong package.json
"version": "1.0.1"

# Tag in Git
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

### 10.2 Rollback Vercel
```bash
# Vào Vercel Dashboard → Deployments → Select previous version → Promote
# hoặc
vercel rollback
```

---

## Workflow Tóm tắt

```
1. Dev local:        npm run dev
2. Staging:          npm run stg
3. Build prod:       npm run build:prod
4. Test:             npm run preview
5. Commit & Push:    git push origin main
6. GitHub Actions:   Tự động build & deploy
7. Access:           https://devtools.pro
```

---

## Troubleshooting

| Lỗi | Giải pháp |
|-----|----------|
| Build fail | Kiểm tra: `npm run build:prod` locally |
| Routes 404 | Thêm `try_files` trong nginx/Vercel config |
| Assets 404 | Kiểm tra `base` trong vite.config.js |
| Slow load | Enable gzip, CDN, code splitting |
| CORS error | Kiểm tra API URL trong envConfig |

