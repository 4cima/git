const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const gitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  
  // Write to .env.local for local development
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    // Remove any existing NEXT_PUBLIC_BUILD_SHA
    envContent = envContent.split('\n').filter(line => !line.startsWith('NEXT_PUBLIC_BUILD_SHA=')).join('\n');
  }
  
  envContent += `\nNEXT_PUBLIC_BUILD_SHA=${gitSha}\n`;
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✓ Build SHA captured: ${gitSha}`);
  console.log(`✓ Written to .env.local`);
} catch (error) {
  console.error('Failed to capture git SHA:', error.message);
  // Don't fail the build
}
