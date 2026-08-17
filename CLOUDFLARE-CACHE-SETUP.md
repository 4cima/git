# Cloudflare Cache Rules Setup Guide

## Context
4cima.com is already proxied through Cloudflare (orange cloud). Currently ALL requests go to origin (Koyeb) → Turso database, causing 1.6B+ rows-read per month on free tier.

## Goal
Configure Cloudflare Cache Rules to serve most responses from edge, drastically reducing origin hits.

## Prerequisites
- Cloudflare account with 4cima.com domain
- Free tier is sufficient (Cache Rules available on free)
- Code changes already deployed (public Cache-Control headers added)

---

## Step 1: Enable Cache Everything Rules

Login to Cloudflare dashboard → 4cima.com → **Caching** → **Cache Rules**

### Rule 1: Cache API GET Requests
**Rule Name:** Cache API GETs  
**When incoming requests match:** Custom filter expression
```
(http.request.method eq "GET" and http.request.uri.path starts_with "/api/home") or
(http.request.method eq "GET" and http.request.uri.path starts_with "/api/movies") or
(http.request.method eq "GET" and http.request.uri.path starts_with "/api/series") or
(http.request.method eq "GET" and http.request.uri.path starts_with "/api/genres") or
(http.request.method eq "GET" and http.request.uri.path starts_with "/api/tv") or
(http.request.method eq "GET" and http.request.uri.path starts_with "/api/search")
```

**Then:**
- **Cache eligibility:** Eligible for cache
- **Edge TTL:** Respect origin Cache-Control headers
- **Browser TTL:** Respect origin Cache-Control headers

**Priority:** 1

---

### Rule 2: Cache Static Pages
**Rule Name:** Cache Pages  
**When incoming requests match:** Custom filter expression
```
(http.request.method eq "GET" and http.request.uri.path eq "/") or
(http.request.method eq "GET" and http.request.uri.path eq "/movies") or
(http.request.method eq "GET" and http.request.uri.path eq "/series") or
(http.request.method eq "GET" and http.request.uri.path starts_with "/movies/") or
(http.request.method eq "GET" and http.request.uri.path starts_with "/series/") or
(http.request.method eq "GET" and http.request.uri.path starts_with "/genres/") or
(http.request.method eq "GET" and http.request.uri.path eq "/sitemap.xml")
```

**Then:**
- **Cache eligibility:** Eligible for cache
- **Edge TTL:** Respect origin Cache-Control headers
- **Browser TTL:** Respect origin Cache-Control headers

**Priority:** 2

---

## Step 2: Configure Super Bot Fight Mode

Go to **Security** → **Bots**

**Free Tier Settings:**
- Enable **Bot Fight Mode**
- This blocks known malicious bots automatically
- No configuration needed

**Pro/Business Tier Settings** (if available):
- Enable **Super Bot Fight Mode**
- Block: Definitely automated
- Challenge: Likely automated
- Allow: Verified bots (Google, Bing, etc.)

---

## Step 3: Configure Rate Limiting (Optional)

Go to **Security** → **WAF** → **Rate limiting rules**

### Rule: Limit Search API
**Rule Name:** Limit Search API  
**When incoming requests match:**
```
http.request.uri.path eq "/api/search"
```

**With the same characteristics:**
- Requests from the same IP address

**Then:**
- **Perform action:** Block
- **For duration:** 60 seconds
- **When rate exceeds:** 60 requests per 60 seconds

---

## Step 4: Verify Configuration

### Test Cache Headers
```bash
curl -I https://4cima.com/api/home
# Look for: cf-cache-status: HIT (on second request)
```

### Test API Response
```bash
# First request (MISS)
curl -I https://4cima.com/api/movies?page=1

# Second request (should be HIT)
curl -I https://4cima.com/api/movies?page=1
```

### Check Cloudflare Analytics
Dashboard → **Analytics & Logs** → **Traffic**
- Monitor cache hit ratio (target: >70%)
- Check bandwidth saved
- Monitor request count to origin

---

## Expected Impact

### Before:
- Every request → Origin (Koyeb) → Turso database
- 1.6B+ rows-read per month
- High latency for international users

### After:
- 70-80% requests served from Cloudflare edge
- ~70-80% reduction in Turso rows-read
- Faster response times globally
- Origin bandwidth saved

### Cache TTLs (from code):
- `/api/home`: 1 hour (3600s)
- `/api/movies`: 1 minute (60s)
- `/api/series`: 1-5 minutes (60-300s)
- `/api/genres/[slug]`: 5 minutes (300s)
- `/api/tv`: 1 minute (60s)
- Detail pages: 1 hour (3600s)

---

## Purge Cache When Needed

After Turso sync completes, purge Cloudflare cache:

### Option 1: Purge Everything (simple)
Dashboard → **Caching** → **Configuration** → **Purge Everything**

### Option 2: Purge by URL (selective)
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://4cima.com/api/home","https://4cima.com/api/movies"]}'
```

### Option 3: Automated purge after sync (future)
Add to sync script after completion:
```javascript
await fetch('https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ purge_everything: true })
})
```

---

## Troubleshooting

### Cache not working (always MISS)
- Check origin sends `public` in Cache-Control header
- Verify no `Set-Cookie` headers (disables caching)
- Check Cache Rules are enabled and prioritized correctly

### Stale data after update
- Purge cache manually
- Wait for TTL to expire naturally
- Reduce TTL if updates are frequent

### Too many origin hits
- Check cache hit ratio in Analytics
- Verify query parameters are consistent (Cloudflare caches by full URL)
- Consider increasing TTLs for stable content

---

## Notes

- robots.txt already updated to block filter-combo URLs
- Next.js revalidation API exists at `/api/revalidate` (requires REVALIDATE_SECRET)
- Can use Next.js on-demand revalidation + Cloudflare purge for instant updates
