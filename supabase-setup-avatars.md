# Supabase Avatar Storage Setup

## يجب تنفيذ هذه الخطوات في Supabase Dashboard

### 1. إنشاء Storage Bucket

انتقل إلى: Storage → Create a new bucket

**اسم الـ bucket:** `avatars`

**الإعدادات:**
- Public bucket: ✅ (نعم)
- File size limit: 2MB
- Allowed MIME types: image/jpeg, image/png, image/webp

### 2. إعداد Storage Policies

انتقل إلى: Storage → avatars → Policies

**سياسة القراءة (Read):**
```sql
CREATE POLICY "Public avatars are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**سياسة الرفع (Upload):**
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**سياسة التحديث (Update):**
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**سياسة الحذف (Delete):**
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. التحقق

بعد التنفيذ، تحقق من:
- ✅ Bucket اسمه `avatars` موجود
- ✅ Public access مفعل
- ✅ 4 policies نشطة

### بنية المسارات

```
avatars/
  ├── {user_id_1}/
  │   └── {timestamp}.jpg
  ├── {user_id_2}/
  │   └── {timestamp}.jpg
  └── ...
```

كل مستخدم له مجلد خاص به، ويمكنه رفع/تحديث/حذف الصور في مجلده فقط.
