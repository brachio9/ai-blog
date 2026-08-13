import { getAdminLogin } from "@/lib/auth";
import {
  GitHubApiError,
  commitFile,
  deleteFile,
  isPublishConfigured,
} from "@/services/github";

import { parseDeleteRequest, parseSaveRequest } from "./publish";

/**
 * POST   /api/publish  { path, content, message?, sha? }  → 글 저장 (sha 있으면 덮어쓰기)
 * DELETE /api/publish  { path, sha, message? }            → 글 삭제
 *
 * 본문은 `content/**\/*.mdx` 파일에만 간다 (CLAUDE.md CRITICAL — DB 에 넣지 않는다).
 * 실제 커밋은 src/services/github.ts 가 한다 — 이 파일은 토큰을 만지지 않는다.
 *
 * 인증은 proxy 가 이미 막지만 여기서 다시 본다 (CLAUDE.md CRITICAL — 이중 확인).
 * 미인증은 401/403 이 아니라 404 다: 401 은 "여기 뭔가 있다" 를 알려 준다.
 */
const NOT_FOUND = () => new Response(null, { status: 404 });

function fail(status: number, message: string, issues?: unknown): Response {
  return Response.json(
    issues ? { ok: false, message, issues } : { ok: false, message },
    { status },
  );
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * 설정 누락은 사용자가 고칠 수 있는 문제다. 필요한 환경변수 **이름**은 관리자 홈이 이미
 * 안내하므로 그쪽을 가리킨다 — 이 라우트는 값도 이름도 직접 만지지 않는다 (services/github.ts 경유).
 */
function unconfigured(): Response {
  return fail(
    503,
    "GitHub 발행이 설정되지 않았다 — 관리자 홈(/admin)의 안내대로 발행용 환경변수를 채운 뒤 다시 시도하라",
  );
}

/**
 * 충돌 상태코드를 사람이 판단할 수 있는 문장으로 바꾼다.
 *
 * 실측(2026-08-13, 실제 레포): Contents API 는 **낡은 sha 로 덮어쓰면 409**,
 * **이미 있는 파일에 sha 없이 쓰면 422** 를 준다. 둘은 사용자가 해야 할 일이 다르다 —
 * 전자는 최신 내용을 다시 받아야 하고, 후자는 경로가 겹친 것이다.
 */
function conflictMessage(status: number, hadSha: boolean): string | null {
  if (status === 409) {
    return "그 사이 다른 곳에서 이 글이 수정되었다 — 대시보드에서 다시 연 뒤 저장해야 남의 수정을 덮어쓰지 않는다.";
  }
  if (status === 422 && !hadSha) {
    return "그 경로에 이미 글이 있다 — 대시보드에서 그 글을 열어 수정하거나, 발행일·slug 를 바꿔 다른 경로로 저장하라.";
  }
  return null;
}

/**
 * GitHub 이 준 상태코드·메시지를 그대로 전달한다 (ARCHITECTURE: 발행 실패는 조용히 삼키지 않는다).
 * GitHubApiError 의 메시지에는 토큰이 들어 있지 않다 (services/github.ts 가 보장한다).
 */
function githubFailure(error: unknown, hadSha: boolean): Response {
  if (error instanceof GitHubApiError) {
    const conflict = conflictMessage(error.status, hadSha);

    // 번역문을 앞에 두고 원문을 괄호로 남긴다 — 원인을 숨기지 않는다.
    return fail(
      error.status,
      conflict ? `${conflict} (${error.message})` : error.message,
    );
  }

  return fail(500, error instanceof Error ? error.message : String(error));
}

export async function POST(request: Request): Promise<Response> {
  if (!(await getAdminLogin())) {
    return NOT_FOUND();
  }
  if (!isPublishConfigured()) {
    return unconfigured();
  }

  const parsed = parseSaveRequest(await readJson(request));
  if (!parsed.ok) {
    return fail(400, parsed.message, parsed.issues);
  }

  const { path, content, message, sha } = parsed.value;

  try {
    const result = await commitFile({ path, content, message, sha });

    // sha 를 돌려줘야 에디터가 이어서 저장할 수 있다 (커밋마다 sha 가 바뀐다).
    return Response.json({
      ok: true,
      path,
      sha: result.sha,
      commitUrl: result.commitUrl,
      message,
    });
  } catch (error) {
    return githubFailure(error, sha !== undefined);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!(await getAdminLogin())) {
    return NOT_FOUND();
  }
  if (!isPublishConfigured()) {
    return unconfigured();
  }

  const parsed = parseDeleteRequest(await readJson(request));
  if (!parsed.ok) {
    return fail(400, parsed.message, parsed.issues);
  }

  const { path, sha, message } = parsed.value;

  try {
    await deleteFile({ path, sha, message });
    return Response.json({ ok: true, path, message });
  } catch (error) {
    return githubFailure(error, true);
  }
}
