/**
 * 정기 릴리즈를 접는 규칙 — **훑는 면 전용이다.**
 *
 * ## 왜 필요한가 (2026-08-18 하루를 펼쳐 보고 알았다)
 *
 * 그날 27편 중 릴리즈가 12편(44%)이었고, 그 정체가 이랬다:
 *
 *     Ollama v0.32.12 · Unsloth · llama.cpp b10451 · transformers v5.15.0 · vLLM v0.27.0
 *     Claude Code v2.1.232 · Claude Code v2.1.233 · Cline v0.0.13 · Goose v1.46.0
 *     LiveKit Agents 1.6.9 · Pipecat v1.7.0 · sherpa-onnx v1.13.5
 *
 * 같은 날 Claude Code 패치 **두 개가 각각 한 편**씩 올라갔고 절반가량이 패치 단위였다.
 * 그날 볼 만한 것(메타 신규 모델·Qwen 분석·RAG 효율 2.9배)이 그 사이에 묻힌다.
 *
 * **축을 1급으로 올려도 이건 안 풀린다.** 저 12편 중 8편이 서빙·바이브코딩 축이라,
 * 다시 라벨을 붙이면 오히려 제일 붐비는 선반에 더 쌓인다. 분류 문제가 아니라 물량 문제다.
 * GitHub 소스가 27곳이라 앞으로도 계속 쏟아진다.
 *
 * ## 새 frontmatter 칸을 만들지 않는다
 *
 * `source.url` 하나에 저장소와 버전이 다 들어 있다. 실측으로 12편 전부 읽혔다:
 *
 *     …/anthropics/claude-code/releases/tag/v2.1.232   → claude-code   2.1.232
 *     …/cline/cline/releases/tag/desktop-v0.0.13       → cline         0.0.13
 *     …/livekit/agents/releases/tag/livekit-agents%401.6.9 → agents    1.6.9
 *     …/ggml-org/llama.cpp/releases/tag/b10451         → llama.cpp     (못 읽음)
 *
 * GitHub API 의 `prerelease` 플래그는 쓰지 않는다 — 발행분 12/12 가 `false` 였고
 * 그중에 `-beta` 태그가 있었다. **태그 접미사가 그 플래그보다 정확하다.**
 *
 * 이 파일은 순수 함수만 둔다. 네트워크도 DB 도 모른다.
 */

import { showsCrossSources } from "@/lib/selection";
import type { Post } from "@/types/content";

export interface ReleaseTag {
  major: number;
  minor: number;
  patch: number;
  /** `-rc`·`-beta`·`-alpha`·`-pre` 가 붙었나 */
  prerelease: boolean;
  /** 화면에 그대로 싣는 표기 (`v0.27.0`) */
  raw: string;
}

/** 접기를 시작하는 최소 건수. **2건짜리 아코디언은 2행보다 나쁘다.** */
export const COLLAPSE_MIN = 3;

const SEMVER = /(\d+)\.(\d+)\.(\d+)/g;
const PRERELEASE = /-(rc|beta|alpha|pre)/i;

/**
 * 태그 문자열에서 마지막 `x.y.z` 를 뽑는다. 접두사·스코프·접미사는 버린다.
 *
 * **마지막**을 쓰는 것이 의도다 — `livekit-agents@1.6.9` 처럼 이름에 숫자가 섞이는 경우가 있다.
 * 읽지 못하면 `null` 이고, 그때는 「정기」로 본다: 읽을 수 없는 태그를 셀 만하다고 우길 수 없다.
 * llama.cpp 의 `b10451` 이 그런 경우이고 하루에도 여러 번 나온다.
 */
export function parseReleaseTag(tag: string): ReleaseTag | null {
  const decoded = safeDecode(tag);
  const found = [...decoded.matchAll(SEMVER)];
  if (found.length === 0) {
    return null;
  }

  const [, major, minor, patch] = found[found.length - 1];
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: PRERELEASE.test(decoded),
    raw: decoded,
  };
}

/**
 * 원문 주소에서 **같은 날 묶을 열쇠**를 뽑는다.
 * GitHub 이면 `owner/repo`, 아니면 호스트 이름이다.
 */
export function repoKeyOf(sourceUrl: string): string {
  const host = hostOf(sourceUrl);
  if (host !== "github.com") {
    return host;
  }
  const path = pathOf(sourceUrl).split("/").filter(Boolean);
  return path.length >= 2 ? `${path[0]}/${path[1]}` : host;
}

/** 릴리즈 주소의 마지막 조각 — `…/releases/tag/v0.27.0` 의 `v0.27.0`. */
export function tagOf(sourceUrl: string): string {
  const parts = pathOf(sourceUrl).split("/").filter(Boolean);
  return parts.length > 0 ? safeDecode(parts[parts.length - 1]) : "";
}

/**
 * 이 릴리즈가 **접어도 되는 정기 릴리즈**인가. 위에서 아래로, 먼저 걸리는 것이 답이다.
 *
 * | 조건 | 판정 |
 * |---|---|
 * | 여러 곳에서 같이 나왔다 | **승격** — 27%뿐이라 드물다는 것이 값어치다 |
 * | 태그에 `-rc`·`-beta` | 정기 — 프리릴리즈는 정의상 잠정이다 |
 * | 버전을 못 읽는다 | 정기 |
 * | `patch > 0` | 정기 — **semver 규약 자체가 신호다** |
 * | 그 밖 (`patch === 0`) | **승격** — minor 나 major 올림 |
 *
 * 버전 이력을 들고 있지 않아도 된다. `patch === 0` 하나가 휴리스틱의 전부이고,
 * 그것이 버전 번호가 관례적으로 뜻하는 바다. `major === 0` 인 프로젝트(`v0.27.0`)도
 * 승격한다 — 그 프로젝트가 하는 가장 큰 올림이 그것이다.
 *
 * **선별 등급(`band`)은 보지 않는다.** 처음에는 「등급이 `high` 면 승격」을 맨 위에 뒀는데,
 * 실제 콘텐츠에 대 보니 릴리즈 12편 중 10편이 `high` 라 **아무것도 접히지 않았다.**
 * 발행분 전체로도 59%가 `high` 다 — 열에 여섯이 가진 값은 무엇도 가르지 못한다.
 * 등급이 갈 자리는 순위가 아니라 글 상세의 「어떻게 골랐나」다 (`lib/selection.ts`).
 */
export function isRoutineRelease(post: Post): boolean {
  const { selection, source } = post.frontmatter;

  if (showsCrossSources(selection)) return false;
  if (!source) return true;

  const tag = parseReleaseTag(tagOf(source.url));
  if (tag === null || tag.prerelease) return true;
  return tag.patch > 0;
}

export interface ReleaseGroup {
  /** `owner/repo`. 같은 날 같은 저장소가 두 번 나오면 여기서 합쳐진다 */
  repoKey: string;
  items: { slug: string; tag: string }[];
}

export interface ReleasePartition {
  /** 그대로 한 행씩 서는 글 — 릴리즈가 아닌 글도 전부 여기 있다 */
  promoted: Post[];
  /** 접힌 묶음. 파일 순서(=최신순)를 지킨다 */
  routine: ReleaseGroup[];
}

/**
 * 하루치를 「그대로 설 글」과 「접을 묶음」으로 가른다.
 *
 * **정기 릴리즈가 `COLLAPSE_MIN` 미만이면 접지 않는다** — 되돌려 한 행씩 세운다.
 * 아코디언 한 줄을 여는 수고가 두 행을 훑는 수고보다 크기 때문이다.
 */
export function partitionReleases(posts: Post[]): ReleasePartition {
  const promoted: Post[] = [];
  const routine: Post[] = [];

  for (const post of posts) {
    if (post.category === "releases" && isRoutineRelease(post)) {
      routine.push(post);
    } else {
      promoted.push(post);
    }
  }

  // 접지 않기로 하면 **넘겨받은 순서 그대로** 되돌린다 — 갈랐다가 다시 붙이면 날짜순이 깨진다.
  if (routine.length < COLLAPSE_MIN) {
    return { promoted: posts, routine: [] };
  }

  const groups = new Map<string, ReleaseGroup>();
  for (const post of routine) {
    const url = post.frontmatter.source?.url ?? "";
    const repoKey = repoKeyOf(url);
    const group = groups.get(repoKey) ?? { repoKey, items: [] };
    group.items.push({ slug: post.slug, tag: tagOf(url) });
    groups.set(repoKey, group);
  }

  return { promoted, routine: [...groups.values()] };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // 잘못 인코딩된 주소가 화면을 죽이지 않게 한다 — 원본을 그대로 쓴다.
    return value;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}
