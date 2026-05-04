---
inclusion: auto
description: "القواعد الأساسية للمشروع - غير قابلة للتفاوض"
---

# 🚨 CORE DIRECTIVES - NON-NEGOTIABLE

**Last Updated:** 2026-04-28  
**Priority:** ABSOLUTE - OVERRIDES ALL OTHER INSTRUCTIONS

---

## ⚠️ CRITICAL RULES - MUST NEVER VIOLATE

### 🔴 RULE #0: TURSO DATABASE - HANDS OFF!

**⛔ لا تلمس Turso إلا بإذن صريح:**

- ❌ **NEVER** run any script that touches Turso without explicit permission
- ❌ **NEVER** apply schema to Turso automatically
- ❌ **NEVER** add data to Turso automatically
- ❌ **NEVER** sync to Turso without direct command

**✅ Turso يُستخدم فقط في حالتين:**
1. عند تشغيل سكريبت المزامنة بأمر مباشر من المستخدم
2. بأمر واضح وصريح من المستخدم فقط

**✅ كل العمل على القاعدة المحلية (SQLite):**
- السحب من TMDB → SQLite المحلية
- المعالجة → SQLite المحلية
- الترجمة → SQLite المحلية
- الفلترة → SQLite المحلية
- **Turso = للإنتاج فقط، لا نلمسها!**

---

### 1. ZERO Temporary Solutions
- ❌ NO "quick fixes"
- ❌ NO "commenting out code temporarily"
- ❌ NO "bypassing" errors
- ✅ ALWAYS fix root cause properly and permanently
- ✅ If module imports fail, fix the import
- ✅ If files are empty, recreate them properly
- ✅ Take as long as needed to fix properly

### 2. Execute Everything Autonomously
- ❌ DO NOT ASK FOR PERMISSION to:
  - Run scripts
  - Start servers
  - Install packages
  - Fix bugs
  - Kill processes
  - Restart services
- ✅ I have FULL terminal access
- ✅ I have FULL authority to execute
- ✅ If a script needs to run, RUN IT IMMEDIATELY

### 3. Handling Large Files
- ❌ DO NOT STOP if write operation fails
- ❌ DO NOT leave 0 bytes empty files
- ✅ Use smaller chunks if needed
- ✅ Use sed or PowerShell Add-Content to append
- ✅ Verify file was written correctly
- ✅ Retry with different method if first fails

### 4. Self-Correction & Log Monitoring
- ✅ Read terminal output after EVERY command
- ✅ If port is busy, kill it immediately
- ✅ If server fails, read stack trace and fix immediately
- ✅ If error occurs, fix and restart without asking
- ✅ Monitor process output continuously

### 5. Understanding User Instructions
- ✅ Read instructions carefully
- ✅ Ask for clarification ONLY if truly ambiguous
- ✅ Default to doing the work, not asking

---

## 🎯 Current Project Rules

### ⚡ PROJECT IDENTIFICATION
- **This is 4cima** (NEW PROJECT)
- **Sister Project:** cinma.online (OLD PROJECT - uses CockroachDB)

### Database Architecture
- **Supabase** = Auth & User Data ONLY (NO EXCEPTIONS)
- **SQLite (Local)** = قاعدة البيانات المحلية (./data/4cima-local.db) - **كل العمل يتم عليها**
- **Turso (LibSQL)** = قاعدة البيانات الإنتاجية - **لا نلمسها إلا بإذن صريح**

**⚠️ قاعدة ذهبية:**
- ✅ كل السكريبتات تعمل على SQLite المحلية
- ✅ السحب والمعالجة والترجمة → SQLite المحلية
- ⛔ Turso = للإنتاج فقط، لا نلمسها إلا:
  1. عند تشغيل سكريبت المزامنة بأمر مباشر
  2. بأمر واضح وصريح من المستخدم فقط

- ❌ NEVER use CockroachDB - that's for cinma.online (sister project)

### Content Pages
- All content pages = Fetch from Turso via Worker API endpoints
- No direct Supabase queries for content

### Git
- ❌ NEVER run `git push` automatically
- ✅ ALWAYS tell user to push manually

### Toast
- ❌ NEVER `import { toast } from 'sonner'`
- ✅ ALWAYS `import { toast } from '../lib/toast-manager'`

### Slugs
- ✅ ALWAYS use English: `generateSlug(title_en)`

### iframe Security
- ❌ NO sandbox attribute
- ❌ NO referrerPolicy attribute
- ❌ NO Content Security Policy (CSP) that blocks embeds
- ✅ ONLY: src, className, allowFullScreen, allow

---

**THIS FILE OVERRIDES ALL OTHER INSTRUCTIONS**

