# GitHub Actions Setup Guide

## 1. Setup Secrets

Vào repository GitHub → **Settings** → **Secrets and variables** → **Actions**

### 1.1 Vercel Secrets

Cần cấp 3 giá trị từ Vercel:

```bash
# Lấy VERCEL_TOKEN
# Vào https://vercel.com/account/tokens
# Tạo token mới, copy value

# Lấy VERCEL_ORG_ID
# Deploy một lần: vercel --prod
# Check file .vercel/project.json
```

**Thêm secrets vào GitHub:**

| Secret Name | Value |
|------------|-------|
| `VERCEL_TOKEN` | Token từ Vercel account |
| `VERCEL_ORG_ID` | Organization ID từ Vercel |
| `VERCEL_PROJECT_ID` | Project ID cho production |
| `VERCEL_PROJECT_ID_STAGING` | Project ID cho staging (optional) |

### 1.2 Slack Notification (Optional)

```bash
# Lấy SLACK_WEBHOOK
# Vào Slack workspace → Apps → Incoming Webhooks
# Tạo webhook mới, copy URL
```

**Thêm vào GitHub:**
| Secret Name | Value |
|------------|-------|
| `SLACK_WEBHOOK` | Webhook URL từ Slack |

---

## 2. Get Vercel IDs

### 2.1 Login & Deploy Local

```bash
cd fe
npm install -g vercel
vercel login
vercel --prod
```

### 2.2 Extract from .vercel/project.json

```bash
cat .vercel/project.json
```

Output:
```json
{
  "projectId": "prj_xxxxxxxxxxxxxxxx",
  "orgId": "team_xxxxxxxxxxxxxxxx"
}
```

Các ID này chính là:
- `projectId` → `VERCEL_PROJECT_ID`
- `orgId` → `VERCEL_ORG_ID`

### 2.3 Get Vercel Token

```bash
# https://vercel.com/account/tokens
# Create new token → Copy → Add to GitHub Secrets
```

---

## 3. Workflows Hoạt động

### 3.1 deploy.yml - Main workflow

**Trigger khi:**
- Push vào `main` → Deploy production
- Push vào `staging` → Deploy staging
- PR vào `main` hoặc `staging` → Build test

**Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies (`npm ci`)
4. Lint code
5. Build: `npm run build:prod`
6. Deploy to Vercel

**Output:**
```
✅ Build successful
✅ Deploy to production: https://devtools.pro
```

### 3.2 test.yml - Tests & Quality

**Runs:**
- ESLint/Prettier (nếu có)
- Unit tests (nếu có)
- Security audit: `npm audit`

---

## 4. Cách sử dụng

### 4.1 Development Workflow

```bash
# 1. Làm features trên branch
git checkout -b feature/new-tool
# ... code ...
git add .
git commit -m "Add new feature"

# 2. Push branch
git push origin feature/new-tool

# 3. Create Pull Request
# → GitHub Actions tự động chạy test & build

# 4. Merge PR vào main
# → GitHub Actions deploy to production

# 5. Check deployment
# https://github.com/linhtd93/dev-tools/actions
```

### 4.2 View Workflow Status

**GitHub:**
- Vào repo → **Actions** tab
- Xem danh sách workflows
- Click workflow để xem details

**Real-time:**
```bash
# Terminal
gh run list --repo linhtd93/dev-tools
gh run view <run-id>
```

---

## 5. Environment Variables

**Workflows sử dụng từ:**

1. **Secrets (từ GitHub):**
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

2. **Repo Secrets:**
   - `SLACK_WEBHOOK` (optional)

3. **Environment (từ .env files):**
   - `VITE_ENVIRONMENT=production`
   - `VITE_API_URL` (tự động chọn theo mode)

---

## 6. Troubleshooting

### Build Failed

```bash
# Check locally trước
npm run build:prod

# Nếu lỗi, debug:
cd fe
npm ci
npm run build:prod
```

### Deploy Failed

**Error: "VERCEL_TOKEN invalid"**
```bash
# Check token valid tại: https://vercel.com/account/tokens
# Re-generate token & update GitHub Secret
```

**Error: "projectId not found"**
```bash
# Verify VERCEL_PROJECT_ID & VERCEL_ORG_ID
# Deploy local: vercel --prod
# Check .vercel/project.json
```

**Error: "Routes 404"**
```bash
# Vercel auto-detect SPA routing
# Check vercel.json có rewrites
```

### Slack Notification Failed

```bash
# Test webhook: curl -X POST -d '{"text":"test"}' <webhook-url>
# Check SLACK_WEBHOOK secret format
```

---

## 7. Advanced Configuration

### 7.1 Schedule Workflow (Cron)

Tạo file `.github/workflows/schedule.yml`:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check app health
        run: curl -f https://devtools.pro || exit 1
```

### 7.2 Manual Trigger

Thêm vào workflow:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        default: 'staging'
```

Vào Actions → Select workflow → "Run workflow"

### 7.3 Deploy to Multiple Platforms

```yaml
- name: Deploy to Netlify
  uses: nwtgck/actions-netlify@v2
  with:
    publish-dir: './fe/dist'
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Deploy to AWS S3
  uses: jakejarvis/s3-sync-action@master
  with:
    args: --acl public-read --delete
  env:
    AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
```

---

## 8. Monitoring

### View in GitHub

```
Actions tab → Select workflow → View run details
```

### CLI

```bash
# List all runs
gh run list --repo linhtd93/dev-tools --limit 10

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log

# Cancel run
gh run cancel <run-id>

# Rerun workflow
gh run rerun <run-id>
```

---

## Summary

✅ **Auto deploy khi:**
- Push to `main` → Production
- Push to `staging` → Staging
- PR → Build test

✅ **Benefits:**
- Zero downtime deployment
- Auto-rollback on failure (manual)
- Build test sebelum merge
- Slack notification
- Security audit

🚀 **Deployment flow:**
```
Code commit → GitHub → Actions trigger → Build & Test → Deploy Vercel → Live
```
