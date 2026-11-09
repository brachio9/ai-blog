import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * 사이트는 빌드 타임에 전부 굽는다 (SSG). ISR·revalidate 를 쓰지 않으므로
 * 읽기 전용 정적 자산 캐시로 충분하다 — R2·KV·Queue·Tag Cache 가 필요 없다.
 * 새 글은 main 커밋 → Workers Builds 재빌드로 반영된다.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
