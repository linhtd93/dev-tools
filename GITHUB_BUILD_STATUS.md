# GitHub Build Status Display - Local Machine as Build Server

Hướng dẫn setup GitHub để hiển thị trạng thái build (Building, Success, Failed) với máy local làm build server.

## Architecture

```
Your Local Machine (Build Server)
         ↑
         │ (Pull commits)
         │
GitHub Repository
         ↑
         │ (Push commits)
         │
Your Browser
```

## 1. Setup GitHub Checks & Status

### 1.1 Create GitHub Personal Access Token

```bash
# Vào https://github.com/settings/tokens
# Click "Generate new token (classic)"
# Scopes cần chọn:
#   ✅ repo (full control of private repositories)
#   ✅ workflow (update GitHub Actions and read workflow YAML)
#   ✅ write:statuses (write commit statuses)

# Copy token, lưu vào file
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" > ~/.github_token
```

### 1.2 Setup Local Build Script

Tạo file `scripts/local-build.sh`:

```bash
#!/bin/bash

set -e

REPO_OWNER="linhtd93"
REPO_NAME="dev-tools"
GITHUB_TOKEN=$(cat ~/.github_token | cut -d'=' -f2)

# Get latest commit SHA
COMMIT_SHA=$(git rev-parse HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🔨 Building: $REPO_OWNER/$REPO_NAME ($BRANCH@$COMMIT_SHA)"

# 1. Set status: PENDING
echo "📝 Setting status: PENDING..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/statuses/$COMMIT_SHA \
  -d '{
    "state": "pending",
    "description": "Build in progress...",
    "context": "Local Build",
    "target_url": "http://localhost:3000"
  }'

# 2. Build
echo "🚀 Building project..."
cd fe
npm ci
npm run build:prod

if [ $? -eq 0 ]; then
  # 3. Set status: SUCCESS
  echo "✅ Setting status: SUCCESS..."
  curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/statuses/$COMMIT_SHA \
    -d '{
      "state": "success",
      "description": "Build passed!",
      "context": "Local Build",
      "target_url": "http://localhost:3000"
    }'
  
  echo "✅ Build SUCCESS"
  exit 0
else
  # 4. Set status: FAILURE
  echo "❌ Setting status: FAILURE..."
  curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/statuses/$COMMIT_SHA \
    -d '{
      "state": "failure",
      "description": "Build failed!",
      "context": "Local Build",
      "target_url": "http://localhost:3000"
    }'
  
  echo "❌ Build FAILED"
  exit 1
fi
```

---

## 2. Watch for New Commits & Auto-Build

### 2.1 Create Git Hook - Post-receive

Khi bạn push code lên GitHub, local machine sẽ detect và build.

Tạo file `scripts/watch-builds.sh`:

```bash
#!/bin/bash

REPO_OWNER="linhtd93"
REPO_NAME="dev-tools"
GITHUB_TOKEN=$(cat ~/.github_token | cut -d'=' -f2)
LOCAL_REPO="/Users/lap15133-local/Documents/must-learn/dev-tools"

echo "👀 Watching for new commits..."

LAST_COMMIT=""

while true; do
  # Get latest commit from GitHub
  LATEST_COMMIT=$(curl -s \
    -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/commits/main \
    | jq -r '.sha')
  
  if [ "$LATEST_COMMIT" != "$LAST_COMMIT" ] && [ ! -z "$LATEST_COMMIT" ]; then
    echo "📥 New commit detected: $LATEST_COMMIT"
    
    # Pull latest code
    cd "$LOCAL_REPO"
    git pull origin main
    
    # Run build script
    bash scripts/local-build.sh
    
    LAST_COMMIT="$LATEST_COMMIT"
  fi
  
  # Check every 30 seconds
  sleep 30
done
```

### 2.2 Run watcher in background

```bash
# Terminal 1 - Run watcher
chmod +x scripts/watch-builds.sh
bash scripts/watch-builds.sh

# Output:
# 👀 Watching for new commits...
# 📥 New commit detected: abc123def456
# 🔨 Building: linhtd93/dev-tools (main@abc123def456)
# 📝 Setting status: PENDING...
# 🚀 Building project...
# ✅ Setting status: SUCCESS...
```

---

## 3. GitHub Commit Status Display

### 3.1 View Status on GitHub

Vào repo → **Commits** tab → Xem status icon:

```
✅ abc123 - commit message - "Local Build ✓" 
❌ def456 - commit message - "Local Build ✗"
⏳ ghi789 - commit message - "Local Build (building...)"
```

Click icon để xem chi tiết:
- Build status
- Build time
- Error message

### 3.2 Branch Protection Rules

Vào **Settings** → **Branches** → **Add rule**

```
Branch name pattern: main

Require status checks to pass before merging:
  ✅ Local Build

Require branches to be up to date before merging:
  ✅ Enable
```

**Effect:** Chỉ merge PR khi local build pass!

---

## 4. Pull Request Status

Khi tạo PR, GitHub tự động hiển thị build status:

```
PR #1 - Add new feature

Checks:
  ⏳ Local Build — in progress
  
  After commit:
  ✅ Local Build — passed in 2m 15s
  ❌ Local Build — failed in 1m 45s
```

---

## 5. Using GitHub Actions UI (Alternative)

Nếu muốn UI đẹp hơn, dùng GitHub Actions + ngrok expose local:

### 5.1 Install ngrok

```bash
brew install ngrok
```

### 5.2 Expose local build status

```bash
# Terminal 1 - Start dev server
cd fe
npm run dev

# Terminal 2 - Expose with ngrok
ngrok http 3000
# Output:
# https://1a2b3c4d5e6f.ngrok.io -> http://localhost:3000
```

### 5.3 Webhook từ GitHub

GitHub → Settings → Webhooks → Add webhook

```
Payload URL: https://1a2b3c4d5e6f.ngrok.io/webhook
Content type: application/json
Events: Push events
Active: ✅
```

---

## 6. Dashboard - View Build Status

Tạo file `fe/src/pages/BuildStatus.jsx`:

```jsx
import { useEffect, useState } from 'react'

export function BuildStatus() {
  const [status, setStatus] = useState(null)
  const [commits, setCommits] = useState([])

  useEffect(() => {
    fetchBuildStatus()
    const interval = setInterval(fetchBuildStatus, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchBuildStatus = async () => {
    try {
      const res = await fetch(
        'https://api.github.com/repos/linhtd93/dev-tools/commits/main',
        {
          headers: {
            Authorization: `token ${import.meta.env.VITE_GITHUB_TOKEN}`
          }
        }
      )
      const data = await res.json()
      
      // Fetch commit status
      const statusRes = await fetch(
        `https://api.github.com/repos/linhtd93/dev-tools/commits/${data.sha}/status`,
        {
          headers: {
            Authorization: `token ${import.meta.env.VITE_GITHUB_TOKEN}`
          }
        }
      )
      const statusData = await statusRes.json()
      
      setStatus({
        sha: data.sha.slice(0, 7),
        message: data.commit.message,
        author: data.commit.author.name,
        state: statusData.state, // pending, success, failure
        statuses: statusData.statuses
      })
    } catch (err) {
      console.error('Error fetching build status:', err)
    }
  }

  const getStatusIcon = (state) => {
    switch (state) {
      case 'pending':
        return '⏳'
      case 'success':
        return '✅'
      case 'failure':
        return '❌'
      default:
        return '❓'
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🔨 Build Status Dashboard</h2>
      
      {status ? (
        <div style={{
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '8px',
          border: '2px solid #ccc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2em' }}>
              {getStatusIcon(status.state)}
            </span>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold' }}>
                {status.state.toUpperCase()}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9em', color: '#666' }}>
                {status.sha} - {status.message}
              </p>
            </div>
          </div>

          <div style={{ fontSize: '0.9em', color: '#555' }}>
            <p>Author: {status.author}</p>
            
            {status.statuses.map((s) => (
              <div key={s.context} style={{
                padding: '0.5rem',
                background: 'white',
                borderRadius: '4px',
                marginTop: '0.5rem',
                borderLeft: `4px solid ${
                  s.state === 'success' ? '#10b981' : 
                  s.state === 'failure' ? '#ef4444' : 
                  '#f59e0b'
                }`
              }}>
                <strong>{s.context}</strong>: {s.description}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>Loading build status...</p>
      )}
    </div>
  )
}
```

---

## 7. Full Automation Setup

### 7.1 Create startup script

Tạo file `scripts/start-build-server.sh`:

```bash
#!/bin/bash

echo "🚀 Starting Local Build Server..."

# Kill existing processes
pkill -f "watch-builds.sh" || true

# Start watcher in background
nohup bash $(pwd)/scripts/watch-builds.sh > build.log 2>&1 &

echo "✅ Build server started"
echo "📋 Logs: $(pwd)/build.log"
echo "📊 View status: https://github.com/linhtd93/dev-tools/commits/main"
```

### 7.2 Run on machine startup (macOS)

Tạo file `~/Library/LaunchAgents/com.devtools.buildserver.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.devtools.buildserver</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/lap15133-local/Documents/must-learn/dev-tools/scripts/start-build-server.sh</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

Enable:
```bash
launchctl load ~/Library/LaunchAgents/com.devtools.buildserver.plist
```

---

## 8. Monitor Build Status

### 8.1 Terminal View

```bash
# Watch build status in real-time
watch -n 5 'curl -s \
  -H "Authorization: token $(cat ~/.github_token | cut -d= -f2)" \
  https://api.github.com/repos/linhtd93/dev-tools/commits/main \
  | jq ".commit.message, .sha" | head -5'
```

### 8.2 GitHub CLI

```bash
# View commit status
gh api repos/linhtd93/dev-tools/commits/main/status

# View checks
gh api repos/linhtd93/dev-tools/commits/main/check-runs
```

---

## 9. Complete Workflow Example

### 9.1 Local Development

```bash
# 1. Develop locally
npm run dev

# 2. Commit & Push
git add .
git commit -m "Add new feature"
git push origin main

# Terminal output from watcher:
# 📥 New commit detected: abc123
# 🔨 Building...
# 📝 Status: PENDING ⏳
# 🚀 Building...
# ✅ Status: SUCCESS ✅
```

### 9.2 GitHub Display

```
Commits:
abc123 - "Add new feature"
  Local Build ✅ passed in 2m 15s
  
Pull Requests:
#5 - Add new feature
  ✅ Local Build — passed
  [✅ Merge approved]
```

---

## 10. Troubleshooting

| Lỗi | Giải pháp |
|-----|----------|
| Token invalid | Regenerate token at github.com/settings/tokens |
| Status not appearing | Wait 1-2 minutes, refresh GitHub page |
| Build not triggering | Check `scripts/watch-builds.sh` running |
| Webhook timeout | Use ngrok để expose local |
| Build hangs | Check `npm ci` dependencies |

---

## Summary

✅ **Workflow:**
1. Push code to GitHub
2. Local machine detects commit
3. Auto-build: `npm run build:prod`
4. Update GitHub status: ⏳ → ✅ or ❌
5. GitHub shows build status on commit/PR

✅ **GitHub Display:**
- Commit page: Shows ✅ or ❌
- PR checks: Blocks merge if failed
- Status updates: Real-time

✅ **Benefits:**
- Build happens locally (not on servers)
- Instant feedback
- Branch protection based on build status
- Full visibility of build process

🎯 **Next step:** Setup GitHub token + run watch script!
