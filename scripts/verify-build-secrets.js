#!/usr/bin/env node

/**
 * scripts/check-build-secrets.js
 * Fail the build if any known secret VALUE (or a secret-named variable holding
 * a non-empty value) leaked into the OpenNext build artifacts.
 *
 * The OpenNext build inlines env vars into .open-next/cloudflare/next-env.mjs,
 * which is then bundled into the deployed worker. Running this check right
 * after the build (locally or in CI) prevents accidentally publishing secrets
 * that were present in the build environment (e.g. .dev.vars on a dev machine).
 *
 * Values are never printed — only variable names.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const TARGETS = ['.open-next/cloudflare/next-env.mjs'];

// Real secret value shapes (API keys / Cloudflare user tokens / OAuth secrets).
const SECRET_PATTERNS = [
  /sk-or-v1-[0-9A-Za-z]{20,}/,
  /gsk_[0-9A-Za-z]{20,}/,
  /xai-[0-9A-Za-z]{20,}/,
  /cfut_[0-9A-Za-z]{16,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /GOCSPX-[0-9A-Za-z_-]{20,}/,
  /sk-[0-9A-Za-z]{32,}/,
];

// Secret-named keys that must never appear with a non-empty value in build output.
const FORBIDDEN_KEYS = [
  'CLOUDFLARE_D1_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'ADMIN_PASSWORD',
  'OPERATIONS_PANEL_PASSWORD',
  'GOOGLE_CLIENT_SECRET',
  'PLAYER_BRIDGE_SECRET',
  'REVALIDATE_SECRET',
  'REVALIDATION_SECRET',
  'TMDB_API_KEY',
  'TMDB_API_KEY_BACKUP',
  'TMDB_API_KEY_2',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY_1',
  'OPENROUTER_API_KEY_2',
  'OPENROUTER_API_KEY_3',
  'XAI_API_KEY',
  'MISTRAL_API_KEY',
];

let failed = false;
const problems = [];

for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      problems.push(`${rel}: found a value matching ${String(pattern)}`);
      failed = true;
    }
  }

  for (const key of FORBIDDEN_KEYS) {
    // matches `"KEY":"any non-empty value"` (next-env.mjs is JSON-ish)
    const re = new RegExp(`"${key}"\\s*:\\s*"([^"]{1,})"`);
    if (re.test(content)) {
      problems.push(`${rel}: ${key} is baked in with a value (${key.length} chars)`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\n❌ SECRETS FOUND IN BUILD OUTPUT — refusing to continue.\n');
  for (const p of problems) console.error('  - ' + p);
  console.error(
    '\n  The build environment must not contain the secret values.\n' +
    '  Add them as Cloudflare Worker Secrets (`npx wrangler secret put <NAME>`) and\n' +
    '  rebuild in a clean environment (e.g. GitHub Actions) before deploying.\n'
  );
  process.exit(1);
}

console.log('✅ check-build-secrets: no secrets found in build output');
process.exit(0);