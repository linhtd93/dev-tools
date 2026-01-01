# Test CI/CD Locally

Hướng dẫn test GitHub Actions workflow trên máy local trước khi push.

## 1. Install Act - Local GitHub Actions Runner

### macOS
```bash
brew install act
```

### Linux
```bash
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Windows (Git Bash)
```bash
choco install act-cli
# hoặc
scoop install act
```

### Verify install
```bash
act --version
```

---

## 2. Test Deploy Workflow Locally

### 2.1 Setup

```bash
cd /Users/lap15133-local/Documents/must-learn/dev-tools

# Create .actrc file (optional, to skip prompt)
cat > .actrc << 'EOF'
-P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest
-s VERCEL_TOKEN=dummy_token_for_testing
-s VERCEL_ORG_ID=dummy_org_id
-s VERCEL_PROJECT_ID=dummy_project_id
EOF
```

### 2.2 List available workflows

```bash
act -l

# Output:
# ID          Event       Title
# deploy      push        Build & Deploy to Vercel
# test        push        Tests & Code Quality
```

### 2.3 Run deploy workflow locally

```bash
# Chạy deploy workflow trên main branch
act push -j deploy --eventpath <(echo '{"ref":"refs/heads/main"}')

# Hoặc chạy staging
act push -j deploy --eventpath <(echo '{"ref":"refs/heads/staging"}')
```

### 2.4 Run test workflow locally

```bash
act push -j test
```

### 2.5 Run all workflows

```bash
act
```

---

## 3. Simulate Different Events

### 3.1 Push to main (Production deploy)

```bash
act push --ref main
```

### 3.2 Push to staging

```bash
act push --ref staging
```

### 3.3 Pull Request

```bash
act pull_request
```

### 3.4 Schedule (cron)

```bash
act schedule
```

---

## 4. Pass Secrets to Act

### 4.1 Create secrets file

```bash
cat > .secrets << 'EOF'
VERCEL_TOKEN=xxxx_your_real_token_xxxx
VERCEL_ORG_ID=team_xxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxx
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx/xxx/xxx
EOF
```

### 4.2 Run with secrets

```bash
act push -s VERCEL_TOKEN="xxxx_your_token_xxxx" -j deploy
# hoặc
act --secret-file .secrets
```

### ⚠️ Security Warning
```bash
# Không commit .secrets file!
echo ".secrets" >> .gitignore
git add .gitignore
git commit -m "Add secrets to gitignore"
```

---

## 5. Debug Mode

### 5.1 Verbose output

```bash
act -v

# Output detail mỗi step
```

### 5.2 Debug specific step

```bash
act -j deploy --step "Deploy to Vercel"
```

### 5.3 Keep container running on failure

```bash
act --rm=false

# Container không delete, có thể ssh vào debug
docker ps
docker exec -it <container_id> /bin/bash
```

---

## 6. Common Issues & Solutions

### Issue: "docker not running"

```bash
# macOS - Start Docker
open -a Docker

# Wait for Docker to start
sleep 10
act
```

### Issue: "out of disk space"

```bash
# Clean Docker
docker system prune -a

# Or restart Docker
docker restart
```

### Issue: "workflow not found"

```bash
# Verify workflow exists
ls -la .github/workflows/

# Verify format (YAML)
cat .github/workflows/deploy.yml
```

### Issue: "Timeout during build"

```bash
# Increase timeout
act --timeout 1800  # 30 minutes

# Hoặc skip slow steps
act -j deploy --step "Build for production"
```

---

## 7. Full Local Build Test

Simulate toàn bộ CI/CD pipeline:

### 7.1 Manual simulation

```bash
# Step 1: Checkout
git status

# Step 2: Install & Build
cd fe
npm ci
npm run build:prod

# Step 3: Check build output
ls -la dist/
du -sh dist/

# Step 4: Test build is valid
test -d dist/ && echo "✅ Build success" || echo "❌ Build failed"
```

### 7.2 Using Act

```bash
# Chạy workflow complete
act push -j deploy --eventpath <(cat << 'EOF'
{
  "ref": "refs/heads/main",
  "before": "000000",
  "after": "123456",
  "repository": {
    "name": "dev-tools",
    "owner": "linhtd93"
  }
}
EOF
)
```

### 7.3 Check results

```bash
# View logs
act -v push -j deploy 2>&1 | tee ci_test.log

# Check for errors
grep -i error ci_test.log
grep -i fail ci_test.log
```

---

## 8. Compare Local vs GitHub

| Aspect | Local (Act) | GitHub Actions |
|--------|-----------|-----------------|
| Speed | ⚡ Nhanh (local) | 🔄 Chậm (network) |
| Secrets | Manual pass | Auto from repo |
| Docker | Cần Docker | Không cần |
| Network | localhost | Public internet |
| Cost | Free | Free (limits) |
| Debug | Easy (shell access) | Hard (logs only) |

---

## 9. Real Workflow: Local → GitHub

### 9.1 Test locally

```bash
# 1. Test build locally
cd fe
npm ci
npm run build:prod

# 2. Test workflows locally
cd ..
act push -j deploy

# 3. Verify no errors
echo $?  # 0 = success
```

### 9.2 Commit & Push

```bash
# 4. Only if local test passes
git add .
git commit -m "Add feature"
git push origin main

# 5. GitHub Actions auto-runs
# Check: https://github.com/linhtd93/dev-tools/actions
```

### 9.3 Monitor on GitHub

```bash
# View workflow status
gh run list --repo linhtd93/dev-tools

# View logs
gh run view <run-id> --log

# Deploy status
gh deployment list --repo linhtd93/dev-tools
```

---

## 10. Quick Commands Cheat Sheet

```bash
# List workflows
act -l

# Run specific workflow
act -j deploy
act -j test

# Run with verbose
act -v

# Run with secrets
act -s TOKEN=xxx

# Run specific branch
act push --ref main

# Keep container on failure
act --rm=false

# Set timeout
act --timeout 1800

# Clean up
docker system prune -a
```

---

## 11. Troubleshooting Checklist

- [ ] Docker is running
- [ ] Act is installed (`act --version`)
- [ ] Workflow file exists (`.github/workflows/deploy.yml`)
- [ ] YAML syntax valid (use online YAML validator)
- [ ] Secrets passed correctly
- [ ] Branch name correct
- [ ] Build works locally (`npm run build:prod`)
- [ ] Check logs for errors (`act -v`)

---

## Example: Complete Local Test

```bash
#!/bin/bash
set -e

echo "🔍 Testing CI/CD locally..."

# 1. Verify Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed"
    exit 1
fi

# 2. Verify Act
if ! command -v act &> /dev/null; then
    echo "❌ Act not installed"
    exit 1
fi

# 3. Build locally
echo "🔨 Building locally..."
cd fe
npm ci
npm run build:prod
cd ..

# 4. Run Act
echo "🚀 Running GitHub Actions locally..."
act push -j deploy --eventpath <(echo '{"ref":"refs/heads/main"}')

echo "✅ CI/CD test passed!"
```

Save as `test-ci.sh` and run:
```bash
chmod +x test-ci.sh
./test-ci.sh
```

---

## Benefits of Local Testing

✅ **Catch errors early** - trước khi push
✅ **Save time** - không chờ GitHub
✅ **Debug easier** - shell access
✅ **Free** - không dùng GitHub limits
✅ **Iterate fast** - test nhiều lần

🎯 **Best practice:** Luôn test locally trước push!
