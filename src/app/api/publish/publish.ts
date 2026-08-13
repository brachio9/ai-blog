import matter from "gray-matter";

import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { checkFrontmatter, type FrontmatterIssue } from "@/lib/content/schema";

/**
 * 발행 요청의 순수 검증 로직 — 네트워크도 세션도 여기 없다 (route.ts 가 그걸 한다).
 *
 * 이 파일의 존재 이유는 **경로 화이트리스트** 하나다. 이 라우트는 인증된 사람이 레포에
 * 파일을 쓰는 통로이므로, 경로를 검증하지 않으면 `.github/workflows/*` 나 `src/*` 를
 * 덮어쓸 수 있다. 검증은 문자열 조립·치환이 아니라 정규식 화이트리스트로만 한다 —
 * `..` · 절대경로 · 백슬래시 · 퍼센트 인코딩(`%2e`)은 허용 문자 집합에 없으므로 자동으로 걸린다.
 */
const CATEGORY_ALTERNATION = CATEGORIES.map((category) => category.slug).join(
  "|",
);

/** content/{category}/YYYY-MM-DD-{slug}.mdx — slug 규칙은 에디터(draft.ts)와 같다. */
const POST_PATH_PATTERN = new RegExp(
  `^content/(${CATEGORY_ALTERNATION})/(\\d{4}-\\d{2}-\\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\\.mdx$`,
);

/** 커밋 메시지는 한 줄이면 충분하다. 길이를 열어 두면 로그가 아니라 저장소가 된다. */
const MAX_MESSAGE_LENGTH = 200;

export interface PostRef {
  path: string;
  category: CategorySlug;
  date: string;
  slug: string;
}

export interface SaveRequest {
  path: string;
  category: CategorySlug;
  slug: string;
  /** frontmatter 를 포함한 완성된 MDX 문자열 */
  content: string;
  message: string;
  /** 있으면 덮어쓰기, 없으면 신규 생성 */
  sha?: string;
}

export interface DeleteRequest {
  path: string;
  category: CategorySlug;
  slug: string;
  sha: string;
  message: string;
}

export interface Rejected {
  ok: false;
  message: string;
  /** frontmatter 검증에 걸렸을 때만 — 에디터가 필드별로 그린다 */
  issues?: FrontmatterIssue[];
}

export type Parsed<T> = { ok: true; value: T } | Rejected;

function reject(message: string, issues?: FrontmatterIssue[]): Rejected {
  return issues ? { ok: false, message, issues } : { ok: false, message };
}

/** 화이트리스트를 통과한 경로만 조각으로 돌려준다. 통과하지 못하면 이유를 그대로 준다. */
export function validatePostPath(path: unknown): Parsed<PostRef> {
  if (typeof path !== "string") {
    return reject("path 는 문자열이어야 한다");
  }

  const match = POST_PATH_PATTERN.exec(path);
  if (!match) {
    return reject(
      `허용하지 않는 경로다: ${path} — content/{${CATEGORY_ALTERNATION}}/YYYY-MM-DD-{slug}.mdx 형식만 쓸 수 있다 (slug 는 영소문자·숫자·하이픈)`,
    );
  }

  return {
    ok: true,
    value: {
      path,
      category: match[1] as CategorySlug,
      date: match[2],
      slug: match[3],
    },
  };
}

/** Conventional Commits (CLAUDE.md). 사용자가 직접 넣지 않았을 때의 기본값이다. */
export function defaultCommitMessage(
  action: "create" | "update" | "delete",
  category: CategorySlug,
  slug: string,
): string {
  const target = `${category}/${slug}`;
  if (action === "create") return `feat(content): ${target}`;
  if (action === "update") return `fix(content): ${target}`;
  return `chore(content): remove ${target}`;
}

function resolveMessage(raw: unknown, fallback: string): string {
  const message = typeof raw === "string" ? raw.trim() : "";
  return message ? message.slice(0, MAX_MESSAGE_LENGTH) : fallback;
}

function asRecord(body: unknown): Record<string, unknown> | null {
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

/**
 * 저장 전에 frontmatter 를 zod 스키마로 **다시** 검증한다 (클라이언트 검증만 믿지 마라).
 * 깨진 frontmatter 가 커밋되면 다음 빌드가 통째로 실패한다 — 그때는 되돌리는 커밋이 필요하다.
 */
function checkContent(content: string, ref: PostRef): Rejected | null {
  let data: unknown;
  try {
    ({ data } = matter(content));
  } catch (error) {
    return reject(
      `frontmatter 를 읽을 수 없다 (YAML 오류): ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const issues = checkFrontmatter(data);
  if (issues.length > 0) {
    return reject("frontmatter 검증에 실패했다 — 커밋하지 않았다", issues);
  }

  // 파일이 놓인 디렉토리와 frontmatter 의 category 가 갈리면 목록·링크가 어긋난다.
  const declared = (data as { category?: unknown }).category;
  if (declared !== ref.category) {
    return reject("frontmatter 검증에 실패했다 — 커밋하지 않았다", [
      {
        field: "category",
        message: `경로는 ${ref.category} 인데 frontmatter 의 category 는 ${String(declared)} 다`,
      },
    ]);
  }

  return null;
}

export function parseSaveRequest(body: unknown): Parsed<SaveRequest> {
  const record = asRecord(body);
  if (!record) {
    return reject("요청 본문이 JSON 객체가 아니다");
  }

  const path = validatePostPath(record.path);
  if (!path.ok) {
    return path;
  }

  const { content } = record;
  if (typeof content !== "string" || content.trim() === "") {
    return reject("content 는 비어 있지 않은 MDX 문자열이어야 한다");
  }

  // 신규 생성에 남의 sha 가 붙으면 422 가 나고, 숫자 따위가 붙으면 GitHub 이 삼킨다.
  const sha = record.sha;
  if (sha !== undefined && (typeof sha !== "string" || sha.trim() === "")) {
    return reject("sha 는 비어 있지 않은 문자열이거나 없어야 한다");
  }

  const invalid = checkContent(content, path.value);
  if (invalid) {
    return invalid;
  }

  return {
    ok: true,
    value: {
      path: path.value.path,
      category: path.value.category,
      slug: path.value.slug,
      content,
      message: resolveMessage(
        record.message,
        defaultCommitMessage(
          sha ? "update" : "create",
          path.value.category,
          path.value.slug,
        ),
      ),
      sha: typeof sha === "string" ? sha : undefined,
    },
  };
}

export function parseDeleteRequest(body: unknown): Parsed<DeleteRequest> {
  const record = asRecord(body);
  if (!record) {
    return reject("요청 본문이 JSON 객체가 아니다");
  }

  const path = validatePostPath(record.path);
  if (!path.ok) {
    return path;
  }

  const { sha } = record;
  if (typeof sha !== "string" || sha.trim() === "") {
    return reject("삭제에는 sha 가 필요하다 — 대시보드에서 글을 다시 열어라");
  }

  return {
    ok: true,
    value: {
      path: path.value.path,
      category: path.value.category,
      slug: path.value.slug,
      sha,
      message: resolveMessage(
        record.message,
        defaultCommitMessage("delete", path.value.category, path.value.slug),
      ),
    },
  };
}
