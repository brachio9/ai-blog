# Step 0: view-counts

글 조회수를 Turso 에 기록하고 글 상세 페이지에 표시한다. **글 페이지는 정적 생성을 유지해야 하므로** 조회수는 클라이언트에서 API 를 거쳐 다룬다.

## 읽어야 할 파일

- `/docs/ADR.md` — **ADR-002 (Turso 는 휘발성 수치 전용)**
- `/CLAUDE.md` — CRITICAL: Turso 에는 조회수 같은 휘발성 수치만. 본문·인증정보·댓글 금지. 환경변수 이름 표.
- `/docs/ARCHITECTURE.md` — `src/services/` 계약(외부 API 래퍼), **실패 처리 원칙**
- `/src/app/(public)/[category]/[slug]/page.tsx` — 조회수를 붙일 글 상세 페이지
- `/src/lib/format.ts` — 숫자 포맷이 필요하면 여기 규약을 따르라
- `/.env.example` — 환경변수 목록

## 배경 (실제 자격증명으로 검증한 사실 — 다시 조사하지 마라)

`@libsql/client@0.17` 로 아래를 전부 실행해 확인했다:

- `CREATE TABLE IF NOT EXISTS` 동작
- UPSERT 증가 동작 — 두 번 호출 후 `count = 2` 확인:
  ```sql
  INSERT INTO post_views (post_id, count, updated_at)
  VALUES (?, 1, ?)
  ON CONFLICT(post_id) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
  ```
- `WHERE post_id IN (?, ?)` 배치 조회 동작. **없는 글은 행 자체가 반환되지 않는다** — 호출 측에서 0 으로 채워야 한다.

**정적 생성 제약:** 글 상세 페이지는 `●`(SSG) 다. 서버에서 조회수를 읽으면 페이지가 동적이 되어 지금까지 만든 정적 생성이 무너진다. 조회수는 **클라이언트 컴포넌트가 API 라우트를 호출**해 다룬다.

## 작업

### 1) 의존성

```bash
npm install @libsql/client --no-audit --no-fund
```

### 2) Turso 래퍼 — `src/services/turso.ts`

`ARCHITECTURE.md` 규칙상 외부 서비스 호출은 이 파일을 경유한다. 컴포넌트·라우트에서 `@libsql/client` 를 직접 import 하지 마라.

```ts
export function isViewTrackingEnabled(): boolean;          // 환경변수 유무
export async function incrementView(postId: string): Promise<number>;  // 증가 후 값
export async function getView(postId: string): Promise<number>;
export async function getViews(postIds: string[]): Promise<Record<string, number>>;  // 없는 글은 0
```

요구 사항:

- **환경변수(`TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN`)가 없으면 예외를 던지지 말고** `isViewTrackingEnabled()` 가 `false` 를 반환하게 하라. 조회 함수는 0 을 준다. 이유: 환경변수 없이도 로컬 개발과 빌드가 돌아가야 한다.
- 스키마는 **첫 호출 시 `CREATE TABLE IF NOT EXISTS` 로 준비**하되, 모듈 수준 Promise 캐시로 **프로세스당 한 번만** 실행하라. 매 요청마다 DDL 을 보내지 마라.
- 클라이언트 인스턴스도 모듈 수준에서 한 번만 만든다.
- `post_id` 형식은 **`{category}/{slug}`** 로 고정한다 (글 상세 URL 규약과 동일).
- **모든 함수는 실패해도 던지지 않고** 0 또는 빈 결과를 반환하고 `console.warn` 만 남긴다. 이유: ARCHITECTURE 실패 처리 원칙 — 조회수가 글 렌더를 막으면 안 된다.

스키마:

```sql
CREATE TABLE IF NOT EXISTS post_views (
  post_id    TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL          -- KST ISO-8601
)
```

### 3) API 라우트 — `src/app/api/views/route.ts`

```
POST /api/views    body: { postId: string }   → { count: number }   조회수 증가
GET  /api/views?id={postId}                   → { count: number }   증가 없이 조회
```

- `export const dynamic = "force-dynamic"` — DB 를 읽으므로 정적화하면 안 된다.
- **`postId` 를 검증하라.** 검증 없이 받으면 아무 문자열이나 테이블에 쌓인다. 다만 방식이 중요하다:
  - ✅ **형식 + 카테고리 소속만 검사한다.** `{category}/{slug}` 형태이고, `category` 가 `src/lib/categories.ts` 의 `getCategory()` 로 조회되며, `slug` 가 `^[a-z0-9]+(-[a-z0-9]+)*$` 를 만족하고 길이가 합리적인 범위(예: 100자 이하)인지. 순수 함수 `isValidPostId(id: string): boolean` 로 분리한다.
  - ❌ **`getPost()` 로 실재 여부를 확인하지 마라.** 이유: `getPost()` 는 런타임에 `content/` 디렉토리를 `fs` 로 읽는다. Next 의 output file tracing 은 이런 동적 파일 접근을 잡아내지 못해 **Vercel 서버리스 번들에 `content/` 가 포함되지 않을 수 있다.** 로컬에서는 통과하고 배포 후에만 깨지는 종류의 버그다. 정적 생성된 페이지는 빌드 타임에 읽으므로 문제가 없지만, **런타임 API 라우트는 다르다.**
  - 형식만 검증해도 쌓일 수 있는 건 규격에 맞는 문자열뿐이라 피해가 제한된다. 존재하지 않는 글의 행은 어차피 아무 데도 표시되지 않는다.
- 조회수 추적이 비활성(환경변수 없음)이면 `{ count: 0 }` 을 200 으로 반환한다. 500 을 내지 마라.
- 실패해도 500 대신 `{ count: 0 }` 을 반환하고 서버 로그에만 남긴다.

### 4) 표시 컴포넌트 — `src/components/post/ViewCount.tsx`

```tsx
"use client";
export function ViewCount({ postId }: { postId: string }): React.ReactElement | null;
```

- 마운트 시 **세션당 한 번만 증가**시킨다. `sessionStorage` 에 `viewed:{postId}` 키를 두고, 이미 있으면 `GET` 으로 조회만 한다. 이유: 새로고침할 때마다 증가하면 숫자가 무의미해진다.
- 로딩 중에는 자리를 비워두되 **레이아웃이 흔들리지 않게** 하라 (숫자가 들어올 때 주변이 밀리면 안 된다).
- 실패하면 **아무것도 렌더하지 않는다**(`null`). 에러 메시지를 독자에게 보이지 마라.
- 숫자는 `Intl.NumberFormat("ko-KR")` 로 포맷한다.
- 개발 환경에서 React StrictMode 로 인해 effect 가 두 번 실행되어도 **두 번 증가하지 않게** 하라 (sessionStorage 검사를 증가 요청 **전에** 수행).

### 5) 글 상세 페이지에 연결

`src/app/(public)/[category]/[slug]/page.tsx` 의 메타 정보 줄(발행일·읽기 시간 옆)에 `<ViewCount postId={`${category}/${slug}`} />` 를 넣는다.

**페이지가 여전히 `●`(SSG) 여야 한다.** 서버에서 조회수를 읽지 마라.

### 6) 테스트 — `src/services/turso.test.ts`

**실제 DB 에 붙지 않는 단위 테스트**를 작성하라 (CI·오프라인에서도 돌아야 한다):

- 환경변수가 없을 때 `isViewTrackingEnabled()` 가 `false` 이고 조회 함수가 0 을 반환하는지
- `getViews()` 가 반환되지 않은 `post_id` 를 0 으로 채우는지 (클라이언트를 목으로 주입하거나 순수 함수로 분리해 검증)
- `post_id` 형식 검증 로직

`src/app/api/views/route.test.ts` 는 선택이다. 대신 형식 검증 로직을 순수 함수(`isValidPostId`)로 분리해 테스트하라.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs'), path=require('path');
for (const f of ['src/services/turso.ts','src/app/api/views/route.ts','src/components/post/ViewCount.tsx','src/services/turso.test.ts']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const offenders=walk('src').filter(f=>/\.tsx?$/.test(f) && f!=='src/services/turso.ts' && /@libsql\/client/.test(fs.readFileSync(f,'utf8')));
if(offenders.length) throw new Error('services/turso.ts 외부에서 @libsql/client 직접 import: '+offenders.join(', '));
const r=fs.readFileSync('src/app/api/views/route.ts','utf8');
if(!/force-dynamic/.test(r)) throw new Error('API 라우트에 force-dynamic 선언이 없다');
const v=fs.readFileSync('src/components/post/ViewCount.tsx','utf8');
if(!/sessionStorage/.test(v)) throw new Error('세션당 1회 증가 처리가 없다 — 새로고침마다 증가한다');
if(/getPost\s*\(/.test(r)) throw new Error('API 라우트에서 getPost() 로 런타임 파일 접근 — Vercel 번들에 content/ 가 없어 배포 후에만 깨진다. 형식+카테고리 검증만 하라');
if(!/isValidPostId/.test(r)) throw new Error('postId 형식 검증 함수(isValidPostId)를 쓰지 않는다');
console.log('조회수 구조 규약 OK');
"
node -e "
const fs=require('fs');
const t=fs.readFileSync('src/services/turso.ts','utf8');
if(!/CREATE TABLE IF NOT EXISTS/i.test(t)) throw new Error('스키마 준비 구문이 없다');
if(!/ON CONFLICT/i.test(t)) throw new Error('UPSERT 증가 구문이 없다');
const sql=t.replace(/\/\/.*|\/\*[\s\S]*?\*\//g,'');
for (const bad of [/CREATE TABLE[^;]*\b(body|content|markdown|mdx)\b/i, /INSERT INTO\s+(posts|comments|users)\b/i]) {
  if(bad.test(sql)) throw new Error('ADR-002 위반 — Turso 에 본문/댓글/사용자를 넣으려 한다');
}
console.log('Turso 스키마·ADR-002 OK');
"
node -e "
// 글 상세가 여전히 정적(SSG)인지 — 서버에서 조회수를 읽으면 깨진다
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk('.next/server/app').filter(f=>f.endsWith('.html') && /(hf-blog|papers|notes)\//.test(f));
if(html.length < 8) throw new Error('글 상세 정적 생성이 깨졌다: '+html.length+'건 (기대 8건) — 서버에서 조회수를 읽었을 가능성');
console.log('글 상세 정적 생성 유지 OK ('+html.length+'건)');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. **`npm run build` Route 표를 확인하라.** 글 상세가 `●`(SSG) 를 유지해야 하고, `/api/views` 만 `ƒ` 여야 한다.
3. `npm run start` 후 브라우저로 확인한다 (`.env.local` 에 Turso 값이 이미 채워져 있다):
   - 글 상세에 조회수가 표시되는가?
   - **새로고침해도 숫자가 계속 오르지 않는가?** (세션당 1회)
   - 다른 글로 이동하면 그 글의 조회수가 따로 오르는가?
   - 숫자가 들어올 때 주변 레이아웃이 밀리지 않는가?
   - 라이트/다크 양쪽에서 읽히는가?
4. **환경변수 없이도 동작하는지 확인하라.** `.env.local` 은 **절대 편집하지 마라** — 사용자의 실제 자격증명이 들어 있다. 대신 셸에서 빈 값으로 덮어써서 확인한다:
   ```bash
   TURSO_DATABASE_URL= TURSO_AUTH_TOKEN= npm run build
   ```
   빌드가 성공하고 글 페이지가 정상 생성되면 통과다 (조회수만 안 보이는 게 정상). 이 경로는 `src/services/turso.test.ts` 의 단위 테스트로도 반드시 덮어야 한다.
5. 아키텍처 체크리스트:
   - ADR-002 — Turso 에 수치만 넣었는가? 본문·인증정보 없음?
   - `src/services/` 를 경유했는가? 컴포넌트에서 직접 DB 접근 없음?
   - 조회수 실패가 글 렌더를 막지 않는가?
6. `phases/blog-3-comments-and-views/index.json` 의 step 0 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`turso.ts` 함수 시그니처, API 경로·요청 형식, `post_id` 규약, 스키마**를 한 줄로 기록. blog-4 관리자 대시보드가 같은 서비스를 재사용한다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **서버 컴포넌트에서 조회수를 읽지 마라.** 이유: 글 상세가 `ƒ`(동적)이 되어 지금까지 지켜온 정적 생성이 무너진다.
- **Turso 에 본문·인증정보·댓글을 넣지 마라.** 이유: ADR-002 · CLAUDE.md CRITICAL. 조회수 같은 휘발성 수치 전용이다.
- **`src/services/turso.ts` 외부에서 `@libsql/client` 를 import 하지 마라.** 이유: ARCHITECTURE 규칙.
- **환경변수가 없다고 예외를 던지거나 빌드를 실패시키지 마라.** 이유: 조회수는 부가 기능이다. 없으면 조용히 꺼져야 한다.
- **조회수 실패를 독자에게 에러로 보여주지 마라.** 아무것도 안 보이는 게 맞다.
- **매 요청마다 `CREATE TABLE` 을 보내지 마라.** 프로세스당 한 번으로 캐시하라.
- **댓글을 만들지 마라.** 이유: step 1 의 범위다.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-3-comments-and-views/index.json` 의 step 0 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라 (103개).
