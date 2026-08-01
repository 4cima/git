# 🔬 الهندسة العكسية: من الدومين للمصدر

## المسار الحقيقي (بالأدلة):

```
المستخدم يفتح: https://4cima.com
           ↓
    [DNS Resolution]
           ↓
    104.21.59.159 (Cloudflare IP)
           ↓
    [Cloudflare = Proxy/CDN فقط]
           ↓ (proxies to)
    Koyeb Backend (fra datacenter)
           ↓
    [Koyeb Container]
           ↓
    Code returns: 10 items (not 50!)
           ↓
    Response Headers:
    - x-koyeb-backend: fra
    - x-koyeb-brand: koyeb_default
    - Server: cloudflare (proxy)
```

---

## 🔍 الأدلة الدامغة:

### 1. DNS يشاور على Cloudflare
```bash
nslookup 4cima.com
→ 104.21.59.159 (AS13335 Cloudflare, Inc.)
```

### 2. Cloudflare مجرد Proxy (مش Pages!)
```http
Server: cloudflare
CF-Cache-Status: DYNAMIC
X-Koyeb-Backend: fra  ← الدليل!
```
**المعنى:** Cloudflare بيمرر الطلب لـ Koyeb، مش بيبني حاجة.

### 3. Koyeb بيرد بكود قديم
```json
/api/home → 10 items (not 50)
/api/genres → missing movie_count/series_count fields
```
**المعنى:** الكود المبني على Koyeb مش آخر إصدار.

### 4. الكود المحلي مختلف
```typescript
// src/app/api/home/route.ts
LIMIT 50  ← الكود الصح

// لكن Koyeb بيرجع 10
// معناه: Koyeb مش شايف الكود ده!
```

### 5. الريبوهات المتاحة
```
Iaaelsadek/4cima  → pushed: 04/05/2026 (قديم)
Iaaelsadek/cinma  → pushed: 31/07/2026 (اليوم!)
4cima/git         → pushed: 31/07/2026 (اليوم!)
```

---

## 💡 الاستنتاج الوحيد:

**Koyeb متصل بـ `Iaaelsadek/4cima` (الريبو القديم)!**

ليه؟
- آخر push على `Iaaelsadek/4cima`: **04/05/2026**
- الكود بيرجع **10 items** (الرقم القديم)
- مفيش `genre_counts` support

---

## ✅ الحل الصحيح:

### Option A: Update Koyeb Source
1. افتح Koyeb Dashboard: https://app.koyeb.com
2. دوّر على Service اللي شغال `4cima.com`
3. Settings → Source
4. غيّر من `Iaaelsadek/4cima` إلى `4cima/git`
5. Save & Deploy

### Option B: Push للريبو القديم
```bash
cd D:\4cima
git remote add old https://github.com/Iaaelsadek/4cima.git
git push old main
```

---

## 📊 الدورة الصحيحة (موثقة):

```
Local Code (D:\4cima)
      ↓ git push
github.com/4cima/git ✅ (updated today)
      ↓ ??? (NO CONNECTION)
github.com/Iaaelsadek/4cima ✅ (Koyeb reads from here!)
      ↓ auto-deploy
Koyeb (fra backend)
      ↓ serves
Cloudflare (proxy) → 104.21.59.159
      ↓
4cima.com (shows OLD code)
```

---

## 🚨 الخطأ في التحليل السابق:

كنت افترضت إن:
- Cloudflare Pages بيبني ✗
- Koyeb بيسحب من `4cima/git` ✗

الحقيقة:
- Cloudflare = proxy only ✓
- Koyeb بيسحب من `Iaaelsadek/4cima` ✓

---

## ⚡ الإجراء الفوري:

افتح Koyeb Dashboard **دلوقتي** وشوف:
- Service name: ???
- Source repo: `Iaaelsadek/4cima` ← غيّره!
- Target repo: `4cima/git`
- Branch: `main`

**التوقع:** بمجرد ما تغير الـ source، Koyeb هيعمل deploy جديد في 3-5 دقايق، والموقع هيظهر الكود الصح.
