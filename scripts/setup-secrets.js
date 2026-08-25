#!/usr/bin/env node

/**
 * Setup Cloudflare Worker secrets from .env.local
 * This script reads secrets from .env.local and uploads them to Cloudflare Workers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_FILE = path.join(__dirname, '..', '.env.local');

const SECRETS_TO_SYNC = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'CLOUDFLARE_D1_TOKEN'
];

// Parse .env.local file
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${filePath} not found!`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

// Upload secret to Cloudflare
function uploadSecret(name, value) {
  try {
    console.log(`📤 Uploading ${name}...`);
    
    // Use echo to pipe the value to wrangler secret put
    const command = process.platform === 'win32'
      ? `echo ${value} | npx wrangler secret put ${name}`
      : `echo "${value}" | npx wrangler secret put ${name}`;
    
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${name} uploaded successfully\n`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${name}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Cloudflare Worker Secrets Setup\n');
  console.log('This will upload secrets from .env.local to Cloudflare Workers\n');

  // Ask for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question('Continue? (y/N): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  console.log('\n📖 Reading .env.local...\n');
  const env = parseEnvFile(ENV_FILE);

  let successCount = 0;
  let failCount = 0;

  for (const secretName of SECRETS_TO_SYNC) {
    if (!env[secretName]) {
      console.log(`⚠️  ${secretName} not found in .env.local - skipping\n`);
      continue;
    }

    const success = uploadSecret(secretName, env[secretName]);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully uploaded: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(50) + '\n');

  if (failCount > 0) {
    console.log('⚠️  Some secrets failed to upload. Please check the errors above.\n');
    process.exit(1);
  } else {
    console.log('🎉 All secrets uploaded successfully!\n');
    console.log('You can now deploy with: npm run deploy:production\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
