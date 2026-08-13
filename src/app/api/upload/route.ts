import { Buffer } from "node:buffer";

import { nowKstIso } from "@/app/admin/editor/draft";
import { getAdminLogin } from "@/lib/auth";
import {
  GitHubApiError,
  commitBinaryFile,
  isPublishConfigured,
} from "@/services/github";

import { resolveUploadTarget } from "./upload";

/**
 * POST /api/upload  multipart/form-data { file }  → { url, path, commitUrl }
 *
 * 이미지도 글과 같은 레포에 커밋한다 (ADR-005 — 외부 오브젝트 스토리지를 쓰지 않는다).
 * **글 저장과는 별개의 커밋이다.** 원자 커밋을 만들려고 Git Trees API 로 가지 마라 —
 * 복잡도만 늘고 이득이 없다. 그 대가로 글을 저장하지 않고 떠나면 이미지만 남는데,
 * 그 사실은 에디터가 사용자에게 그대로 알린다.
 *
 * 인증은 proxy 가 이미 막지만 여기서 다시 본다 (CLAUDE.md CRITICAL). 미인증은 404.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await getAdminLogin())) {
    return new Response(null, { status: 404 });
  }
  // 필요한 환경변수 이름은 관리자 홈이 안내한다 — 여기서 값도 이름도 직접 만지지 않는다.
  if (!isPublishConfigured()) {
    return Response.json(
      {
        ok: false,
        message:
          "GitHub 발행이 설정되지 않았다 — 관리자 홈(/admin)의 안내대로 발행용 환경변수를 채운 뒤 다시 시도하라",
      },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { ok: false, message: "file 필드에 이미지가 없다" },
      { status: 400 },
    );
  }

  // 파일명은 서버가 정한다 — 올라온 이름은 확장자 판단과 읽기 좋은 조각에만 쓴다.
  const target = resolveUploadTarget({
    name: file.name,
    size: file.size,
    kstNow: nowKstIso(),
  });
  if (!target.ok) {
    return Response.json(
      { ok: false, message: target.message },
      { status: 400 },
    );
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const result = await commitBinaryFile({
      path: target.value.path,
      base64,
      message: `chore(uploads): add ${target.value.url}`,
    });

    return Response.json({
      ok: true,
      url: target.value.url,
      path: target.value.path,
      commitUrl: result.commitUrl,
    });
  } catch (error) {
    // GitHubApiError 메시지에는 토큰이 들어 있지 않다 (services/github.ts 가 보장한다).
    if (error instanceof GitHubApiError) {
      return Response.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
