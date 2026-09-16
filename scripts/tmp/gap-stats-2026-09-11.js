#!/usr/bin/env node
// قراءة فقط: إحصاءات النسخة الاحتياطية + حالة المحلي (accepted/rejected/محميون/is_complete)
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const outDir = path.join(__dirname, '../../data/backups/gap-apply-2026-09-11');
for (const f of ['gap-8265-full.jsonl', 'accepted-7315.json', 'rejected-950.json']) {
  const p = path.join(outDir, f);
  const st = fs.statSync(p);
  let rows;
  if (f.endsWith('.jsonl')) rows = fs.readFileSync(p, 'utf8').trim().split('\n').length;
  else rows = JSON.parse(fs.readFileSync(p, 'utf8')).length;
  console.log(`${f}: ${(st.size / 1024).toFixed(1)} KB (${st.size} bytes) | rows=${rows}`);
  if (f.endsWith('.jsonl')) {
    const first = fs.readFileSync(p, 'utf8').split('\n')[0];
    console.log(`  sample: ${first.slice(0, 200)}`);
  }
}
const accepted = JSON.parse(fs.readFileSync(path.join(outDir, 'accepted-7315.json'), 'utf8'));
const rejected = JSON.parse(fs.readFileSync(path.join(outDir, 'rejected-950.json'), 'utf8'));
const db = new Database(path.join(__dirname, '../../data/4cima-local.db'), { readonly: true });
const chunk = (a, s) => { const o = []; for (let i = 0; i < a.length; i += s) o.push(a.slice(i, i + s)); return o; };
const pq = (a) => a.map(() => '?').join(',');
let accClean = 0;
for (const c of chunk(accepted, 700)) accClean += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) AND is_filtered=0 AND filter_status='clean'`).get(...c).c;
console.log(`local accepted clean=${accClean} (must 7315)`);
let rejFilt = 0, rejClean = 0;
for (const c of chunk(rejected, 700)) {
  rejFilt += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) AND is_filtered=1`).get(...c).c;
  rejClean += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) AND is_filtered=0 AND filter_status='clean'`).get(...c).c;
}
console.log(`local rejected: is_filtered=1 => ${rejFilt} | clean => ${rejClean} (must stay filtered, not touched)`);
console.log('is_complete distribution for accepted (sample query):');
for (const c of chunk(accepted.slice(0, 700), 700)) {
  const rows = db.prepare(`SELECT is_complete, COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) GROUP BY is_complete`).all(...c);
  console.log('  first700: ' + JSON.stringify(rows));
  break;
}
console.log('is_complete distribution for rejected (first700):');
{
  const c = rejected.slice(0, 700);
  const rows = db.prepare(`SELECT is_complete, COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) GROUP BY is_complete`).all(...c);
  console.log('  first700: ' + JSON.stringify(rows));
}
console.log('full is_complete counts:');
{
  let comp1 = 0, comp0 = 0;
  for (const c of chunk(accepted, 700)) {
    const r1 = db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) AND is_complete=1`).get(...c).c;
    comp1 += r1; comp0 += (c.length - r1);
  }
  console.log(`  accepted: is_complete=1 => ${comp1} | is_complete=0/NULL => ${comp0}`);
}
{
  let comp1 = 0;
  for (const c of chunk(rejected, 700)) {
    comp1 += db.prepare(`SELECT COUNT(*) c FROM movies WHERE tmdb_id IN (${pq(c)}) AND is_complete=1`).get(...c).c;
  }
  console.log(`  rejected: is_complete=1 => ${comp1} | rest => ${rejected.length - comp1}`);
}
const PROT = [398,1576,369885,1408,37135,37136,1266798,910571,250225,451955,10876,1006947,8653,1145810,156236,424762,179129,37432,544575,14428,675414,177248,67415,46086,1163263,304034,417975,362714,624480,289491,484328,874490,911719,32766,10488,202277,226674,39688,943315,269955,27];
console.log('protected overlap check:');
console.log('  in accepted: ' + accepted.filter((id) => PROT.includes(id)).length + ' (must 0)');
console.log('  in rejected: ' + rejected.filter((id) => PROT.includes(id)).length + ' (must 0)');
console.log('protected local status:');
for (const id of PROT) {
  let r = db.prepare(`SELECT is_filtered, filter_status, filter_reason FROM movies WHERE tmdb_id=?`).get(id);
  if (r) { console.log(`  movies ${id}: is_filtered=${r.is_filtered} status=${r.filter_status} reason=${r.filter_reason ?? 'NULL'}`); continue; }
  const t = db.prepare(`SELECT is_filtered, filter_status FROM tv_series WHERE tmdb_id=?`).get(id);
  if (t) console.log(`  tv ${id}: is_filtered=${t.is_filtered} status=${t.filter_status}`);
  else console.log(`  ${id}: MISSING both`);
}
db.close();
console.log('READONLY DONE');
