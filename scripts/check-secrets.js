#!/usr/bin/env node

/**
 * Check if required Cloudflare secrets are set before deployment
 */

const { execSync } = require('child_process');

const REQUIRED_SECRETS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'CLOUDFLARE_D1_TOKEN'
];

console.log('🔍 Checking Cloudflare Worker secrets...\n');

let allSecretsExist = true;

for (const secretName of REQUIRED_SECRETS) {
  try {
    // Try to list the secret (wrangler doesn't have a direct "check" command, but we can infer from the list)
    const result = execSync('npx wrangler secret list', { encoding: 'utf-8', stdio: 'pipe' });
    
    if (result.includes(secretName)) {
      console.log(`✅ ${secretName} - Found`);
    } else {
      console.log(`❌ ${secretName} - Missing`);
      allSecretsExist = false;
    }
  } catch (error) {
    console.log(`⚠️  Could not check secrets (this is normal on first setup)`);
    allSecretsExist = false;
    break;
  }
}

console.log('\n');

if (!allSecretsExist) {
  console.log('⚠️  Some secrets are missing!\n');
  console.log('To add missing secrets, run:');
  console.log('  npx wrangler secret put GOOGLE_CLIENT_ID');
  console.log('  npx wrangler secret put GOOGLE_CLIENT_SECRET');
  console.log('  npx wrangler secret put CLOUDFLARE_D1_TOKEN');
  console.log('\nOr use the automated script:');
  console.log('  node scripts/setup-secrets.js\n');
  
  // Don't fail the build, just warn
  process.exit(0);
} else {
  console.log('✅ All required secrets are configured!\n');
  process.exit(0);
}
