import { getView, incrementView, isValidPostId } from "@/services/turso";

/** DB 를 읽고 쓴다 — 정적화하면 안 된다. 글 상세는 그대로 SSG 로 남는다. */
export const dynamic = "force-dynamic";

/**
 * GET  /api/views?id={category}/{slug}  → { count }   증가 없이 조회
 * POST /api/views  body: { postId }     → { count }   조회수 증가
 *
 * 실패해도 500 을 내지 않는다 — 조회수는 부가 기능이고, 클라이언트는 0 이면 아무것도 그리지 않는다.
 */
export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !isValidPostId(id)) {
    return Response.json({ count: 0 }, { status: 400 });
  }

  return Response.json({ count: await getView(id) });
}

export async function POST(request: Request): Promise<Response> {
  const postId = await readPostId(request);
  if (postId === null) {
    return Response.json({ count: 0 }, { status: 400 });
  }

  return Response.json({ count: await incrementView(postId) });
}

/** 본문에서 postId 를 꺼내 형식·카테고리 소속만 검증한다 (실재 확인은 하지 않는다 — turso.ts 참고). */
async function readPostId(request: Request): Promise<string | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  const postId = (body as { postId?: unknown } | null)?.postId;
  return typeof postId === "string" && isValidPostId(postId) ? postId : null;
}
