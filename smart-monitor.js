#!/usr/bin/env node
/**
 * 🧠 مراقب ذكي - يحلل المشاكل ويحلها
 */

const { spawn } = require('child_process');
const fs = require('fs');
const Database = require('better-sqlite3');

const SCRIPTS = [
  {
    name: 'سحب الأفلام',
    command: 'node',
    args: ['scripts/INGEST-MOVIES-LOGIC.js'],
    type: 'movies',
    enabled: true
  },
  {
    name: 'سحب المسلسلات',
    command: 'node',
    args: ['scripts/INGEST-SERIES-LOGIC.js'],
    type: 'series',
    enabled: true
  },
  {
    name: 'توليد الأوصاف',
    command: 'node',
    args: ['generate-ai-overviews-fixed.js'],
    type: 'ai',
    enabled: true
  }
];

const processes = new Map();
const processOutputs = new Map();
const processErrors = new Map();
const stats = {
  checks: 0,
  issues: {},
  fixes: {}
};

function log(message) {
  const timestamp = new Date().toLocaleString('ar-SA');
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync('smart-monitor.log', logMessage + '\n');
}

// تحليل المخرجات للكشف عن المشاكل
function analyzeOutput(script, output) {
  const issues = [];
  
  // مشاكل شائعة
  if (output.includes('ECONNREFUSED')) {
    issues.push({ type: 'connection', message: 'فشل الاتصال بالخادم' });
  }
  if (output.includes('ETIMEDOUT')) {
    issues.push({ type: 'timeout', message: 'انتهت مهلة الاتصال' });
  }
  if (output.includes('429') || output.includes('Rate limit')) {
    issues.push({ type: 'rate_limit', message: 'تجاوز حد الطلبات' });
  }
  if (output.includes('SQLITE_BUSY') || output.includes('database is locked')) {
    issues.push({ type: 'db_locked', message: 'قاعدة البيانات مقفلة' });
  }
  if (output.includes('out of memory') || output.includes('ENOMEM')) {
    issues.push({ type: 'memory', message: 'نفذت الذاكرة' });
  }
  if (output.includes('401') || output.includes('Unauthorized')) {
    issues.push({ type: 'auth', message: 'مشكلة في المفتاح' });
  }
  if (output.includes('404') || output.includes('Not Found')) {
    issues.push({ type: 'not_found', message: 'المورد غير موجود' });
  }
  if (output.includes('no such column') || output.includes('syntax error')) {
    issues.push({ type: 'sql_error', message: 'خطأ في SQL' });
  }
  
  return issues;
}

// فحص تقدم السكريبت
function checkProgress(script) {
  const output = processOutputs.get(script.name) || '';
  const lastLines = output.split('\n').slice(-20).join('\n');
  
  // تحليل التقدم
  const progress = {
    isWorking: false,
    hasData: false,
    rate: 0,
    lastActivity: null
  };
  
  // كشف النشاط
  if (lastLines.includes('Processing') || 
      lastLines.includes('✅') || 
      lastLines.includes('⏳') ||
      lastLines.includes('Success')) {
    progress.isWorking = true;
  }
  
  // كشف البيانات
  if (lastLines.match(/\d+\/\d+/) || lastLines.match(/\d+ works/)) {
    progress.hasData = true;
  }
  
  // كشف السرعة
  const rateMatch = lastLines.match(/(\d+\.?\d*)\s*(works?|فيلم|مسلسل)\/(\w+)/);
  if (rateMatch) {
    progress.rate = parseFloat(rateMatch[1]);
  }
  
  return progress;
}

// فحص قاعدة البيانات
function checkDatabase(script) {
  try {
    const db = new Database('./data/4cima-local.db', { readonly: true, timeout: 5000 });
    
    let query, result;
    if (script.type === 'movies') {
      query = 'SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL AND is_filtered = 0';
    } else if (script.type === 'series') {
      query = 'SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NULL AND is_filtered = 0';
    } else if (script.type === 'ai') {
      query = 'SELECT COUNT(*) as c FROM movies WHERE overview_ar IS NULL AND overview_en IS NOT NULL';
    }
    
    if (query) {
      result = db.prepare(query).get();
      db.close();
      return { remaining: result.c, error: null };
    }
    
    db.close();
    return { remaining: null, error: null };
  } catch (error) {
    return { remaining: null, error: error.message };
  }
}

// حل المشكلة
function fixIssue(script, issue) {
  log(`🔧 محاولة حل المشكلة: ${issue.type} - ${issue.message}`);
  
  stats.fixes[issue.type] = (stats.fixes[issue.type] || 0) + 1;
  
  switch (issue.type) {
    case 'rate_limit':
      log(`⏳ انتظار 60 ثانية للسماح بالطلبات...`);
      setTimeout(() => {
        log(`🔄 إعادة تشغيل بعد انتهاء حد الطلبات`);
        restartScript(script);
      }, 60000);
      return true;
      
    case 'db_locked':
      log(`⏳ انتظار 10 ثواني لتحرير قاعدة البيانات...`);
      setTimeout(() => {
        log(`🔄 إعادة تشغيل بعد تحرير قاعدة البيانات`);
        restartScript(script);
      }, 10000);
      return true;
      
    case 'timeout':
    case 'connection':
      log(`⏳ انتظار 30 ثانية قبل إعادة المحاولة...`);
      setTimeout(() => {
        log(`🔄 إعادة تشغيل بعد مشكلة الاتصال`);
        restartScript(script);
      }, 30000);
      return true;
      
    case 'auth':
      log(`❌ مشكلة في المفتاح - يحتاج تدخل يدوي`);
      log(`📝 تحقق من ملف .env.local`);
      return false;
      
    case 'sql_error':
      log(`❌ خطأ في SQL - يحتاج تدخل يدوي`);
      log(`📝 تحقق من السكريبت: ${script.args[0]}`);
      return false;
      
    case 'memory':
      log(`⚠️  نفذت الذاكرة - إعادة تشغيل مع تأخير`);
      setTimeout(() => {
        log(`🔄 إعادة تشغيل بعد تحرير الذاكرة`);
        restartScript(script);
      }, 20000);
      return true;
      
    default:
      log(`⚠️  مشكلة غير معروفة - إعادة تشغيل بعد 15 ثانية`);
      setTimeout(() => {
        restartScript(script);
      }, 15000);
      return true;
  }
}

// إعادة تشغيل سكريبت
function restartScript(script) {
  const proc = processes.get(script.name);
  if (proc && !proc.killed) {
    proc.kill();
  }
  processes.delete(script.name);
  processOutputs.delete(script.name);
  processErrors.delete(script.name);
  
  setTimeout(() => startScript(script), 2000);
}

// بدء سكريبت
function startScript(script) {
  if (!script.enabled) return;
  
  log(`🚀 بدء: ${script.name}`);
  
  const proc = spawn(script.command, script.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });
  
  let output = '';
  let errors = '';
  
  proc.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    processOutputs.set(script.name, output);
    
    // عرض آخر سطر فقط
    const lastLine = text.trim().split('\n').pop();
    if (lastLine && !lastLine.includes('Warning')) {
      log(`📊 [${script.name}] ${lastLine.substring(0, 150)}`);
    }
  });
  
  proc.stderr.on('data', (data) => {
    const text = data.toString();
    errors += text;
    processErrors.set(script.name, errors);
    
    if (!text.includes('Warning') && !text.includes('MODULE_TYPELESS')) {
      log(`⚠️  [${script.name}] ${text.substring(0, 150)}`);
    }
  });
  
  proc.on('exit', (code) => {
    log(`⚠️  [${script.name}] توقف بكود: ${code}`);
    
    // تحليل السبب
    const allOutput = output + errors;
    const issues = analyzeOutput(script, allOutput);
    
    if (issues.length > 0) {
      log(`🔍 تم اكتشاف ${issues.length} مشكلة:`);
      issues.forEach(issue => {
        log(`   - ${issue.type}: ${issue.message}`);
        stats.issues[issue.type] = (stats.issues[issue.type] || 0) + 1;
      });
      
      // محاولة حل المشكلة الأولى
      const fixed = fixIssue(script, issues[0]);
      if (!fixed) {
        log(`❌ لا يمكن حل المشكلة تلقائياً - يحتاج تدخل يدوي`);
      }
    } else if (code === 0) {
      log(`✅ [${script.name}] انتهى بنجاح`);
    } else {
      log(`⚠️  [${script.name}] توقف بدون سبب واضح - إعادة تشغيل بعد 10 ثواني`);
      setTimeout(() => restartScript(script), 10000);
    }
    
    processes.delete(script.name);
  });
  
  processes.set(script.name, proc);
}

// فحص ذكي دوري
function smartCheck() {
  stats.checks++;
  log('\n' + '═'.repeat(80));
  log(`🧠 فحص ذكي #${stats.checks}`);
  log('═'.repeat(80));
  
  SCRIPTS.forEach(script => {
    if (!script.enabled) return;
    
    const proc = processes.get(script.name);
    
    if (!proc || proc.killed) {
      log(`❌ [${script.name}] غير نشط`);
      return;
    }
    
    log(`\n📊 تحليل: ${script.name}`);
    
    // فحص التقدم
    const progress = checkProgress(script);
    log(`   النشاط: ${progress.isWorking ? '✅ يعمل' : '⚠️  متوقف'}`);
    log(`   البيانات: ${progress.hasData ? '✅ موجودة' : '⚠️  غير موجودة'}`);
    if (progress.rate > 0) {
      log(`   السرعة: ${progress.rate} عمل/وحدة`);
    }
    
    // فحص قاعدة البيانات
    const dbStatus = checkDatabase(script);
    if (dbStatus.remaining !== null) {
      log(`   المتبقي: ${dbStatus.remaining.toLocaleString()} عمل`);
      
      if (dbStatus.remaining === 0) {
        log(`   ✅ اكتمل - لا يوجد المزيد`);
      }
    }
    if (dbStatus.error) {
      log(`   ⚠️  خطأ DB: ${dbStatus.error}`);
    }
    
    // تحليل المخرجات للمشاكل
    const output = processOutputs.get(script.name) || '';
    const issues = analyzeOutput(script, output);
    
    if (issues.length > 0) {
      log(`   ⚠️  مشاكل محتملة: ${issues.length}`);
      issues.forEach(issue => {
        log(`      - ${issue.type}: ${issue.message}`);
      });
    } else {
      log(`   ✅ لا توجد مشاكل`);
    }
  });
  
  // إحصائيات
  log('\n📈 إحصائيات المشاكل:');
  Object.entries(stats.issues).forEach(([type, count]) => {
    log(`   ${type}: ${count} مرة`);
  });
  
  log('\n🔧 إحصائيات الحلول:');
  Object.entries(stats.fixes).forEach(([type, count]) => {
    log(`   ${type}: ${count} مرة`);
  });
}

// بدء
log('🧠 بدء المراقب الذكي\n');
log('═'.repeat(80));

SCRIPTS.forEach(script => {
  if (script.enabled) {
    startScript(script);
    stats.issues[script.name] = 0;
    stats.fixes[script.name] = 0;
  }
});

// فحص ذكي كل 3 دقائق
setInterval(smartCheck, 180000);

// فحص أولي بعد دقيقة
setTimeout(smartCheck, 60000);

// معالج الإغلاق
process.on('SIGINT', () => {
  log('\n\n🛑 إيقاف المراقب الذكي...');
  processes.forEach((proc, name) => {
    log(`🛑 إيقاف: ${name}`);
    proc.kill();
  });
  log('✅ تم إيقاف جميع العمليات');
  process.exit(0);
});

log('\n✅ المراقب الذكي يعمل الآن');
log('📊 سيتم الفحص الذكي كل 3 دقائق');
log('⌨️  اضغط Ctrl+C للإيقاف\n');
