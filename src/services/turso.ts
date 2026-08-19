import { createClient, type Client } from "@libsql/client";


/**
 * 조회수 저장소 — ADR-002: Turso 에는 휘발성 수치만 넣는다.
 * 본문(content/**\/*.mdx)·인증정보·댓글은 여기 들어오지 않는다.
 *
 * ARCHITECTURE 실패 처리 원칙에 따라 이 모듈의 함수는 **절대 던지지 않는다.**
 * 실패하면 0 을 주고 console.warn 만 남긴다 — 조회수가 글 렌더를 막으면 안 된다.
 */
const SCHEMA = `CREATE TABLE IF NOT EXISTS post_views (
  post_id    TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
)`;

/** post_id 는 글 상세 URL 과 같은 `{category}/{slug}` 로 고정한다. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 100;

/**
 * post_id 형식 검증 — 순수 함수. API 라우트가 이걸로 입력을 거른다.
 * 글의 실재 여부는 확인하지 않는다: 런타임에 content/ 를 fs 로 읽으면
 * 서버리스 번들에 콘텐츠가 없을 때 배포 후에만 깨진다.
 */
/**
 * `post_id` 는 **글 상세 URL 과 같다** — 이제 slug 하나다 (`/posts/{slug}`).
 *
 * 옛 키는 `{category}/{slug}` 였다. 주소에서 분류를 뺀 이유와 같은 이유로 여기서도 뺀다:
 * 분류를 다시 짜면(2026-08-15 에 한 번 했다) 조회수가 통째로 고아가 된다.
 * 옛 행은 지우지 않는다 — 아무도 읽지 않으므로 그냥 남는다.
 */
export function isValidPostId(id: string): boolean {
  return id.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(id);
}

function credentials(): { url: string; authToken: string } | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return url && authToken ? { url, authToken } : null;
}

/** 환경변수가 없으면 조회수만 조용히 꺼진다 — 로컬 개발과 빌드는 그대로 돌아야 한다. */
export function isViewTrackingEnabled(): boolean {
  return credentials() !== null;
}

/** 클라이언트 생성과 스키마 준비는 프로세스당 한 번. 매 요청마다 DDL 을 보내지 않는다. */
let ready: Promise<Client> | undefined;

function connect(): Promise<Client> | null {
  const creds = credentials();
  if (!creds) {
    return null;
  }

  if (!ready) {
    const pending = (async () => {
      const client = createClient(creds);
      await client.execute(SCHEMA);
      return client;
    })();
    // 준비가 실패하면 캐시를 비운다 — 일시적 오류로 프로세스 내내 꺼져 있으면 안 된다.
    pending.catch(() => {
      ready = undefined;
    });
    ready = pending;
  }

  return ready;
}

/** libSQL 은 INTEGER 를 number 로 주지만 설정에 따라 bigint·string 일 수 있다. */
function toCount(value: unknown): number {
  const count = Number(value ?? 0);
  return Number.isFinite(count) ? count : 0;
}

/**
 * 조회 결과를 요청한 목록에 맞춰 채운다.
 * libSQL 은 기록이 없는 post_id 의 행을 **아예 돌려주지 않으므로** 여기서 0 으로 메운다.
 */
export function mergeViewRows(
  postIds: string[],
  rows: Iterable<Record<string, unknown>>,
): Record<string, number> {
  const views: Record<string, number> = Object.fromEntries(
    postIds.map((postId) => [postId, 0]),
  );
  for (const row of rows) {
    views[String(row.post_id)] = toCount(row.count);
  }
  return views;
}

/** 조회수를 1 올리고 올린 뒤의 값을 준다. 비활성·실패 시 0. */
export async function incrementView(postId: string): Promise<number> {
  const connection = connect();
  if (!connection) {
    return 0;
  }

  try {
    const client = await connection;
    const result = await client.execute({
      sql: `INSERT INTO post_views (post_id, count, updated_at)
            VALUES (?, 1, ?)
            ON CONFLICT(post_id) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
            RETURNING count`,
      args: [postId, kstNow()],
    });
    return toCount(result.rows[0]?.count);
  } catch (error) {
    console.warn(`[turso] 조회수 증가 실패: ${postId}`, error);
    return 0;
  }
}

/** 증가 없이 조회. 비활성·실패·기록 없음 모두 0. */
export async function getView(postId: string): Promise<number> {
  const views = await getViews([postId]);
  return views[postId] ?? 0;
}

/** 여러 글을 한 번에 조회. 행이 없는 글은 0 으로 채운다. */
export async function getViews(
  postIds: string[],
): Promise<Record<string, number>> {
  const connection = postIds.length > 0 ? connect() : null;
  if (!connection) {
    return mergeViewRows(postIds, []);
  }

  try {
    const client = await connection;
    const placeholders = postIds.map(() => "?").join(", ");
    const result = await client.execute({
      sql: `SELECT post_id, count FROM post_views WHERE post_id IN (${placeholders})`,
      args: postIds,
    });
    return mergeViewRows(postIds, result.rows);
  } catch (error) {
    console.warn("[turso] 조회수 조회 실패", error);
    return mergeViewRows(postIds, []);
  }
}

/** KST ISO-8601 (+09:00) — CLAUDE.md CRITICAL: 모든 시각은 KST. */
function kstNow(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.toISOString().slice(0, -1)}+09:00`;
}
