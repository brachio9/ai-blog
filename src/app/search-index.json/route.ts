import { getAllPosts } from "@/lib/content/posts";
import { buildSearchIndex } from "@/lib/feed";

/** 검색은 서버·DB 없이 이 정적 파일 하나로 돈다 (ADR-007). */
export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(buildSearchIndex(getAllPosts()));
}
