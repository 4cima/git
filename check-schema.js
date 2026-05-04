#!/usr/bin/env node

import Database from 'better-sqlite3';

const db = new Database('./data/4cima-local.db');

console.log('\n📊 Database Tables:\n');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => console.log(`  - ${t.name}`));

console.log('\n📋 Movies Table Columns:\n');
const movieCols = db.prepare("PRAGMA table_info(movies)").all();
movieCols.forEach(c => console.log(`  - ${c.name} (${c.type})`));

console.log('\n📋 Series Table Columns:\n');
const seriesCols = db.prepare("PRAGMA table_info(series)").all();
seriesCols.forEach(c => console.log(`  - ${c.name} (${c.type})`));

db.close();
