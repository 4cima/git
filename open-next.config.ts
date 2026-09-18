import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import doShardedTagCache  from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";
import doQueue            from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache:         doShardedTagCache,
  queue:            doQueue,

  // enableCacheInterception: false (by omission) — قرار مرفوض عمدًا، لا تفعّله.
  // السبب: src/edge-cache-worker.ts يعمل بالفعل كاشًا على مستوى الـWorker كله
  // (صفحات + APIs) عبر caches.default بلا حدود مجانية، بينما cache interception
  // بتاع OpenNext لا يعمل إلا داخل مسار الـDO ShardedTagCache ويلفّ على الـtag
  // cache مع كل طلب — تكرار للطلبات واستهلاك من حصة الـDO المجانية (100k/يوم)
  // بدون أي فائدة إضافية فوق طبقة الحافة الموجودة.
});

