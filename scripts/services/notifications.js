// ═══════════════════════════════════════════════════════════════════
// 🔔 Webhook Notifications
// ═══════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار عند اكتمال أو فشل السحب
 * 
 * @param {string} type - 'success' أو 'error'
 * @param {object} data - البيانات
 */
async function sendNotification(type, data) {
  const isSuccess = type === 'success'
  
  // Discord Webhook
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: isSuccess ? '✅ اكتمل السحب' : '❌ خطأ في السحب',
            description: isSuccess 
              ? `**السكريبت:** ${data.scriptName}
**المعالج:** ${data.processed?.toLocaleString() || 0}
**الأخطاء:** ${data.errors?.toLocaleString() || 0}
**الوقت:** ${data.duration?.toFixed(1) || 0} دقيقة
**السرعة:** ${data.rate?.toFixed(0) || 0}/دقيقة`
              : `**السكريبت:** ${data.scriptName}
**الخطأ:** ${data.error}`,
            color: isSuccess ? 0x00ff00 : 0xff0000,
            timestamp: new Date().toISOString()
          }]
        })
      })
      console.log('✅ تم إرسال إشعار Discord')
    } catch (error) {
      console.log('⚠️ فشل إرسال إشعار Discord:', error.message)
    }
  }
  
  // Slack Webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: isSuccess ? '✅ اكتمل السحب' : '❌ خطأ في السحب',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: isSuccess
                ? `*السكريبت:* ${data.scriptName}\n*المعالج:* ${data.processed}\n*الأخطاء:* ${data.errors}\n*الوقت:* ${data.duration} دقيقة`
                : `*السكريبت:* ${data.scriptName}\n*الخطأ:* ${data.error}`
            }
          }]
        })
      })
      console.log('✅ تم إرسال إشعار Slack')
    } catch (error) {
      console.log('⚠️ فشل إرسال إشعار Slack:', error.message)
    }
  }
}

module.exports = { sendNotification }
