import { Buffer } from "node:buffer";

import matter from "gray-matter";

import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { parseFrontmatter } from "@/lib/content/schema";
import type { PostFrontmatter } from "@/types/content";

/**
 * GitHub Contents API 래퍼 — 관리자 화면이 글을 읽고 쓰는 유일한 통로다.
 * 본문(ADR-001)도 이미지(ADR-005)도 이 레포에 커밋한다. 외부 스토리지를 쓰지 않는다.
 *
 * CLAUDE.md CRITICAL: GITHUB_CONTENT_TOKEN 은 에러 메시지·로그·반환값에 절대 섞이지 않는다.
 * 요청 헤더나 init 을 통째로 찍는 코드를 여기에 넣지 마라.
 */
const API_ORIGIN = "https://api.github.com";
const API_VERSION = "2022-11-28";

/** listPosts 는 파일 수만큼 요청이 나간다(N+1). 한꺼번에 쏘지 않는다. */
const READ_CONCURRENCY = 5;

/** 파일 규약: content/{category}/YYYY-MM-DD-{slug}.mdx — 빌드 타임 로더와 같은 규약이다. */
const FILE_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/;

export interface RemoteFile {
  path: string;
  sha: string;
  content: string;
}

export interface RemotePostSummary {
  /** 레포 기준 경로 — content/papers/2026-08-05-foo.mdx */
  path: string;
  category: CategorySlug;
  slug: string;
  sha: string;
  /** frontmatter 검증에 실패하면 null. 목록에서 사라지지 않는다 — 관리자는 고치러 온다. */
  frontmatter: PostFrontmatter | null;
  /** frontmatter 가 null 인 이유 */
  error?: string;
}

export interface CommitResult {
  sha: string;
  commitUrl: string;
}

/** 상태코드 해석 — 발행 실패 원인을 관리자에게 그대로 노출한다 (ARCHITECTURE). */
const STATUS_HINTS: Record<number, string> = {
  401: "토큰이 유효하지 않다",
  403: "토큰에 이 레포의 Contents 쓰기 권한이 없다",
  404: "레포·브랜치·경로 중 하나가 없다",
  409: "브랜치 충돌 — 그 사이 다른 커밋이 들어왔다",
  422: "sha 불일치 — 파일이 그 사이 바뀌었거나 sha 를 빠뜨렸다",
};

/** 호출부가 `status` 로 분기한다 (422 = sha 충돌, 409 = 브랜치 충돌). */
export class GitHubApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

interface PublishConfig {
  repo: string;
  branch: string;
  token: string;
}

function config(): PublishConfig | null {
  const repo = process.env.GITHUB_CONTENT_REPO?.trim();
  const branch = process.env.GITHUB_CONTENT_BRANCH?.trim();
  const token = process.env.GITHUB_CONTENT_TOKEN?.trim();

  // .env.example 은 값을 빈 문자열로 실어 보낸다 — `??` 로는 걸러지지 않는다.
  if (!repo || !branch || !token) {
    return null;
  }

  return { repo, branch, token };
}

/** 세 환경변수가 전부 있는가. 브랜치 기본값 `main` 은 .env.example 이 들고 있다. */
export function isPublishConfigured(): boolean {
  return config() !== null;
}

/**
 * 설정이 없으면 던진다. 조용히 성공한 척하지 않는다 — 글이 사라진다.
 * 호출부(관리자 화면)는 isPublishConfigured() 로 먼저 걸러 안내 문구를 띄운다.
 */
function requireConfig(): PublishConfig {
  const resolved = config();
  if (!resolved) {
    throw new Error(
      "GitHub 발행이 설정되지 않았다 — GITHUB_CONTENT_REPO · GITHUB_CONTENT_BRANCH · GITHUB_CONTENT_TOKEN 을 채워라",
    );
  }
  return resolved;
}

function contentsUrl(cfg: PublishConfig, path: string): string {
  // 경로 구분자는 그대로 두고 각 조각만 이스케이프한다.
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${API_ORIGIN}/repos/${cfg.repo}/contents/${encoded}`;
}

/** 조회는 항상 대상 브랜치를 명시한다 — 기본 브랜치가 아닐 수 있다. */
function refUrl(cfg: PublishConfig, path: string): string {
  return `${contentsUrl(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`;
}

function githubFetch(
  cfg: PublishConfig,
  url: string,
  init: { method: string; body?: string },
): Promise<Response> {
  return fetch(url, {
    method: init.method,
    body: init.body,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
      "X-GitHub-Api-Version": API_VERSION,
    },
    // 관리자 목록이 캐시된 옛 상태를 보여주면 안 된다.
    cache: "no-store",
  });
}

/** GitHub 이 준 메시지만 꺼낸다. 요청 쪽 정보(헤더·토큰)는 손대지 않는다. */
async function githubMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      return String((body as { message: unknown }).message);
    }
  } catch {
    // 본문이 JSON 이 아니면 상태코드만으로 충분하다.
  }
  return "(응답 본문 없음)";
}

async function failure(
  response: Response,
  action: string,
): Promise<GitHubApiError> {
  const hint = STATUS_HINTS[response.status];
  const detail = await githubMessage(response);
  return new GitHubApiError(
    response.status,
    `GitHub ${action} 실패 (${response.status}${hint ? ` — ${hint}` : ""}): ${detail}`,
  );
}

/** 한글이 깨지지 않도록 utf8 ↔ base64 를 대칭으로 변환한다. btoa 계열을 쓰지 마라. */
function encodeBase64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

/** GitHub 은 base64 를 줄바꿈으로 접어서 준다. Buffer 는 그걸 무시한다. */
function decodeBase64(base64: string): string {
  return Buffer.from(base64, "base64").toString("utf8");
}

/** 없으면 null — 404 는 예외가 아니라 "신규 파일" 이라는 분기 신호다. */
export async function readFile(path: string): Promise<RemoteFile | null> {
  const cfg = requireConfig();
  const response = await githubFetch(cfg, refUrl(cfg, path), { method: "GET" });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw await failure(response, `읽기 ${path}`);
  }

  const body = (await response.json()) as {
    sha: string;
    content?: string;
    encoding?: string;
  };
  // 1MB 를 넘으면 GitHub 이 encoding: "none" 에 빈 본문을 준다.
  // 그대로 돌려주면 편집기가 빈 글을 열고 그 상태로 덮어쓴다.
  if (body.encoding !== "base64" || body.content === undefined) {
    throw new Error(
      `GitHub 읽기 실패: ${path} 를 base64 로 받지 못했다 (encoding: ${body.encoding ?? "없음"})`,
    );
  }

  return { path, sha: body.sha, content: decodeBase64(body.content) };
}

/** 본문 커밋. `sha` 가 있으면 덮어쓰기, 없으면 신규 생성이다. */
export async function commitFile(input: {
  path: string;
  content: string;
  message: string;
  sha?: string;
}): Promise<CommitResult> {
  return putContents(
    input.path,
    encodeBase64(input.content),
    input.message,
    input.sha,
  );
}

/** 이미지 커밋 (ADR-005). 이미 있는 경로면 422 — 업로드 경로는 새 이름을 쓴다. */
export async function commitBinaryFile(input: {
  path: string;
  base64: string;
  message: string;
}): Promise<CommitResult> {
  return putContents(input.path, input.base64, input.message);
}

async function putContents(
  path: string,
  base64: string,
  message: string,
  sha?: string,
): Promise<CommitResult> {
  const cfg = requireConfig();

  const body: Record<string, string> = {
    message,
    content: base64,
    branch: cfg.branch,
  };
  // sha 는 "이 파일을 덮어쓴다" 는 뜻이다. 신규 생성에 붙이면 422 가 난다.
  if (sha) {
    body.sha = sha;
  }

  const response = await githubFetch(cfg, contentsUrl(cfg, path), {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await failure(response, `커밋 ${path}`);
  }

  const result = (await response.json()) as {
    content: { sha: string };
    commit: { html_url: string };
  };
  return { sha: result.content.sha, commitUrl: result.commit.html_url };
}

export async function deleteFile(input: {
  path: string;
  sha: string;
  message: string;
}): Promise<void> {
  const cfg = requireConfig();

  const response = await githubFetch(cfg, contentsUrl(cfg, input.path), {
    method: "DELETE",
    body: JSON.stringify({
      message: input.message,
      sha: input.sha,
      branch: cfg.branch,
    }),
  });
  if (!response.ok) {
    throw await failure(response, `삭제 ${input.path}`);
  }
}

interface DirectoryEntry {
  name: string;
  path: string;
  sha: string;
  type: string;
}

async function listDirectory(
  cfg: PublishConfig,
  path: string,
): Promise<DirectoryEntry[]> {
  const response = await githubFetch(cfg, refUrl(cfg, path), { method: "GET" });

  // 글이 아직 하나도 없는 카테고리는 디렉토리 자체가 없다.
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw await failure(response, `목록 ${path}`);
  }

  return (await response.json()) as DirectoryEntry[];
}

/** 파일명 날짜 내림차순. 한 카테고리 안에서만 도는 목록이 아니라 전체를 한 줄로 세운다. */
function byFileDateDesc(
  a: { date: string; path: string },
  b: { date: string; path: string },
): number {
  return b.date.localeCompare(a.date) || a.path.localeCompare(b.path);
}

export async function listPosts(): Promise<RemotePostSummary[]> {
  const cfg = requireConfig();

  const listings = await Promise.all(
    CATEGORIES.map(async (category) => ({
      category: category.slug,
      entries: await listDirectory(cfg, `content/${category.slug}`),
    })),
  );

  const files = listings
    .flatMap(({ category, entries }) =>
      entries.flatMap((entry) => {
        const match =
          entry.type === "file" ? FILE_NAME_PATTERN.exec(entry.name) : null;
        return match
          ? [
              {
                category,
                path: entry.path,
                sha: entry.sha,
                date: match[1],
                slug: match[2],
              },
            ]
          : [];
      }),
    )
    .sort(byFileDateDesc);

  return mapWithLimit(files, READ_CONCURRENCY, async (file) => {
    const base = {
      path: file.path,
      category: file.category,
      slug: file.slug,
      sha: file.sha,
    };

    const remote = await readFile(file.path);
    if (!remote) {
      return {
        ...base,
        frontmatter: null,
        error: "목록을 읽은 뒤 사라진 파일",
      };
    }

    try {
      const { data } = matter(remote.content);
      return {
        ...base,
        sha: remote.sha,
        frontmatter: parseFrontmatter(data, file.path),
      };
    } catch (error) {
      // 관리자 화면은 깨진 글을 **고치러** 들어오는 곳이다.
      // 여기서 던지면 목록 전체가 죽어 고칠 방법이 사라진다.
      return {
        ...base,
        frontmatter: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

/** 동시 실행 수를 limit 으로 묶는다. 결과 순서는 입력 순서 그대로다. */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await run(items[index]);
      }
    },
  );
  await Promise.all(workers);

  return results;
}
