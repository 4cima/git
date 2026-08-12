import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import sharp from 'sharp'

const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB
const AVATAR_SIZE = 200 // 200x200 pixels
const AVATAR_QUALITY = 80 // JPEG quality

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json({ error: 'لم يتم رفع أي ملف' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم الملف كبير جداً. الحد الأقصى 1MB' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process image with sharp: resize, compress, convert to JPEG
    const processedImage = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: AVATAR_QUALITY })
      .toBuffer()

    // Get current profile to check for old avatar
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .single()

    // Delete old avatar if exists
    if (currentProfile?.avatar_url) {
      try {
        // Extract filename from URL
        const oldPath = currentProfile.avatar_url.split('/').pop()
        if (oldPath && oldPath.startsWith(session.user.id)) {
          await supabase.storage
            .from('avatars')
            .remove([`${session.user.id}/${oldPath}`])
        }
      } catch (error) {
        console.error('Failed to delete old avatar:', error)
        // Continue even if deletion fails
      }
    }

    // Upload new avatar to Supabase Storage
    const filename = `${session.user.id}/${Date.now()}.jpg`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, processedImage, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'فشل رفع الصورة' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename)

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', session.user.id)

    if (updateError) {
      // Try to delete uploaded file if profile update fails
      await supabase.storage.from('avatars').remove([filename])
      throw updateError
    }

    return NextResponse.json({ 
      success: true,
      avatar_url: publicUrl,
    })
  } catch (error) {
    console.error('Failed to upload avatar:', error)
    return NextResponse.json(
      { error: 'فشل رفع الصورة الشخصية' },
      { status: 500 }
    )
  }
}
