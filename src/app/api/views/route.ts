import {
  getView,
  getViews,
  incrementView,
  isValidPostId,
  isViewTrackingEnabled,
} from "@/services/turso";

/** DB 를 읽고 쓴다 — 정적화하면 안 된다. 글 상세는 그대로 SSG 로 남는다. */
export const dynamic = "force-dynamic";

/**
 * 한 번에 조회할 수 있는 글 수. 쿼리스트링으로 임의 개수를 받으면 DB 부하가 통제되지 않는다.
 * 목록 한 페이지는 PAGE_SIZE(10) 이므로 실제 목록이 여기 닿을 일은 없다.
 */
const MAX_BATCH_IDS = 100;

/**
 * GET  /api/views?id={category}/{slug}   → { count }   증가 없이 단건 조회
 * GET  /api/views?ids=a/b,c/d            → { views }   증가 없이 배치 조회 (목록용)
 * POST /api/views  body: { postId }      → { count }   조회수 증가 (글 상세 전용)
 *
 * 실패해도 500 을 내지 않는다 — 조회수는 부가 기능이고, 클라이언트는 0 이면 아무것도 그리지 않는다.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  const ids = params.get("ids");
  if (ids !== null) {
    // 추적이 꺼져 있으면 빈 목록을 200 으로 준다. 에러가 아니다 — 목록은 조회수 없이도 완전하다.
    if (!isViewTrackingEnabled()) {
      return Response.json({ views: {} });
    }
    return Response.json({ views: await getViews(parseBatchIds(ids)) });
  }

  const id = params.get("id");
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

/**
 * `?ids=` 를 글 id 목록으로 바꾼다.
 *
 * 잘못된 id 는 400 으로 전체를 실패시키지 않고 조용히 버린다 — 목록 하나가 깨졌다고
 * 조회수 열 전체가 사라지면 안 된다. 앞에서부터 MAX_BATCH_IDS 개까지만 본다.
 */
function parseBatchIds(raw: string): string[] {
  const ids = new Set<string>();

  for (const part of raw.split(",")) {
    if (ids.size >= MAX_BATCH_IDS) {
      break;
    }
    const id = part.trim();
    if (isValidPostId(id)) {
      ids.add(id);
    }
  }

  return [...ids];
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
