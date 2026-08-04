# Koyeb GitHub Actions Auto-Deployment Setup

## ✅ Configuration Complete

Your GitHub Actions workflow has been configured to automatically redeploy to Koyeb on every push to `main`.

### 📋 Koyeb Service Details

Retrieved via Koyeb REST API:

- **App Name:** `worldwide-brenna`
- **Service Name:** `com`
- **Production Domains:**
  - `4cima.com` (ACTIVE)
  - `www.4cima.com` (ACTIVE)
- **Koyeb Domain:** `worldwide-brenna-cinma-79e9fa6a.koyeb.app`
- **Connected Repo:** `github.com/4cima/git` (branch: `main`)
- **Service Status:** HEALTHY ✅

### 🔐 Required GitHub Secret

You need to add **ONE** secret to your GitHub repository:

1. Go to: https://github.com/4cima/git/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - **Name:** `KOYEB_API_TOKEN`
   - **Value:** `1l4xy7i22slpw1oh7nibqdoqadjqllddjnpjnm7ml3jvsqix3trq5i1sx5s0jqm2`

### 🚀 How It Works

The workflow (`.github/workflows/deploy.yml`) now has two jobs:

#### 1. **Build Job**
- Runs on every push and PR to `main`
- Checks TypeScript
- Builds Next.js
- Uploads build artifacts

#### 2. **Deploy Job** (NEW)
- Runs **only** on push to `main` (not on PRs)
- Waits for build job to complete
- Uses `koyeb-community/koyeb-actions@v2` to trigger redeployment
- Koyeb will pull latest code from GitHub and rebuild

### 📝 Workflow Trigger Flow

```
Developer pushes to main
         ↓
GitHub Actions starts
         ↓
Build job runs (TypeScript + Next.js build)
         ↓
Deploy job runs (calls Koyeb API)
         ↓
Koyeb pulls latest code from GitHub
         ↓
Koyeb rebuilds and redeploys
         ↓
4cima.com updated ✅
```

### ⚠️ Important Notes

1. **No CLI needed on Windows** - The GitHub Action handles everything on Ubuntu runners
2. **Token never committed** - Stored securely in GitHub Secrets
3. **Automatic on push** - Every merge to `main` triggers redeployment
4. **Build validation** - Deploy only happens if build succeeds

### 🧪 Testing the Setup

After adding the `KOYEB_API_TOKEN` secret:

1. Make a small change to any file
2. Commit and push to `main`
3. Go to: https://github.com/4cima/git/actions
4. Watch the workflow run
5. Check Koyeb dashboard to see deployment progress

### 🔍 API Endpoints Used

The setup was configured using direct Koyeb REST API calls:

```powershell
# List apps
GET https://app.koyeb.com/v1/apps
Authorization: Bearer <token>

# List services for an app
GET https://app.koyeb.com/v1/services?app_id=<app_id>
Authorization: Bearer <token>
```

All done via `Invoke-RestMethod` - no CLI download needed!
