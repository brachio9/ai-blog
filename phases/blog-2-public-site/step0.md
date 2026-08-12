# Step 0: intro-page

사이트 첫 화면을 만든다 — 임팩트 있는 히어로 + 카테고리별 최신글. 그리고 앞 phase 의 검증용 라우트를 치운다.

## 읽어야 할 파일

- `/docs/PRD.md` — "디자인" 절과 카테고리 3종
- `/docs/UI_GUIDE.md` — **타이포그래피·레이아웃·애니메이션·AI 슬롭 안티패턴이 이 step 의 명세다.**
- `/src/lib/content/posts.ts` — `getAllPosts()` · `getPostsByCategory(slug)` · `getAllTags()`. **이미 존재한다.**
- `/src/lib/categories.ts` — `CATEGORIES` · `categoryHref(category)` · `getCategory(slug)`
- `/src/types/content.ts` — `Post` 구조 (`frontmatter` · `slug` · `category` · `readingMinutes`)
- `/src/components/layout/Container.tsx` — 페이지 컨테이너. 재사용하라.
- `/src/app/page.tsx` · `/src/app/layout.tsx` — blog-0 산출물. 아래 0) 에서 `(public)` 라우트 그룹으로 재배치한다.

## 배경 (확인된 사실)

- 샘플 글 9건이 `content/{hf-blog,papers,notes}/` 에 있고 그중 1건은 `draft: true` 다. `getAllPosts()` 는 프로덕션에서 초안을 제외하고 `publishedAt` 내림차순으로 준다.
- `Post.frontmatter` 에는 `title` · `summary` · `publishedAt` · `tags` · `cover?` · `source?` 가 있다.
- 글 상세 URL 은 `/{category}/{slug}` 규약이다 (다음 step 에서 만든다). 카드 링크는 이 규약으로 걸어라.

## 작업

### 0) 라우트 그룹 정리 — `src/app/(public)/`

`docs/ARCHITECTURE.md` 는 공개 페이지를 `src/app/(public)/` 아래에 두도록 규정한다. 현재는 `src/app/page.tsx` 가 루트에 있고 **헤더·푸터가 루트 레이아웃(`src/app/layout.tsx`)에 박혀 있다.**

이걸 지금 바로잡는다. 이유: App Router 의 레이아웃은 **교체가 아니라 중첩**이라, 이대로 두면 다음 phase 의 `/admin` 이 블로그 헤더·푸터를 그대로 물려받는다. 나중에 고치려면 그때 만든 화면들까지 함께 옮겨야 한다.

| 파일 | 담을 것 |
|---|---|
| `src/app/layout.tsx` (루트) | `<html>` · `<body>` · 폰트 변수 · **테마 인라인 스크립트** · `metadata` 기본값. **헤더·푸터는 여기서 뺀다.** |
| `src/app/(public)/layout.tsx` (신규) | `<SiteHeader />` + `<main className="flex-1">` + `<SiteFooter />` |
| `src/app/(public)/page.tsx` | 홈 (아래 1·2번) |

- **루트 레이아웃의 테마 스크립트·폰트 변수·`suppressHydrationWarning` 을 지우거나 옮기지 마라.** blog-0 이 FOUC 를 막으려고 넣은 것이고, `(public)` 으로 내리면 관리자 화면에서 테마가 깨진다.
- 라우트 그룹 `(public)` 은 **URL 에 나타나지 않는다.** 홈은 그대로 `/` 다.
- 이후 만들 공개 페이지(카테고리·글 상세·검색)도 전부 `(public)` 안에 둔다. 다음 step 들이 그 규약을 따르도록 summary 에 명시하라.
- blog-0 의 레이아웃 관련 테스트가 깨지면 **경로만 고치고 단언 내용은 유지하라.**

### 1) 히어로 — `src/app/(public)/page.tsx`

`PRD.md` 가 정한 방향은 **"임팩트 히어로 + 카테고리별 최신글"** 이다.

- 큰 타이포그래피가 주인공이다 (`text-5xl md:text-6xl font-semibold tracking-tight`). 사이트 성격을 한 문장으로 말한다.
- 히어로만 중앙 정렬을 허용한다 (UI_GUIDE 레이아웃 규칙).
- **장식을 넣지 마라.** gradient orb · glow · backdrop blur · gradient-text 는 UI_GUIDE 안티패턴이다.
- 애니메이션은 진입 fade-in 300ms 1회까지만. 스크롤 트리거 금지.

### 2) 카테고리별 최신글

`CATEGORIES` 를 순회해 각 카테고리의 최신 글 3건씩 보여준다. **카테고리 이름·slug 를 하드코딩하지 마라.**

각 섹션에 카테고리 이름 + `description` + "전체 보기" 링크(`categoryHref`).

### 3) 글 카드 컴포넌트 — `src/components/post/PostCard.tsx`

다음 step 들(카테고리 목록·검색)이 **그대로 재사용**할 카드다. 여기서 제대로 만들어라.

```tsx
export interface PostCardProps {
  post: Post;
  /** 카테고리 배지 표시 여부. 카테고리 페이지 안에서는 불필요하므로 끌 수 있어야 한다. */
  showCategory?: boolean;
}
```

카드에 담을 것: 제목 · `summary` · 날짜(KST 표기) · 읽기 시간 · 태그 몇 개 · (선택) 카테고리 배지. `cover` 가 있으면 썸네일.

- 카드 전체가 링크여야 한다 (제목만 클릭되게 하지 마라).
- 모서리는 `rounded-md`, 균일한 `rounded-2xl` 금지 (UI_GUIDE).
- 날짜 표기는 `Intl.DateTimeFormat` 에 `timeZone: "Asia/Seoul"` 을 명시하라. 이유: 서버·브라우저 타임존이 달라도 같은 날짜가 나와야 한다.

### 4) 날짜 포맷 유틸 — `src/lib/format.ts`

```ts
export function formatDate(iso: string): string;        // "2026년 8월 9일"
export function formatDateShort(iso: string): string;   // "2026.08.09"
```

KST 고정. 다음 step 들이 재사용한다. **각 컴포넌트에서 날짜 포맷을 따로 만들지 마라.**

### 5) 검증용 라우트 삭제

`src/app/mdx-preview/` 를 **디렉토리째 삭제한다.** 이유: blog-1 의 검증 전용 화면이었고, 사이트의 일부가 아니다. 삭제 후 어디에도 참조가 남지 않아야 한다.

### 6) 테스트

- `src/lib/format.test.ts` — KST 경계 확인. **UTC 기준으로는 전날인 시각**(예: `2026-08-09T00:30:00+0900`)이 `2026년 8월 9일` 로 나오는지.
- `src/components/post/PostCard.test.tsx` — 제목·요약·날짜가 렌더되고, 링크가 `/{category}/{slug}` 인지.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
if(fs.existsSync('src/app/mdx-preview')) throw new Error('mdx-preview 라우트가 남아 있다 — 삭제해야 한다');
for (const f of ['src/components/post/PostCard.tsx','src/lib/format.ts','src/lib/format.test.ts']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
const home=fs.readFileSync('src/app/(public)/page.tsx','utf8');
for (const s of ['hf-blog','papers','notes']) {
  if(home.includes('\"'+s+'\"')||home.includes(\"'\"+s+\"'\")) throw new Error('홈에 카테고리 slug 하드코딩: '+s);
}
console.log('홈 구성 + 카테고리 비하드코딩 + preview 제거 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const src=walk('src').filter(f=>/\.tsx?$/.test(f));
const bad=src.filter(f=>/mdx-preview/.test(fs.readFileSync(f,'utf8')));
if(bad.length) throw new Error('mdx-preview 참조가 남아 있다: '+bad.join(', '));
// AI 슬롭 안티패턴 기계 검사
const home=fs.readFileSync('src/app/(public)/page.tsx','utf8');
for (const [pat,name] of [[/backdrop-blur/,'backdrop blur'],[/bg-gradient-to-.*bg-clip-text|text-transparent/,'gradient-text'],[/blur-3xl/,'gradient orb'],[/animate-pulse|animate-bounce/,'과도한 애니메이션']]) {
  if(pat.test(home)) throw new Error('UI_GUIDE 안티패턴 사용: '+name);
}
console.log('안티패턴 미사용 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk('.next/server/app').filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(f,'utf8')).join('');
for (const t of ['허깅페이스 소식','최신 논문','수집 자료']) {
  if(!html.includes(t)) throw new Error('홈에 카테고리 섹션이 없다: '+t);
}
// draft 글 제목을 파일에서 직접 읽어 노출 여부를 확인한다 (제목을 하드코딩하지 않는다)
const drafts=['hf-blog','papers','notes'].flatMap(c=>fs.readdirSync('content/'+c).map(f=>'content/'+c+'/'+f))
  .map(f=>fs.readFileSync(f,'utf8'))
  .filter(s=>/^draft:\s*true/m.test(s))
  .map(s=>(s.match(/^title:\s*[\"']?(.+?)[\"']?\s*$/m)||[])[1])
  .filter(Boolean);
if(!drafts.length) throw new Error('draft:true 샘플 글을 찾지 못했다 — 초안 제외를 검증할 수 없다');
for (const t of drafts) if(html.includes(t)) throw new Error('draft 글이 노출됐다: '+t);
console.log('빌드 산출 HTML 검증 OK (draft '+drafts.length+'건 제외 확인)');
"
pytest scripts/test_execute.py -q
```

마지막 커맨드 앞의 HTML 검사는 `npm run build` 이후에 실행한다.

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 로 `/` 를 열어 확인한다:
   - 라이트/다크 양쪽에서 히어로가 읽히는가?
   - 375px 폭에서 카드가 깨지지 않고 페이지 가로 스크롤이 없는가?
   - 초안 글이 안 보이는가?
   - 카드를 누르면 `/{category}/{slug}` 로 가는가? (아직 404 여도 정상 — 다음 step 에서 만든다)
3. 아키텍처 체크리스트:
   - UI_GUIDE 안티패턴 없음? 애니메이션 허용 목록 준수?
   - 색을 토큰으로만 썼는가?
   - 카테고리가 `categories.ts` 순회로 그려지는가?
4. `phases/blog-2-public-site/index.json` 의 step 0 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`PostCard` props 시그니처와 `format.ts` 함수 목록, 글 상세 URL 규약**을 한 줄로 기록. 다음 step 들이 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **카테고리 목록·글 상세·검색·RSS 를 만들지 마라.** 이유: step 1~3 의 범위다.
- **댓글·조회수를 만들지 마라.** 이유: 이번 phase 범위 밖이며 외부 서비스 준비가 끝나야 한다.
- **카테고리 이름·slug 를 하드코딩하지 마라.** 이유: `categories.ts` 가 단일 진실 공급원이다.
- **날짜 포맷을 컴포넌트마다 따로 만들지 마라.** 이유: KST 고정 규칙이 한 곳에 있어야 한다 (CLAUDE.md CRITICAL).
- **UI_GUIDE 안티패턴을 쓰지 마라** — gradient-text · backdrop blur · glow · gradient orb · 보라/인디고 · 이모지 아이콘.
- **blog-0·blog-1 의 컴포넌트·토큰·MDX 파이프라인을 재작성하지 마라.** 재사용하라.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-2-public-site/index.json` 의 step 0 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라 (57개).
