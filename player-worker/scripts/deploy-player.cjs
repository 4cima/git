'use strict';
const { execSync } = require('child_process');
const path = require('path');

const EXPECTED = '67df2529f10696968362c6017b7005f2';
const root = path.join(__dirname, '..');
const playerToken = process.env.CLOUDFLARE_PLAYER_TOKEN;
const checkOnly = process.argv.includes('--check');

if (!playerToken) {
  console.error('STOP: CLOUDFLARE_PLAYER_TOKEN missing');
  process.exit(1);
}

const env = { ...process.env, CLOUDFLARE_API_TOKEN: playerToken };

let whoami = '';
try {
  whoami = execSync('npx wrangler whoami', {
    cwd: root,
    env,
    encoding: 'utf8',
  });
} catch (e) {
  console.error('STOP: whoami failed');
  process.exit(1);
}

const safe = String(whoami).replace(/Token:\s*\S+/gi, 'Token: [hidden]');
console.log(safe);

if (!whoami.includes(EXPECTED)) {
  console.error('STOP: account mismatch');
  process.exit(1);
}

console.log('OK: player account matches');

if (checkOnly) {
  console.log('check only — no deploy');
  process.exit(0);
}

execSync('npx wrangler deploy --config wrangler.toml', {
  cwd: root,
  env,
  stdio: 'inherit',
});
