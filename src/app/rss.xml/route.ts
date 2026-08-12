import { getAllPosts } from "@/lib/content/posts";
import { buildRssXml } from "@/lib/feed";
import { SITE_URL } from "@/lib/site";

/** 글은 빌드 타임에만 바뀐다 (ADR-001). 요청마다 파일을 다시 읽을 이유가 없다. */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(buildRssXml(getAllPosts(), SITE_URL), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
