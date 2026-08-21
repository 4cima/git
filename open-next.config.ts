import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import doShardedTagCache  from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";
import doQueue            from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache:         doShardedTagCache,
  queue:            doQueue,
});

