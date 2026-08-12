require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function testAPIs() {
  try {
    const testUserId = 'test-user-123'
    
    console.log('🧪 Testing Privacy Settings...')
    
    // Test INSERT
    await turso.execute({
      sql: `INSERT OR REPLACE INTO user_privacy_settings (user_id, show_watch_history, show_favorites) 
            VALUES (?, ?, ?)`,
      args: [testUserId, 1, 0]
    })
    console.log('✅ Privacy settings inserted')
    
    // Test SELECT
    const privacyResult = await turso.execute({
      sql: 'SELECT * FROM user_privacy_settings WHERE user_id = ?',
      args: [testUserId]
    })
    console.log('✅ Privacy settings retrieved:', privacyResult.rows[0])
    
    console.log('\n🧪 Testing Notification Settings...')
    
    // Test INSERT
    await turso.execute({
      sql: `INSERT OR REPLACE INTO user_notification_settings (user_id, email_notifications, new_content_notifications) 
            VALUES (?, ?, ?)`,
      args: [testUserId, 1, 1]
    })
    console.log('✅ Notification settings inserted')
    
    // Test SELECT
    const notifResult = await turso.execute({
      sql: 'SELECT * FROM user_notification_settings WHERE user_id = ?',
      args: [testUserId]
    })
    console.log('✅ Notification settings retrieved:', notifResult.rows[0])
    
    // Cleanup test data
    await turso.execute({
      sql: 'DELETE FROM user_privacy_settings WHERE user_id = ?',
      args: [testUserId]
    })
    await turso.execute({
      sql: 'DELETE FROM user_notification_settings WHERE user_id = ?',
      args: [testUserId]
    })
    console.log('\n✅ Test data cleaned up')
    
    console.log('\n✅ All API tests passed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

testAPIs()
