# Cloudflare Worker Secrets Management

## Overview

This directory contains scripts to manage Cloudflare Worker secrets to prevent authentication issues.

## Problem

Cloudflare Workers require environment variables (secrets) for OAuth and API access. These secrets are **not** automatically synced when you deploy. If secrets are missing, features like Google Login will fail.

## Solution

We have automated scripts to check and setup secrets.

---

## Required Secrets

The following secrets must be configured in Cloudflare Workers:

1. **GOOGLE_CLIENT_ID** - Google OAuth Client ID
2. **GOOGLE_CLIENT_SECRET** - Google OAuth Client Secret  
3. **CLOUDFLARE_D1_TOKEN** - Cloudflare D1 API Token

---

## Available Commands

### 1. Check Secrets Status

Check if all required secrets are configured:

```bash
npm run check-secrets
```

This command will show which secrets are present and which are missing.

### 2. Setup Secrets Automatically

Automatically upload all secrets from `.env.local` to Cloudflare Workers:

```bash
npm run setup-secrets
```

This will:
- Read secrets from `.env.local`
- Upload them to Cloudflare Workers
- Confirm success/failure for each secret

### 3. Setup Individual Secret Manually

To set a single secret manually:

```bash
npx wrangler secret put SECRET_NAME
```

Then paste the secret value when prompted.

---

## Automated Check on Deploy

The `predeploy:production` script automatically checks secrets before each deployment:

```bash
npm run deploy:production
```

This will:
1. ✅ Check if secrets exist (via `check-secrets`)
2. ⚠️  Warn if any are missing
3. 🚀 Continue with deployment

---

## First Time Setup

If you're setting up the project for the first time:

1. Make sure `.env.local` has all required secrets
2. Run the setup script:
   ```bash
   npm run setup-secrets
   ```
3. Deploy:
   ```bash
   npm run deploy:production
   ```

---

## Troubleshooting

### "Failed to authenticate with Google"

This means `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` are missing or incorrect.

**Solution:**
```bash
npm run setup-secrets
```

### "Secrets are missing" warning

Run the setup command:
```bash
npm run setup-secrets
```

### Manual verification

To list all secrets in Cloudflare Workers:
```bash
npx wrangler secret list
```

To delete a secret (if you need to reset it):
```bash
npx wrangler secret delete SECRET_NAME
```

---

## Notes

- Secrets are **persistent** in Cloudflare Workers - they survive deployments
- Secrets are **encrypted** and not visible after upload
- You can only overwrite a secret by uploading a new value
- Secrets are **Worker-specific** - if you rename the worker, you'll need to re-add secrets

---

## Security

⚠️ **Never commit `.env.local` to git!**

The `.env.local` file contains sensitive secrets and should always be in `.gitignore`.
