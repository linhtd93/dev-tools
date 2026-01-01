# 🔐 License System - How To Use

## 📋 Quick Start

### 1️⃣ **Generate License Key** (30 days valid)
```bash
node scripts/generateLicense.js 30
```

**Output Example:**
```
📜 LICENSE KEY GENERATED
======================================================================
📅 Expiry Date: 2026-01-29
⏰ Days Valid: 29

🔑 LICENSE KEY:
2026-01-29|2c21eae03245672c44eb5c89107d9bec43da4beb45e01e7f026e959559496c59|v1
======================================================================
```

### 2️⃣ **Build with License Key**
```bash
export VITE_LICENSE_KEY="2026-01-29|2c21eae03245672c44eb5c89107d9bec43da4beb45e01e7f026e959559496c59|v1"
npm run build:prod
```

### 3️⃣ **Deploy to Vercel**
Add environment variable in Vercel dashboard:
- **Name:** `VITE_LICENSE_KEY`
- **Value:** `2026-01-29|2c21eae03245672c44eb5c89107d9bec43da4beb45e01e7f026e959559496c59|v1`

Then deploy:
```bash
git push origin main
```

---

## 🔑 License Key Format

```
2026-01-29|2c21eae...496c59|v1
│          │                │
│          │                └─ Version
│          └─────────────────── HMAC-SHA256 Signature (tamper-proof)
└──────────────────────────── Expiry Date (YYYY-MM-DD)
```

**Key Features:**
- ✅ **HMAC-SHA256 Signed** - Cannot be forged/tampered
- ✅ **Expiry Date Locked** - Cannot extend beyond set date
- ✅ **Version Control** - Support future key formats
- ✅ **Browser Compatible** - Uses js-sha256 library

---

## 📅 Generate Keys with Different Expiry

### 60 days from now:
```bash
node scripts/generateLicense.js 60
```

### Specific date (2026-02-28):
```bash
node scripts/generateLicense.js --date 2026-02-28
```

### 1 year (365 days):
```bash
node scripts/generateLicense.js 365
```

---

## ✅ What Happens When App Loads

### 1. License Check
```
App loads → Check VITE_LICENSE_KEY
  ├─ No key? → ❌ BLOCKED
  ├─ Invalid signature? → ❌ BLOCKED (tampered)
  ├─ Expired? → ❌ BLOCKED
  └─ Valid? → ✅ App runs normally
```

### 2. If License Expired
- User sees: **"🔒 License Expired"** message
- App: **FULLY BLOCKED** - Cannot access any tools
- No bypass possible without new key

### 3. Days Left Warning (Optional)
- If < 7 days left: Shows warning notification
- But app still works until expiry date

---

## 🛡️ Security

### Tamper-Proof Protection
**If someone tries to modify the key:**
```
Original:  2026-01-29|abc123def456|v1
Modified:  2026-12-31|abc123def456|v1  ❌ Signature no longer valid
```

The signature no longer matches → **BLOCKED**

### Cannot Extend License
- Key is locked to specific expiry date
- Cannot change date without invalidating signature
- Need new key generated with server-side secret

### Secret Key Security
**Location:** `fe/src/config/licenseConfig.js`
```javascript
const SECRET_KEY = 'devtools-pro-secret-key-2025';
```

**⚠️ CHANGE THIS SECRET!**
- Currently using default secret
- Change it to something unique
- Keep it secret (don't commit to public repo)

---

## 🚀 CI/CD Integration

### GitHub Actions (deploy.yml)
```yaml
env:
  VITE_LICENSE_KEY: ${{ secrets.VITE_LICENSE_KEY }}

jobs:
  build:
    steps:
      - name: Build
        run: npm run build:prod
```

### Vercel
1. Go to Vercel Dashboard → Project Settings
2. Environment Variables → Add
3. Name: `VITE_LICENSE_KEY`
4. Value: `<your-generated-key>`
5. Redeploy

---

## 📊 License Status Display

Add this to your app to show license info:
```javascript
import { getLicenseInfo } from './config/licenseConfig';

const info = getLicenseInfo();
console.log('License Expires:', info.expiryDate);
console.log('Days Left:', info.daysLeft);
console.log('Is Valid:', info.isValid);
```

---

## ❓ FAQ

### Q: What if I forgot to set the license key?
**A:** App shows error. License check is mandatory.

### Q: Can I disable license check?
**A:** Yes, set `VITE_LICENSE_ENABLED=false` (not recommended for production)

### Q: What happens after expiry?
**A:** App completely blocked. Users cannot access any features.

### Q: Can I create a trial license?
**A:** Yes! Generate key with `--date` for specific date:
```bash
node scripts/generateLicense.js --date 2026-01-05  # Trial until 2026-01-05
```

### Q: How to invalidate old licenses?
**A:** Change `SECRET_KEY` in `licenseConfig.js` - all old keys become invalid.
**Then generate new keys for all users.**

### Q: Can I use same key on multiple domains?
**A:** Yes, one key works on all domains (check `LICENSE_CONFIG.ALLOWED_DOMAINS` for restrictions)

---

## 🔄 Update Workflow

**Every month or when revoking old licenses:**

1. Generate new key:
   ```bash
   node scripts/generateLicense.js 30
   ```

2. Update Vercel environment variable with new key

3. Trigger redeploy:
   ```bash
   git push origin main
   ```

4. Old build stops working (if old key was different)

---

## 🚨 Production Checklist

- [ ] Change `SECRET_KEY` from default
- [ ] Generate license key for specific expiry date
- [ ] Set `VITE_LICENSE_KEY` in Vercel environment
- [ ] Test build locally with key
- [ ] Deploy to Vercel
- [ ] Verify app loads and shows correct license info
- [ ] Set reminder to generate new key before expiry
