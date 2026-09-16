#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../../data/4cima-local.db'), { readonly: true });
const cols = db.prepare(`SELECT cid, name, type FROM pragma_table_info('movies') ORDER BY cid`).all();
for (const c of cols) console.log(`${c.cid} | ${c.name} | ${c.type}`);
console.log('--- sample row ---');
const s = db.prepare(`SELECT * FROM movies LIMIT 1`).get();
console.log(Object.keys(s).join(','));
db.close();
