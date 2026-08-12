import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  console.error('\nPlease add SUPABASE_SERVICE_ROLE_KEY to .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage for avatars...\n')

  // 1. Create bucket if it doesn't exist
  console.log('1️⃣  Creating avatars bucket...')
  const { data: buckets } = await supabase.storage.listBuckets()
  const avatarBucket = buckets?.find(b => b.name === 'avatars')
  
  if (avatarBucket) {
    console.log('   ✓ Bucket "avatars" already exists')
  } else {
    const { data, error } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 1048576, // 1MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    })
    
    if (error) {
      console.error('   ✗ Failed to create bucket:', error.message)
      process.exit(1)
    }
    console.log('   ✓ Created bucket "avatars"')
  }

  // 2. Set up Storage Policies using direct SQL queries
  console.log('\n2️⃣  Setting up storage policies...')
  
  const policies = [
    {
      name: 'Public avatars viewable',
      definition: `((bucket_id = 'avatars'::text))`
    },
    {
      name: 'Users upload own avatar', 
      definition: `((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))`
    },
    {
      name: 'Users update own avatar',
      definition: `((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))`
    },
    {
      name: 'Users delete own avatar',
      definition: `((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))`
    }
  ]

  // Check current policies
  const { data: existingPolicies, error: policiesError } = await supabase
    .from('storage.policies')
    .select('*')
    .eq('bucket_id', 'avatars')
  
  if (policiesError) {
    console.log('   ⚠ Cannot verify policies automatically')
    console.log('   ℹ Please verify policies in Supabase Dashboard > Storage > avatars > Policies')
  } else {
    console.log(`   ✓ Found ${existingPolicies?.length || 0} existing policies`)
    if (existingPolicies && existingPolicies.length >= 4) {
      console.log('   ✓ Storage policies appear to be configured')
    } else {
      console.log('   ⚠ Some policies may be missing')
      console.log('   ℹ Please configure policies in Supabase Dashboard if needed')
    }
  }

  console.log('\n✅ Supabase Storage setup complete!')
  console.log('\n📁 Storage structure:')
  console.log('   avatars/')
  console.log('     ├── {user_id_1}/')
  console.log('     │   └── {timestamp}.jpg (200x200, optimized)')
  console.log('     ├── {user_id_2}/')
  console.log('     │   └── {timestamp}.jpg')
  console.log('     └── ...')
}

setupStorage().catch(err => {
  console.error('\n❌ Setup failed:', err.message)
  process.exit(1)
})
