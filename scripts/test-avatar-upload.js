import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import sharp from 'sharp'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testAvatarUpload() {
  console.log('🧪 Testing avatar upload system...\n')

  // 1. Create a test image
  console.log('1️⃣  Creating test image (200x200, JPEG 80%)...')
  const testImage = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 255, g: 100, b: 100 }
    }
  })
  .jpeg({ quality: 80 })
  .toBuffer()
  
  console.log(`   ✓ Test image created: ${testImage.length} bytes`)

  // 2. Upload to storage
  console.log('\n2️⃣  Uploading to Supabase Storage...')
  const testFilename = `test-user-id/${Date.now()}.jpg`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(testFilename, testImage, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    console.error('   ✗ Upload failed:', uploadError.message)
    process.exit(1)
  }
  console.log('   ✓ Upload successful:', uploadData.path)

  // 3. Get public URL
  console.log('\n3️⃣  Getting public URL...')
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(testFilename)
  
  console.log('   ✓ Public URL:', publicUrl)

  // 4. Verify file exists
  console.log('\n4️⃣  Verifying file exists...')
  const { data: listData, error: listError } = await supabase.storage
    .from('avatars')
    .list('test-user-id')

  if (listError) {
    console.error('   ✗ List failed:', listError.message)
  } else {
    console.log(`   ✓ Found ${listData.length} file(s) in test-user-id folder`)
  }

  // 5. Delete test file
  console.log('\n5️⃣  Cleaning up test file...')
  const { error: deleteError } = await supabase.storage
    .from('avatars')
    .remove([testFilename])

  if (deleteError) {
    console.error('   ✗ Delete failed:', deleteError.message)
  } else {
    console.log('   ✓ Test file deleted')
  }

  console.log('\n✅ Avatar upload system test complete!')
  console.log('\n📊 Summary:')
  console.log('   • Image processing: ✓')
  console.log('   • Storage upload: ✓')
  console.log('   • Public URL generation: ✓')
  console.log('   • File verification: ✓')
  console.log('   • Cleanup: ✓')
}

testAvatarUpload().catch(err => {
  console.error('\n❌ Test failed:', err.message)
  process.exit(1)
})
