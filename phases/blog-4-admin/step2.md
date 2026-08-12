# Step 2: admin-dashboard

관리자 첫 화면. 레포에 있는 글을 목록으로 보여주고 편집·신규 작성으로 들어가는 입구를 만든다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — 색·타이포·간격 토큰과 **AI 슬롭 안티패턴 표**. 관리자 화면도 같은 규칙을 따른다.
- `/docs/ARCHITECTURE.md` — `src/app/admin/` 계약, 실패 처리 원칙
- `/CLAUDE.md` — CRITICAL: 페이지에서 화이트리스트 재확인 · 조회수는 Turso 에만
- `/src/lib/auth.ts` — **step 0 이 만들었다.** `requireAdmin()` 을 첫 줄에서 호출한다.
- `/src/services/github.ts` — **step 1 이 만들었다.** `listPosts()` · `isPublishConfigured()`
- `/src/services/turso.ts` — `getViews(postIds): Promise<Record<string, number>>` · `isViewTrackingEnabled()`. post_id 규약은 `{category}/{slug}`.
- `/src/lib/categories.ts` — `CATEGORIES` · `getCategory()` · `categoryHref()`
- `/src/components/post/PostCard.tsx` — 공개 목록의 카드. **재사용하지 말고 참고만 하라** (관리자 목록은 표에 가깝다). 이 파일을 수정하지 마라.
- `/src/lib/format.ts` — 날짜 포맷 유틸

## 작업

### `src/app/admin/page.tsx` — 글 목록

첫 줄에서 `requireAdmin()` 을 호출한다. 그다음 `listPosts()` 로 목록을 가져온다.

보여줄 것 (한 행에):

- 제목 · 카테고리 · 발행일(KST) · 태그
- **초안/발행 배지** (`draft: true` 면 눈에 띄게)
- 조회수 (`getViews()` 로 한 번에 조회. 꺼져 있으면 그냥 빼라)
- 편집 링크 → `/admin/editor?path={경로}` (라우트는 step 3 이 만든다. 지금은 링크만 걸어 두면 된다)

그리고 **신규 작성** 버튼 → `/admin/editor`

정렬은 발행일 내림차순. 카테고리 필터를 둔다.

### 목록의 출처를 GitHub 으로 하는 이유 (반드시 지켜라)

**`getAllPosts()` 나 `fs` 로 `content/` 를 읽지 마라.** 두 가지 이유다:

1. 관리자 페이지는 `auth()` 때문에 **동적 라우트**다. 동적 렌더에서 `fs` 로 `content/` 를 읽으면 Vercel 번들에 그 파일들이 없어 **배포 후에만 깨진다** — 로컬에서는 멀쩡해서 잡히지 않는다.
2. 방금 발행한 글은 레포에 커밋됐지만 재배포(~90초)가 끝나기 전이다. 빌드 타임 스냅샷을 보여주면 "발행했는데 목록에 없다" 가 된다. 레포가 진실이다.

### 설정이 안 된 경우

`isPublishConfigured()` 가 `false` 면 목록 대신 **무엇이 빠졌는지** 안내한다 (`GITHUB_CONTENT_*` 중 어떤 이름이 필요한지). **값을 찍지 말고 이름만** 보여라. 빈 화면을 내지 마라 — 사용자가 원인을 알 수 없다.

`listPosts()` 가 실패하면(토큰 만료·레이트리밋 등) 에러 원인을 화면에 그대로 보여준다 (ARCHITECTURE: 조용히 삼키지 마라). 단 **토큰 값은 절대 화면에 내지 마라.**

frontmatter 가 깨진 글은 step 1 규약대로 목록에 **오류 표시로 남는다.** 편집 링크는 살려 두어라 — 고치러 들어가야 한다.

### 관리자 상단 바

step 0 의 `src/app/admin/layout.tsx` 에 이미 있다. 목록 화면이 필요로 하는 최소한만 보태라 (예: 현재 위치 표시). 껍데기를 다시 만들지 마라.

### 테스트

이 step 의 로직 중 순수한 부분만 테스트한다 (예: 카테고리 필터링, 정렬, 조회수 병합). **네트워크를 타는 페이지 전체를 테스트하려 애쓰지 마라** — 값이 낮고 깨지기 쉽다. 순수 함수로 뽑아낼 수 있는 것만 뽑아 `src/app/admin/*.test.ts` 또는 `src/lib/*.test.ts` 에 둔다 (`vitest.config.ts` 의 include 는 `src/**/*.test.{ts,tsx}` 다).

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const p=fs.readFileSync('src/app/admin/page.tsx','utf8');
if(!/requireAdmin/.test(p)) throw new Error('관리자 페이지가 requireAdmin() 을 호출하지 않는다 (CLAUDE.md CRITICAL — 이중 확인)');
if(!/listPosts/.test(p)) throw new Error('github 서비스로 목록을 읽지 않는다');
if(/getAllPosts|node:fs|from \"fs\"|require\(.fs.\)/.test(p)) throw new Error('동적 관리자 페이지에서 fs/getAllPosts 로 content 를 읽지 마라 — 배포 후에만 깨진다');
if(!/admin\/editor/.test(p)) throw new Error('에디터로 가는 링크가 없다');
console.log('대시보드 규약 OK');
"
node -e "
const fs=require('fs');
const p=fs.readFileSync('src/app/admin/page.tsx','utf8');
if(!/isPublishConfigured/.test(p)) throw new Error('미설정 상태 안내가 없다');
if(/GITHUB_CONTENT_TOKEN\s*\}|\{process\.env\.GITHUB_CONTENT_TOKEN/.test(p)) throw new Error('토큰 값을 화면에 렌더하려 한다');
console.log('미설정 처리 OK');
"
node -e "
const { execSync } = require('child_process');
const out = execSync('npx next build', { encoding: 'utf8', env: { ...process.env, TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', GITHUB_CONTENT_TOKEN: '' } });
if(!/Proxy \(Middleware\)/.test(out)) throw new Error('라우트 표에 Proxy 가 없다 — proxy.ts 가 인식되지 않았다');
console.log('환경변수 없이도 빌드 통과 · proxy 인식 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 실제 GitHub 계정으로 로그인해 `/admin` 을 **눈으로 확인한다**:
   - 레포의 글 9건이 전부 보이는가? 초안 1건에 배지가 붙는가?
   - 카테고리 필터가 동작하는가?
   - 조회수가 보이는가? (Turso 가 켜져 있다면)
   - 편집 링크가 `/admin/editor?path=content/...` 로 걸리는가? (라우트는 아직 없어 404 가 정상이다)
   - 라이트/다크 양쪽에서 읽히는가? 375px 에서 가로로 밀리지 않는가?
   - UI_GUIDE 의 AI 슬롭 안티패턴(그라디언트 텍스트·글로우·보라/인디고·backdrop blur)을 쓰지 않았는가?
3. **로그아웃 상태로 `/admin` 에 접근해 차단되는지 다시 확인한다.** step 0 의 보호가 이 step 의 변경으로 뚫리지 않았는지 본다.
4. 아키텍처 체크리스트:
   - 공개 페이지가 그대로인가? (`(public)` 아래를 건드리지 않았는가)
   - 글 상세가 여전히 SSG(`●`) 인가? 동적 라우트가 `/api/views` + `/admin/*` 외에 늘지 않았는가?
   - 외부 호출이 `src/services/` 를 경유하는가?
5. `phases/blog-4-admin/index.json` 의 step 2 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **만든 파일 경로, 편집 링크의 쿼리 규약(`?path=`), 목록 데이터 출처와 표시 항목**을 한 줄로 기록. step 3 이 이 규약대로 파라미터를 받는다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`getAllPosts()` · `fs` 로 `content/` 를 읽지 마라.** 위 "출처를 GitHub 으로 하는 이유" 참고.
- **에디터를 만들지 마라.** step 3 의 범위다. 여기서는 링크만 건다.
- **발행·업로드 API 를 만들지 마라.** step 4 의 범위다.
- **`.env.local` 을 편집하거나 출력하지 마라.** 토큰 값을 화면에 렌더하지 마라.
- **공개 페이지·`src/components/post/`·`src/components/mdx/` 를 수정하지 마라.**
- **`src/proxy.ts` · `src/lib/auth.ts` 의 보호 범위를 줄이지 마라.**
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-4-admin/index.json` 의 step 2 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
