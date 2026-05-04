// إعادة تشغيل سكريبت توليد الأوصاف بعد الإصلاح
const { spawn } = require('child_process');

console.log('🔄 إعادة تشغيل سكريبت توليد الأوصاف بعد الإصلاح...\n');

const proc = spawn('node', ['generate-ai-overviews-fixed.js'], {
  stdio: 'inherit',
  shell: true
});

proc.on('exit', (code) => {
  console.log(`\n✅ انتهى بكود: ${code}`);
});
