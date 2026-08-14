# Step 2: topic-routes

주제 축 라우트 두 개를 만들고 집계 함수와 포맷 필터를 붙인다. 헤더·홈은 건드리지 않는다.

## 읽어야 할 파일

- `docs/PRD.md` — 「분류 축 셋」 절
- `docs/UI_GUIDE.md` — 「분류 축은 셋이고 색을 쓰는 것은 하나뿐이다」 절
- `design/styles.css` — `.empty` · `.list-tight` · `.kicker` 정의
- `design/components/controls.html` — 빈 상태의 실제 모습
- `src/app/(public)/[category]/page.tsx` — **골격 원본.** 축 페이지가 이걸 닮되 한 곳이 다르다
- `src/app/(public)/tags/page.tsx` — 정적 색인 + 클라이언트 필터 패턴
- `src/lib/stats.ts` — `countByCategory` (형태 원본)
- `src/lib/content/posts.ts` — `getPostsByCategory` (형태 원본)
- `src/lib/pagination.ts` — `filterByTag` · `listHref`
- `src/components/post/PostList.tsx` · `TagPosts.tsx`
- `src/app/sitemap.ts`
- step 0·1 산출물 (summary 참조)

## 작업

### 1) `.empty` 클래스를 앱으로 가져온다

`design/styles.css` 의 `.empty` · `.empty-line` · `.empty-next` 를 **정의를 바꾸지 말고** `src/app/globals.css` 로 옮긴다.
blog-7 이 이 클래스를 안 옮겼는데, 빈 축 페이지가 필요로 한다.

### 2) 집계·조회 함수

```ts
// src/lib/content/posts.ts — getPostsByCategory 옆
export function getPostsByAxis(slug: AxisSlug): Post[];   // 전 카테고리를 훑는다

// src/lib/stats.ts — countByCategory 옆
export function countByAxis(): AxisCount[];               // 6축 전부, 0편도 포함
```

`countByAxis` 는 **글이 0편인 축도 반드시 포함**한다. 빈 축이 목록에서 사라지면 `/topics` 가 지도 노릇을 못 한다.

### 3) `/topics` — 6축 색인

`src/app/(public)/topics/page.tsx`. 정적 페이지.

- `.masthead` + 제목 「주제」 + 설명 한 문단 + `.rule-pair`
- 6축을 `order` 순으로. 각 항목: **번호(mono 두 자리 `01`)** · 이름 · 설명 · `covers` 키워드 · 편수 · 최근 몇 편
- 밀도는 `.list-tight` 쪽. 색인면이다

**축에 색을 주지 마라.** 번호가 부호다.

### 4) `/topics/[axis]` — 축별 목록

`src/app/(public)/topics/[axis]/page.tsx`. `generateStaticParams` 로 6페이지 정적 생성.

`[category]/page.tsx` 와 같은 골격이되 **두 곳이 다르다**:

1. kicker 에 `KICKER_ACCENT`(안료)를 **복제하지 마라.** 축은 무채다 — muted 로 그린다
2. `<PostList showCategory>` — 축은 카테고리를 가로지르므로 갈래 라벨을 켠다

글이 0편인 축은 `.empty` 로 그린다. 사과하지 않고 **다음에 갈 곳**을 준다 (다른 축 · 태그 색인).

`generateMetadata` 로 축 이름·설명을 메타에 싣는다.

### 5) 포맷 필터

`?format=` 을 `?tag=` 와 **같은 규약**으로 추가한다.

```ts
// src/lib/pagination.ts
export function filterByFormat(items: Post[], format: string | null): Post[];
// listHref 시그니처에 format 추가
```

`PostList` 가 `?format=` 을 읽어 거른다. **반드시 클라이언트에서 읽어라** —
서버 컴포넌트에서 `searchParams` 를 읽으면 페이지가 통째로 동적이 되어 정적 생성이 사라진다 (실측된 함정).

### 6) sitemap

`src/app/sitemap.ts` 에 `/topics` 와 6개 `/topics/{axis}` 를 더한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
for(const c of ['.empty','.empty-line','.empty-next']) if(!css.includes(c)) throw new Error(c+' 클래스가 없다');
console.log('빈 상태 클래스 OK');
"
node -e "
const fs=require('fs');
for(const f of ['src/app/(public)/topics/page.tsx','src/app/(public)/topics/[axis]/page.tsx'])
  if(!fs.existsSync(f)) throw new Error(f+' 가 없다');
const p=fs.readFileSync('src/lib/content/posts.ts','utf8');
if(!/getPostsByAxis/.test(p)) throw new Error('getPostsByAxis 가 없다');
const s=fs.readFileSync('src/lib/stats.ts','utf8');
if(!/countByAxis/.test(s)) throw new Error('countByAxis 가 없다');
const g=fs.readFileSync('src/lib/pagination.ts','utf8');
if(!/filterByFormat/.test(g)) throw new Error('filterByFormat 이 없다');
console.log('함수·라우트 파일 OK');
"
node -e "
const fs=require('fs');
const ax=fs.readFileSync('src/app/(public)/topics/[axis]/page.tsx','utf8');
const idx=fs.readFileSync('src/app/(public)/topics/page.tsx','utf8');
if(/KICKER_ACCENT/.test(ax)) throw new Error('축 페이지가 KICKER_ACCENT 를 복제했다 — 축은 무채다');
for(const t of [ax,idx]){
  if(/text-cat-|--cat-|CAT_CLASS|CategoryAccent/.test(t)) throw new Error('축 화면이 카테고리 안료를 참조한다 — 축은 색을 쓰지 않는다');
}
if(!/generateStaticParams/.test(ax)) throw new Error('축 페이지에 generateStaticParams 가 없다');
if(!/showCategory/.test(ax)) throw new Error('축 목록이 갈래 라벨을 안 켰다 — 축은 카테고리를 가로지른다');
console.log('축 화면 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk('src/app/(public)').filter(f=>/page\.tsx$/.test(f))){
  const t=fs.readFileSync(f,'utf8');
  if(/export\s+default\s+async\s+function[\s\S]{0,400}searchParams/.test(t) && !/use client/.test(t))
    throw new Error(f+' 가 서버에서 searchParams 를 읽는다 — 정적 생성이 사라진다');
}
console.log('SSG 보호 OK');
"
node -e "
const routes=Object.keys(JSON.parse(require('fs').readFileSync('.next/prerender-manifest.json','utf8')).routes||{});
if(!routes.includes('/topics')) throw new Error('/topics 가 프리렌더되지 않는다');
const axes=['retrieval','serving','voice','agent','domain','vibe-coding'];
const missing=axes.filter(a=>!routes.includes('/topics/'+a));
if(missing.length) throw new Error('축 페이지 미생성: '+missing.join(', '));
if(routes.length<32) throw new Error('프리렌더 경로가 '+routes.length+'개뿐이다 — 기존 경로가 사라졌을 수 있다');
console.log('정적 생성 OK ('+routes.length+'경로)');
"
node -e "
const fs=require('fs');
const sm=fs.readFileSync('src/app/sitemap.ts','utf8');
if(!/topics/.test(sm)) throw new Error('sitemap 에 /topics 가 없다');
if(!/AXES|axisHref/.test(sm)) throw new Error('sitemap 이 AXES 를 순회하지 않는다 — 축을 손으로 나열하지 마라');
console.log('sitemap OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 공개 페이지가 **정적 생성**을 유지하는가? (`.next/prerender-manifest.json` 으로 센다 — **빌드 로그는 `[+N more paths]` 로 접혀 못 센다**)
   - 축 화면이 안료를 쓰지 않는가? (`docs/UI_GUIDE.md`)
   - 클라이언트 필터가 `useSearchParams()` + `<Suspense>` 를 쓰는가?
   - 글이 0편인 축이 `.empty` 로 그려지는가?
3. `phases/blog-8-six-axes/index.json` 의 step 2 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **새 라우트 경로, `getPostsByAxis`·`countByAxis`·`filterByFormat` 시그니처, `listHref` 의 새 시그니처**를 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **서버 컴포넌트에서 `searchParams` 를 읽지 마라.** 이유: 페이지가 통째로 동적이 되어 SSG 가 사라진다 (실측).
- **축에 색을 주지 마라.** `KICKER_ACCENT` 를 복제하지 마라. 새 이름으로 `text-cat-xxx` 를 쓰지 마라 — Tailwind v4 가 `@theme` 에 없는 클래스를 안 만들어 **조용히 무색**이 된다.
- **`topics` 라는 slug 의 카테고리를 만들지 마라.** 이유: 정적 세그먼트가 동적 `/[category]` 를 가려 그 카테고리가 도달 불가능해진다. step 0 의 `RESERVED_SEGMENTS` 가 이걸 막는다.
- **빈 축을 목록에서 빼지 마라.** 이유: 편수 0 도 정보다 — 무엇을 더 수집해야 하는지 알려 준다.
- **`/topics/[axis]/[slug]` 같은 중첩 라우트를 만들지 마라.** 이유: 글 주소는 `{category}/{slug}` 2단이고, 그 규약이 조회수 `isValidPostId`·발행 경로 정규식 등 6곳에 박혀 있다.
- **헤더·홈·글 상세를 건드리지 마라.** step 3 의 몫이다.
- **`design/` 을 수정하지 마라.**
- 기존 테스트를 깨뜨리지 마라.
