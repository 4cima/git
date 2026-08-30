#!/usr/bin/env node
/**
 * migrate-ads-mediation.js
 * ─────────────────────────
 * Additive migration for the Ad Mediation layer (providers / zones / slots /
 * assignments / events) + missing House-ads columns on the existing `ads` table.
 *
 * ⚠️  PRODUCTION: account 834bca43… / database b50ec43e… is LIVE.
 *     The running production code reads the `ads` table.
 *
 * DEFAULT MODE (no flags):
 *     node scripts/migrate-ads-mediation.js
 *     → prints the full SQL and exits. NOTHING is executed.
 *
 * APPLY MODE:
 *     node scripts/migrate-ads-mediation.js --apply
 *     → requires CLOUDFLARE_D1_TOKEN in .env.local AND typing "YES" to confirm.
 *
 * DEMO DEACTIVATION (UPDATE ads SET active = 0 for تجريبي/example.com rows):
 *     only runs in APPLY mode when the extra flag --deactivate-demo is passed.
 *     NOTE: this affects the live site immediately (production reads `ads`).
 *
 * ADDITIVE ONLY — no DROP anywhere. The `ads` table is never recreated.
 */
require('dotenv').config({ path: '.env.local' });

const readline = require('readline');

const ACCOUNT_ID  = '834bca43d616c73db23cf95311cfe17e';
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6';
const D1_HTTP_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

// ─── 1) New tables (CREATE IF NOT EXISTS — safe to re-run) ───────────────────

const TABLES_SQL = `
CREATE TABLE IF NOT EXISTS ad_providers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active','paused')),
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ad_zones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id  INTEGER NOT NULL REFERENCES ad_providers(id),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('popunder','banner','native','push','preroll_vast','midroll_vast','interstitial')),
  integration  TEXT NOT NULL CHECK (integration IN ('script','html','click_url','vast_url')),
  script_url   TEXT NULL CHECK (script_url IS NULL OR script_url LIKE 'http://%' OR script_url LIKE 'https://%'),
  html_snippet TEXT NULL,
  click_url    TEXT NULL CHECK (click_url IS NULL OR click_url LIKE 'http://%' OR click_url LIKE 'https://%'),
  vast_url     TEXT NULL CHECK (vast_url IS NULL OR vast_url LIKE 'http://%' OR vast_url LIKE 'https://%'),
  zone_key     TEXT NULL,
  width        INTEGER NULL,
  height       INTEGER NULL,
  active       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ad_slots (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_key   TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  types      TEXT NOT NULL,
  page_scope TEXT NOT NULL DEFAULT 'all' CHECK (page_scope IN ('all','watch_only')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ad_slot_assignments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_key        TEXT NOT NULL REFERENCES ad_slots(slot_key),
  zone_id         INTEGER NOT NULL REFERENCES ad_zones(id),
  priority        INTEGER NOT NULL DEFAULT 1,
  weight          INTEGER NOT NULL DEFAULT 1,
  device          TEXT NOT NULL DEFAULT 'all' CHECK (device IN ('all','mobile','desktop')),
  start_at        TEXT NULL,
  end_at          TEXT NULL,
  frequency_cap   INTEGER NOT NULL DEFAULT 1,
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ad_zones_provider  ON ad_zones(provider_id);
CREATE INDEX IF NOT EXISTS idx_ad_zones_active    ON ad_zones(active);
CREATE INDEX IF NOT EXISTS idx_ad_assign_slot     ON ad_slot_assignments(slot_key, active, priority);
CREATE INDEX IF NOT EXISTS idx_ad_assign_zone     ON ad_slot_assignments(zone_id);
`;

// ─── 2) Missing House-ads columns (ALTER — checked via PRAGMA before apply) ──

const HOUSE_COLUMNS = [
  { name: 'click_url',       ddl: "ALTER TABLE ads ADD COLUMN click_url TEXT NULL CHECK (click_url IS NULL OR click_url LIKE 'http://%' OR click_url LIKE 'https://%')" },
  { name: 'weight',          ddl: "ALTER TABLE ads ADD COLUMN weight INTEGER NOT NULL DEFAULT 1" },
  { name: 'device',          ddl: "ALTER TABLE ads ADD COLUMN device TEXT NOT NULL DEFAULT 'all'" },
  { name: 'start_at',        ddl: "ALTER TABLE ads ADD COLUMN start_at TEXT NULL" },
  { name: 'end_at',          ddl: "ALTER TABLE ads ADD COLUMN end_at TEXT NULL" },
  { name: 'frequency_cap',   ddl: "ALTER TABLE ads ADD COLUMN frequency_cap INTEGER NOT NULL DEFAULT 1" },
  { name: 'frequency_hours', ddl: "ALTER TABLE ads ADD COLUMN frequency_hours INTEGER NOT NULL DEFAULT 24" },
  { name: 'impression_cap',  ddl: "ALTER TABLE ads ADD COLUMN impression_cap INTEGER NULL" },
  { name: 'updated_at',      ddl: "ALTER TABLE ads ADD COLUMN updated_at TEXT NULL" },
];

// ─── 3) Seeds — presets PAUSED (user pastes real zone/script from dashboard) ──

const SEED_SQL = `
INSERT OR IGNORE INTO ad_providers (name, slug, status, notes) VALUES
  ('PropellerAds', 'propellerads', 'paused', 'popunder, push, banner — paste zone script from dashboard'),
  ('Adsterra',     'adsterra',     'paused', 'popunder, native, banner — paste zone script from dashboard'),
  ('ExoClick',     'exoclick',     'paused', 'popunder, banner, VAST video — paste zone id / VAST URL'),
  ('PopAds',       'popads',       'paused', 'popunder — paste popunder code / click URL'),
  ('PopCash',      'popcash',      'paused', 'popunder — paste popunder code'),
  ('HilltopAds',   'hilltopads',   'paused', 'popunder, native — paste zone script'),
  ('TrafficStars', 'trafficstars', 'paused', 'popunder, banner, native — paste zone script / VAST'),
  ('Custom',       'custom',       'paused', 'any other network (RichAds, Galaksion, Clickadu, GAM…) — paste script / HTML / click URL / VAST URL');

INSERT OR IGNORE INTO ad_slots (slot_key, name, types, page_scope) VALUES
  ('home-after-hero',      'هوم — بعد قسم الهيرو',          '["banner","native","html"]', 'all'),
  ('details-below-player', 'صفحة التفاصيل — تحت المشغّل',    '["banner","native"]',        'all'),
  ('watch-preroll',        'المشاهدة — إعلان قبل الفيلم',   '["preroll_vast"]',           'watch_only'),
  ('watch-midroll',        'المشاهدة — إعلان منتصف الفيلم', '["midroll_vast"]',           'watch_only'),
  ('global-popunder',      'بوبندر — صفحات المشاهدة فقط',   '["popunder"]',               'watch_only');
`;

// ─── 4) Demo deactivation — DO NOT run on production without explicit approval
//      (the live site reads `ads`; this takes effect immediately).

const DEMO_OFF_SQL = `
UPDATE ads SET active = 0, updated_at = datetime('now')
WHERE title LIKE '%تجريبي%' OR content LIKE '%example.com%';
`;

// ─── Execution helpers (APPLY mode only) ─────────────────────────────────────

async function executeSQL(sql) {
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_D1_TOKEN missing in .env.local');
  const res = await fetch(D1_HTTP_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`D1 HTTP ${res.status}: ${text}`);
  const data = JSON.parse(text);
  if (!data.success) {
    throw new Error(`D1 query failed: ${(data.errors || []).map(e => `[${e.code}] ${e.message}`).join(', ')}`);
  }
  return data.result?.[0]?.results || [];
}

async function getExistingHouseColumns() {
  const rows = await executeSQL(`PRAGMA table_info(ads)`);
  return rows.map(r => r.name);
}

async function apply() {
  console.log('🚀 APPLYING ads-mediation migration (additive only, no DROP)…');
  console.log(`📊 Account: ${ACCOUNT_ID} | Database: ${DATABASE_ID}\n`);

  console.log('1/4 — creating tables + indexes…');
  await executeSQL(TABLES_SQL);

  console.log('2/4 — adding missing house-ads columns…');
  const existing = await getExistingHouseColumns();
  for (const col of HOUSE_COLUMNS) {
    if (existing.includes(col.name)) {
      console.log(`   skip ${col.name} (already exists)`);
      continue;
    }
    await executeSQL(col.ddl);
    console.log(`   added ads.${col.name}`);
  }

  console.log('3/4 — seeding providers (paused) + slots…');
  await executeSQL(SEED_SQL);

  if (process.argv.includes('--deactivate-demo')) {
    console.log('4/4 — deactivating demo/example.com house ads…');
    await executeSQL(DEMO_OFF_SQL);
  } else {
    console.log('4/4 — demo deactivation SKIPPED (pass --deactivate-demo to enable).');
  }

  console.log('\nDONE — migration complete.');
}

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toUpperCase() === 'YES'); });
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' ADS MEDIATION MIGRATION — additive only (no DROP, ads preserved)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const applyMode = process.argv.includes('--apply');

  console.log('── Full SQL ──────────────────────────────────────────────────\n');
  console.log(TABLES_SQL);
  console.log('-- missing house columns (executed only if missing, via PRAGMA check):');
  for (const col of HOUSE_COLUMNS) console.log(`${col.ddl};`);
  console.log(SEED_SQL);
  console.log('-- demo deactivation (ONLY with --deactivate-demo, affects live site):');
  console.log(DEMO_OFF_SQL);
  console.log('── End of SQL ────────────────────────────────────────────────\n');

  if (!applyMode) {
    console.log('PRINT-ONLY mode — nothing was executed.');
    console.log('To apply: node scripts/migrate-ads-mediation.js --apply');
    console.log('WARNING: PRODUCTION database (834bca43… / b50ec43e…) — needs explicit approval.');
    return;
  }

  console.log('APPLY MODE — this touches the LIVE production D1 database.');
  const ok = await confirm('Type YES to confirm: ');
  if (!ok) {
    console.log('Aborted — nothing was executed.');
    process.exit(1);
  }

  try {
    await apply();
  } catch (err) {
    console.error(`MIGRATION FAILED: ${err.message}`);
    process.exit(1);
  }
}

main();
