# Auto-Run on Local After Build Success

Hướng dẫn setup tự động chạy ứng dụng trên local sau khi build success.

## Workflow

```
Push Code
    ↓
GitHub receives commit
    ↓
Local Machine detects & builds
    ↓
Build Status:
  ✅ SUCCESS
    ↓
Auto-run on local:
  - Kill old process
  - npm run dev (hoặc run preview)
  - Mở browser: http://localhost:3000
    ↓
Live on local machine!
```

---

## 1. Create Main Build & Run Script

Tạo file `scripts/build-and-run.sh`:

```bash
#!/bin/bash

set -e

REPO_OWNER="linhtd93"
REPO_NAME="dev-tools"
GITHUB_TOKEN=$(cat ~/.github_token | cut -d'=' -f2)
LOCAL_REPO="/Users/lap15133-local/Documents/must-learn/dev-tools"
BUILD_LOG="$LOCAL_REPO/build.log"
DEV_PORT=3000

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BUILD_LOG"
}

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🔨 Build & Run Started"

# Get latest commit SHA
COMMIT_SHA=$(git -C "$LOCAL_REPO" rev-parse HEAD)
BRANCH=$(git -C "$LOCAL_REPO" rev-parse --abbrev-ref HEAD)

log "📝 Commit: $COMMIT_SHA (Branch: $BRANCH)"

# ============== STEP 1: SET STATUS PENDING ==============
log "📝 Setting GitHub status: PENDING..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/statuses/$COMMIT_SHA \
  -d '{
    "state": "pending",
    "description": "Building...",
    "context": "Local Build",
    "target_url": "http://localhost:3000"
  }' >> "$BUILD_LOG" 2>&1

# ============== STEP 2: BUILD ==============
log "🚀 Building project (npm run build:prod)..."

cd "$LOCAL_REPO/fe"

if npm ci && npm run build:prod >> "$BUILD_LOG" 2>&1; then
  log "✅ Build SUCCESS"
  BUILD_SUCCESS=true
else
  log "❌ Build FAILED"
  BUILD_SUCCESS=false
fi

# ============== STEP 3: UPDATE STATUS ==============
if [ "$BUILD_SUCCESS" = true ]; then
  log "✅ Setting GitHub status: SUCCESS..."
  curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/statuses/$COMMIT_SHA \
    -d '{
      "state": "success",
      "description": "Build passed! Running locally...",
      "context": "Local Build",
      "target_url": "http://localhost:3000"
    }' >> "$BUILD_LOG" 2>&1

  # ============== STEP 4: RUN ON LOCAL ==============
  log "🎯 Auto-running on local machine..."
  
  # Kill old dev server if running
  pkill -f "vite" || true
  pkill -f "npm run dev" || true
  sleep 2
  
  log "🌐 Starting dev server on http://localhost:$DEV_PORT..."
  
  # Start dev server in background
  cd "$LOCAL_REPO/fe"
  nohup npm run dev > "$LOCAL_REPO/dev-server.log" 2>&1 &
  DEV_PID=$!
  
  log "✅ Dev server started (PID: $DEV_PID)"
  
  # Wait for server to start
  sleep 5
  
  # Open browser
  if command -v open &> /dev/null; then
    log "🌍 Opening browser: http://localhost:$DEV_PORT"
    open "http://localhost:$DEV_PORT"
  else
    log "💡 Open browser manually: http://localhost:$DEV_PORT"
  fi
  
  log "✅ Success! App running on http://localhost:$DEV_PORT"
  
else
  log "❌ Setting GitHub status: FAILURE..."
  curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/statuses/$COMMIT_SHA \
    -d '{
      "state": "failure",
      "description": "Build failed!",
      "context": "Local Build",
      "target_url": "http://localhost:3000"
    }' >> "$BUILD_LOG" 2>&1
  
  log "❌ Build failed. Check logs at: $BUILD_LOG"
  exit 1
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ All done!"
```

---

## 2. Create Watch & Auto-Trigger Script

Tạo file `scripts/watch-and-run.sh`:

```bash
#!/bin/bash

REPO_OWNER="linhtd93"
REPO_NAME="dev-tools"
GITHUB_TOKEN=$(cat ~/.github_token | cut -d'=' -f2)
LOCAL_REPO="/Users/lap15133-local/Documents/must-learn/dev-tools"
BUILD_SCRIPT="$LOCAL_REPO/scripts/build-and-run.sh"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "👀 Watching for new commits..."

LAST_COMMIT=""

while true; do
  # Get latest commit from GitHub
  LATEST_COMMIT=$(curl -s \
    -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/commits/main \
    | jq -r '.sha' 2>/dev/null)
  
  if [ "$LATEST_COMMIT" != "$LAST_COMMIT" ] && [ ! -z "$LATEST_COMMIT" ] && [ "$LATEST_COMMIT" != "null" ]; then
    log "📥 New commit detected: $LATEST_COMMIT"
    
    # Pull latest code
    cd "$LOCAL_REPO"
    git pull origin main
    
    if [ $? -eq 0 ]; then
      log "✅ Git pull successful"
      
      # Run build & run script
      bash "$BUILD_SCRIPT"
      
      LAST_COMMIT="$LATEST_COMMIT"
    else
      log "❌ Git pull failed"
    fi
  fi
  
  # Check every 30 seconds
  sleep 30
done
```

---

## 3. Setup Auto-Start on Machine Boot (macOS)

### 3.1 Create LaunchAgent plist

Tạo file `~/Library/LaunchAgents/com.devtools.watchrun.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.devtools.watchrun</string>
  
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/lap15133-local/Documents/must-learn/dev-tools/scripts/watch-and-run.sh</string>
  </array>
  
  <key>RunAtLoad</key>
  <true/>
  
  <key>KeepAlive</key>
  <true/>
  
  <key>StandardOutPath</key>
  <string>/Users/lap15133-local/Documents/must-learn/dev-tools/watch.log</string>
  
  <key>StandardErrorPath</key>
  <string>/Users/lap15133-local/Documents/must-learn/dev-tools/watch-error.log</string>
  
  <key>UserName</key>
  <string>lap15133-local</string>
</dict>
</plist>
```

### 3.2 Enable on boot

```bash
# Load the LaunchAgent
launchctl load ~/Library/LaunchAgents/com.devtools.watchrun.plist

# Verify it's loaded
launchctl list | grep com.devtools.watchrun

# Test manually
launchctl start com.devtools.watchrun

# View logs
tail -f ~/Documents/must-learn/dev-tools/watch.log
```

### 3.3 Manage the service

```bash
# Start service
launchctl start com.devtools.watchrun

# Stop service
launchctl stop com.devtools.watchrun

# Unload (remove from auto-start)
launchctl unload ~/Library/LaunchAgents/com.devtools.watchrun.plist

# View service status
launchctl list | grep com.devtools.watchrun
```

---

## 4. Quick Start Setup

### 4.1 One-time setup

```bash
cd /Users/lap15133-local/Documents/must-learn/dev-tools

# Make scripts executable
chmod +x scripts/build-and-run.sh
chmod +x scripts/watch-and-run.sh

# Setup GitHub token
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" > ~/.github_token
chmod 600 ~/.github_token

# Test build script
bash scripts/build-and-run.sh

# If success, setup auto-start
mkdir -p ~/Library/LaunchAgents
cp scripts/com.devtools.watchrun.plist ~/Library/LaunchAgents/

# Load service
launchctl load ~/Library/LaunchAgents/com.devtools.watchrun.plist
```

### 4.2 Manual test

```bash
# Terminal 1 - Start watcher
bash /Users/lap15133-local/Documents/must-learn/dev-tools/scripts/watch-and-run.sh

# Terminal 2 - Make a commit and push
cd /Users/lap15133-local/Documents/must-learn/dev-tools
echo "test" >> README.md
git add .
git commit -m "Test auto-run"
git push origin main

# Watch Terminal 1 for auto-build & run
```

---

## 5. Real-world Example

### Terminal output:

```
[2025-12-06 10:30:15] 👀 Watching for new commits...
[2025-12-06 10:35:42] 📥 New commit detected: abc123def456
[2025-12-06 10:35:43] ✅ Git pull successful
[2025-12-06 10:35:44] 🔨 Build & Run Started
[2025-12-06 10:35:44] 📝 Commit: abc123def456 (Branch: main)
[2025-12-06 10:35:44] 📝 Setting GitHub status: PENDING...
[2025-12-06 10:35:46] 🚀 Building project (npm run build:prod)...
[2025-12-06 10:37:50] ✅ Build SUCCESS
[2025-12-06 10:37:51] ✅ Setting GitHub status: SUCCESS...
[2025-12-06 10:37:52] 🎯 Auto-running on local machine...
[2025-12-06 10:37:52] 🌐 Starting dev server on http://localhost:3000...
[2025-12-06 10:37:53] ✅ Dev server started (PID: 12345)
[2025-12-06 10:37:58] 🌍 Opening browser: http://localhost:3000
[2025-12-06 10:37:58] ✅ Success! App running on http://localhost:3000
```

### GitHub display:

```
Commits:
✅ abc123 - "Test auto-run"
   Local Build ✓ passed in 2m 6s
   "Build passed! Running locally..."
```

### Local browser:

```
Browser opens automatically at http://localhost:3000
App is live and running!
```

---

## 6. Advanced Features

### 6.1 Run different commands based on branch

Sửa `scripts/build-and-run.sh`:

```bash
# After build success:
if [ "$BRANCH" = "main" ]; then
  log "🚀 Production build - running preview..."
  npm run preview
elif [ "$BRANCH" = "staging" ]; then
  log "🧪 Staging build - running dev..."
  npm run stg
else
  log "💻 Dev build - running dev server..."
  npm run dev
fi
```

### 6.2 Send notifications

Thêm vào `scripts/build-and-run.sh`:

```bash
# After success
osascript -e 'display notification "Build successful! App running on localhost:3000" with title "DevTools Pro"'

# Or Slack
curl -X POST $SLACK_WEBHOOK \
  -d '{"text":"✅ Build passed! App running on http://localhost:3000"}'
```

### 6.3 Monitor multiple branches

```bash
# Watch main
bash watch-and-run.sh &

# Watch staging
BRANCH=staging bash watch-and-run.sh &
```

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| Service not starting | Check plist syntax: `plutil -lint ~/Library/LaunchAgents/com.devtools.watchrun.plist` |
| Token expired | Regenerate at github.com/settings/tokens |
| Build hangs | Check npm install, timeout in script |
| Browser not opening | Manual: http://localhost:3000 |
| Port already in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| Permission denied | Make script executable: `chmod +x script.sh` |

---

## 8. Monitoring & Logs

### View logs

```bash
# Watch log
tail -f ~/Documents/must-learn/dev-tools/watch.log

# Dev server log
tail -f ~/Documents/must-learn/dev-tools/dev-server.log

# Build log
tail -f ~/Documents/must-learn/dev-tools/build.log

# Errors
tail -f ~/Documents/must-learn/dev-tools/watch-error.log
```

### Check service status

```bash
# Is service running?
launchctl list | grep com.devtools.watchrun

# Kill service
launchctl stop com.devtools.watchrun

# Restart service
launchctl restart com.devtools.watchrun
```

---

## 9. Complete Workflow

```
1. Make changes locally
   git add .
   git commit -m "New feature"
   git push origin main

2. Watcher detects commit
   📥 New commit detected

3. Auto-build & deploy
   🚀 Building...
   ✅ Build success

4. Auto-run on local
   🌐 Starting dev server
   🌍 Opening browser

5. See live changes
   http://localhost:3000 (auto-opened)
   ✅ App running with latest code!
```

---

## 10. Summary

✅ **Features:**
- Auto-detect new commits from GitHub
- Auto-build: `npm run build:prod`
- Auto-run: `npm run dev`
- Auto-open browser
- GitHub status update
- Auto-start on machine boot

✅ **Setup:**
1. Create GitHub token
2. Make scripts executable
3. Load LaunchAgent
4. Done! Service runs automatically

✅ **Monitoring:**
- View logs in real-time
- GitHub shows build status
- Browser auto-opens
- Simple to debug

🎯 **Next:** Push code → Sit back → App auto-runs on local! 🚀
