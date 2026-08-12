# Step 0: content-schema

`content/` 디렉토리 규약과 frontmatter 스키마, 그리고 글을 읽어오는 로더를 만든다. 렌더링은 다음 step 소관이므로 여기서는 **데이터 계층만** 만든다.

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — `content/` 와 `src/lib/` 계약, 실패 처리 원칙
- `/docs/PRD.md` — 카테고리 3종과 출처 표기 요구
- `/CLAUDE.md` — CRITICAL 규칙 (본문은 파일에 · 출처 표기 필수 · KST 고정)
- `/src/lib/categories.ts` — **이미 존재한다.** `CategorySlug` · `Category` · `CATEGORIES` · `categoryHref()` · `getCategory()`. 카테고리 목록을 다시 정의하지 말고 이걸 import 해서 쓴다.

## 작업

### 1) 의존성 설치

```bash
npm install gray-matter zod --no-audit --no-fund
```

### 2) 타입 — `src/types/content.ts`

```ts
import type { CategorySlug } from "@/lib/categories";

export interface PostSource {
  url: string;
  title: string;          // 원문 제목
  author?: string;
  license?: string;       // "cc-by-4.0" | "unknown" 등 자유 문자열
  publishedAt?: string;
}

export interface PaperMeta {
  arxivId: string;
  authors: string[];
}

export interface PostFrontmatter {
  title: string;
  category: CategorySlug;
  summary: string;
  publishedAt: string;    // KST ISO-8601 (+0900)
  updatedAt?: string;
  tags: string[];
  cover?: string;
  draft: boolean;
  source?: PostSource;
  paper?: PaperMeta;      // category === "papers" 전용
}

export interface Post {
  frontmatter: PostFrontmatter;
  slug: string;           // 파일명에서 날짜 접두사를 뗀 부분
  category: CategorySlug;
  body: string;           // frontmatter 를 제외한 MDX 본문
  filePath: string;       // 레포 기준 상대 경로 (에러 메시지용)
  readingMinutes: number;
}
```

### 3) 스키마 — `src/lib/content/schema.ts`

zod 로 `PostFrontmatter` 를 검증한다. 요구 사항:

- `category` 는 `CATEGORIES` 의 slug 중 하나만 허용한다. **문자열 리터럴을 다시 적지 말고** `categories.ts` 에서 파생시켜라.
- `publishedAt` / `updatedAt` 은 **`+0900` 으로 끝나는 ISO-8601** 만 허용한다. `Z` 나 다른 오프셋은 거부한다. 이유: CLAUDE.md CRITICAL — 시각은 KST 고정.
- `tags` 는 기본값 `[]`, `draft` 는 기본값 `false`.
- `source.url` 은 유효한 URL.
- **`category === "papers"` 이면 `paper` 가 필수**다. 그 외 카테고리에서 `paper` 가 오면 거부한다.
- 검증 실패 시 던지는 에러 메시지에 **파일 경로와 어떤 필드가 왜 틀렸는지**를 반드시 포함한다. 이유: 빌드가 깨질 때 어느 글이 문제인지 즉시 알 수 있어야 한다.

`parseFrontmatter(raw: unknown, filePath: string): PostFrontmatter` 형태의 함수를 노출한다.

### 4) 로더 — `src/lib/content/posts.ts`

파일 규약: `content/{category}/YYYY-MM-DD-{slug}.mdx`

노출할 함수 (시그니처만 제시, 구현은 재량):

```ts
export function getAllPosts(): Post[];                       // publishedAt 내림차순
export function getPostsByCategory(slug: CategorySlug): Post[];
export function getPost(category: CategorySlug, slug: string): Post | undefined;
export function getAllTags(): { tag: string; count: number }[];
```

핵심 불변식:

- **frontmatter 검증 실패는 예외를 던져 빌드를 깨뜨린다.** 조용히 건너뛰지 마라. 이유: ARCHITECTURE.md 실패 처리 원칙 — 깨진 글이 조용히 배포되는 것보다 낫다.
- **`draft: true` 인 글은 프로덕션에서 제외**하고 개발에서는 포함한다 (`process.env.NODE_ENV` 기준).
- 파일명이 규약(`YYYY-MM-DD-slug.mdx`)에 맞지 않으면 예외를 던진다.
- `content/{category}` 의 디렉토리 이름이 `CATEGORIES` 에 없으면 예외를 던진다.
- 같은 카테고리 안에 slug 가 중복되면 예외를 던진다.
- `readingMinutes` 는 한글 기준으로 계산하라 (한글은 분당 약 500자). 최소 1.
- 파일 읽기는 `node:fs` 동기 API 로 충분하다. 빌드 타임에만 호출된다.

`content/` 디렉토리와 카테고리별 하위 디렉토리 3개를 만들고, 각 디렉토리에 `.gitkeep` 을 둔다 (실제 글은 step 4 에서 추가).

### 5) 테스트 — `src/lib/content/schema.test.ts`

**실패 케이스를 반드시 포함하라** (TDD: failing test 먼저):

- `publishedAt` 이 `Z` 로 끝나면 거부
- 알 수 없는 `category` 거부
- `category: "papers"` 인데 `paper` 없으면 거부
- `category: "notes"` 인데 `paper` 가 있으면 거부
- `source.url` 이 URL 이 아니면 거부
- 정상 frontmatter 는 통과하고 `tags`/`draft` 기본값이 채워짐
- 에러 메시지에 파일 경로가 들어 있음

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/types/content.ts','src/lib/content/schema.ts','src/lib/content/posts.ts','src/lib/content/schema.test.ts']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
for (const d of ['content/hf-blog','content/papers','content/notes']) {
  if(!fs.existsSync(d)) throw new Error('디렉토리 없음: '+d);
}
const s=fs.readFileSync('src/lib/content/schema.ts','utf8');
if(!/categories/.test(s)) throw new Error('schema.ts 가 categories.ts 를 참조하지 않는다 — slug 를 이중 정의했을 가능성');
console.log('콘텐츠 계층 파일/디렉토리 OK');
"
node -e "
const fs=require('fs');
const t=fs.readFileSync('src/lib/content/schema.test.ts','utf8');
for (const k of ['papers','draft','+0900']) {
  if(!t.includes(k)) throw new Error('테스트에 '+k+' 관련 케이스가 없다');
}
console.log('스키마 실패 케이스 테스트 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. 아키텍처 체크리스트:
   - `ARCHITECTURE.md` 의 `src/lib/` · `content/` 계약을 따랐는가?
   - 카테고리 slug 를 `categories.ts` 에서만 가져왔는가? 이중 정의 없음?
   - CLAUDE.md CRITICAL — KST 강제, 본문은 파일에만?
   - frontmatter 검증 실패가 빌드를 깨뜨리는가? (조용히 skip 하지 않는가)
3. `phases/blog-1-content-pipeline/index.json` 의 step 0 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **노출한 함수 시그니처와 파일 경로, frontmatter 필수 필드**를 한 줄로 기록. 다음 step 들이 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **카테고리 slug 문자열을 다시 정의하지 마라.** 이유: `src/lib/categories.ts` 가 단일 진실 공급원이다 (PRD 요구사항).
- **MDX 를 컴파일하거나 렌더링하지 마라.** 이유: step 1 의 범위다. 이 step 은 frontmatter 파싱과 본문 문자열 반환까지만 한다.
- **검증 실패를 `try/catch` 로 삼켜 빈 배열을 반환하지 마라.** 이유: 깨진 글이 조용히 배포된다.
- **본문을 DB 나 외부 저장소에 넣지 마라.** 이유: CLAUDE.md CRITICAL.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-1-content-pipeline/index.json` 의 step 0 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라 (blog-0 의 17개 테스트 포함).
