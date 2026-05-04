#!/usr/bin/env node
/**
 * 🔄 مراقب تلقائي - يعيد تشغيل السكريبتات إذا توقفت
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPTS = [
  {
    name: 'سحب الأفلام',
    command: 'node',
    args: ['scripts/INGEST-MOVIES-LOGIC.js'],
    enabled: true
  },
  {
    name: 'سحب المسلسلات',
    command: 'node',
    args: ['scripts/INGEST-SERIES-LOGIC.js'],
    enabled: true
  },
  {
    name: 'توليد الأوصاف',
    command: 'node',
    args: ['generate-ai-overviews-fixed.js'],
    enabled: true
  }
];

const processes = new Map();
const stats = {
  restarts: {},
  lastCheck: new Date()
};

// تسجيل الأحداث
function log(message) {
  const timestamp = new Date().toLocaleString('ar-SA');
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // حفظ في ملف
  fs.appendFileSync('monitor.log', logMessage + '\n');
}

// بدء سكريبت
function startScript(script) {
  if (!script.enabled) return;
  
  log(`🚀 بدء: ${script.name}`);
  
  const proc = spawn(script.command, script.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });
  
  proc.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(`📊 [${script.name}] ${output.substring(0, 200)}`);
    }
  });
  
  proc.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error && !error.includes('Warning')) {
      log(`⚠️  [${script.name}] ${error.substring(0, 200)}`);
    }
  });
  
  proc.on('exit', (code) => {
    log(`⚠️  [${script.name}] توقف بكود: ${code}`);
    processes.delete(script.name);
    
    // إعادة التشغيل بعد 5 ثواني
    setTimeout(() => {
      stats.restarts[script.name] = (stats.restarts[script.name] || 0) + 1;
      log(`🔄 إعادة تشغيل: ${script.name} (المرة ${stats.restarts[script.name]})`);
      startScript(script);
    }, 5000);
  });
  
  processes.set(script.name, proc);
}

// فحص دوري
function checkProcesses() {
  log('\n📊 فحص دوري للعمليات...');
  
  SCRIPTS.forEach(script => {
    if (!script.enabled) return;
    
    const proc = processes.get(script.name);
    if (!proc || proc.killed) {
      log(`❌ [${script.name}] غير نشط - إعادة التشغيل...`);
      startScript(script);
    } else {
      log(`✅ [${script.name}] نشط`);
    }
  });
  
  // عرض الإحصائيات
  log('\n📈 إحصائيات إعادة التشغيل:');
  Object.entries(stats.restarts).forEach(([name, count]) => {
    log(`   ${name}: ${count} مرة`);
  });
  
  stats.lastCheck = new Date();
}

// بدء جميع السكريبتات
log('🚀 بدء المراقب التلقائي\n');
log('═'.repeat(80));

SCRIPTS.forEach(script => {
  if (script.enabled) {
    startScript(script);
    stats.restarts[script.name] = 0;
  }
});

// فحص دوري كل 2 دقيقة
setInterval(checkProcesses, 120000);

// فحص أولي بعد 30 ثانية
setTimeout(checkProcesses, 30000);

// معالج الإغلاق
process.on('SIGINT', () => {
  log('\n\n🛑 إيقاف المراقب...');
  
  processes.forEach((proc, name) => {
    log(`🛑 إيقاف: ${name}`);
    proc.kill();
  });
  
  log('✅ تم إيقاف جميع العمليات');
  process.exit(0);
});

log('\n✅ المراقب يعمل الآن');
log('📊 سيتم فحص العمليات كل دقيقتين');
log('⌨️  اضغط Ctrl+C للإيقاف\n');
