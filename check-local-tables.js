const Database = require('better-sqlite3');

const db = new Database('./local.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

console.log('الجداول الموجودة في local.db:');
tables.forEach(t => console.log('-', t.name));
