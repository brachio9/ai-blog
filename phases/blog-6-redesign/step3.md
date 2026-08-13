# Step 3: discovery

글 하나를 읽고 나면 갈 곳이 없다. 태그 색인·아카이브·소개를 만들고 헤더·푸터에 길을 낸다.

## 읽어야 할 파일

- `/docs/PRD.md` — 핵심 기능 7·8·9 (태그 색인 / 아카이브 / 소개). 소개 페이지에 담을 내용도 여기 있다
- `/docs/UI_GUIDE.md` — 균일함 회피, 밀집 목록 규격
- `/CLAUDE.md` — CRITICAL: 외부 원문 요약·인용 시 출처 표기 필수 (소개 페이지가 이 원칙을 설명한다)
- `/src/lib/content/posts.ts` — `getAllPosts()` · `getAllTags(): { tag, count }[]` (**재사용**)
- `/src/lib/pagination.ts` — `filterByTag` · `listHref`
- `/src/components/post/PostTable.tsx` — step 2 산출물. 목록은 전부 이걸 쓴다
- `/src/lib/categories.ts` · `/src/lib/site.ts` · `/src/lib/format.ts`
- `/src/components/layout/SiteHeader.tsx` · `SiteFooter.tsx`
- `/src/components/ui/icons.tsx` — step 0 산출물

## 작업

### 1) `src/lib/stats.ts` — 파생 통계

`getAllPosts()` 에서 뽑아내는 순수 함수들. **빌드 타임에만 돌고 네트워크를 타지 않는다.**

```ts
export function countByCategory(): { slug: CategorySlug; count: number }[];
export function postsByMonth(): { ym: string; count: number; posts: Post[] }[]; // 최신순
export function tagIndex(): { tag: string; count: number }[];                   // 빈도 내림차순, 동률은 가나다
```

- `tagIndex()` 는 `getAllTags()` 를 감싸 정렬만 더한다. **태그 집계를 다시 구현하지 마라.**
- `ym` 은 `YYYY-MM` 형식. 시각 계산은 KST 기준이다 (CLAUDE.md CRITICAL).
- 초안 제외 규칙은 `getAllPosts()` 가 이미 처리한다 — 다시 거르지 마라.

### 2) `/tags` — 태그 색인 (`src/app/(public)/tags/page.tsx`)

- 빈도순 태그 목록. 각 태그에 글 수를 함께 보인다 (`muted`, `tabular-nums`).
- 태그를 누르면 그 태그의 글 목록으로 간다. **새 라우트를 만들지 말고** 기존 `?tag=` 규약(`listHref`)을 재사용해 카테고리·검색 페이지로 보내거나, 이 페이지 안에서 선택된 태그의 글을 `PostTable` 로 보여라. 둘 중 하나를 고르고 **일관되게** 하라.
- 태그가 많아질 때를 대비해 빈도 1인 태그는 뒤로 밀되 **감추지는 마라.**
- 태그 크기를 빈도에 따라 키우는 "태그 클라우드" 는 **만들지 마라** — 크기 차이로 정보를 주면 읽기 어렵고 접근성도 나쁘다. 숫자로 보여라.

### 3) `/archive` — 아카이브 (`src/app/(public)/archive/page.tsx`)

- 연·월별로 묶어 발행 이력을 보인다. 월별 글 수를 함께.
- 각 월 아래에 그 달의 글을 `PostTable` 로. 월이 많아지면 최근 것만 펼치고 나머지는 접어도 된다 (`<details>` 로 충분하다 — JS 를 새로 쓰지 마라).
- **이 페이지가 "얼마나 꾸준한 사이트인지" 를 보여주는 자리다.** 총 글 수·기간·카테고리별 분포를 상단에 한 줄로.

### 4) `/about` — 소개 (`src/app/(public)/about/page.tsx`)

PRD 의 요구를 담는다. **가장 문구가 중요한 페이지다** — UI_GUIDE 의 문구 판정 기준을 적용하라.

- 이 사이트가 무엇인지, **왜 「초록」인지**
- **번역이 아니라 요약**이라는 점, 원문 링크를 항상 다는 원칙 (CLAUDE.md CRITICAL 과 같은 내용)
- 어떤 출처를 다루는지 (HuggingFace 블로그, arXiv, 개인 수집)
- 오류·오역 제보 경로 (GitHub Issues 또는 Discussions)
- 일반론을 쓰지 마라. "AI 시대의 인사이트를 전합니다" 류 문장이 하나라도 있으면 실패다.

### 5) 헤더·푸터

- 헤더: 카테고리 3개 + 검색 + 테마. **여기에 태그·아카이브·소개까지 다 넣지 마라** — 헤더가 무거워진다.
- 푸터: 태그 색인·아카이브·소개·RSS 로 가는 길을 낸다. 푸터가 두 번째 내비게이션이 된다.
- 아이콘은 `src/components/ui/icons.tsx` 에서 가져다 쓴다. 새로 그리지 마라.
- 정확한 배치는 재량이되 **헤더와 푸터가 같은 목록의 반복이 되면 안 된다.**

### 6) 세 페이지 모두 정적이어야 한다

`getAllPosts()` 기반이라 빌드 타임에 전부 만들 수 있다. **`searchParams` 를 서버에서 읽지 마라** — 읽는 순간 동적(`ƒ`)이 되고 SSG 가 사라진다. 태그 선택이 URL 에 필요하면 클라이언트 컴포넌트에서 `useSearchParams()` + `<Suspense>` 로 처리한다 (step 2·기존 카테고리 페이지와 같은 방식).

### 7) sitemap · 검색

- `src/app/sitemap.ts` 에 새 페이지 3개를 추가한다.
- 검색 인덱스(`search-index.json`)는 글만 담는다 — 페이지를 넣지 마라.

### 8) 테스트

`src/lib/stats.test.ts`:
- `postsByMonth()` 가 최신 월부터 오는가, 같은 달 글이 한 묶음인가
- `tagIndex()` 가 빈도 내림차순이고 동률에서 안정적인 순서인가
- `countByCategory()` 합계가 `getAllPosts().length` 와 같은가
- 초안이 통계에 섞이지 않는가

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/lib/stats.ts','src/lib/stats.test.ts','src/app/(public)/tags/page.tsx','src/app/(public)/archive/page.tsx','src/app/(public)/about/page.tsx']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
const s=fs.readFileSync('src/lib/stats.ts','utf8');
if(!/getAllTags|getAllPosts/.test(s)) throw new Error('stats.ts 가 기존 로더를 재사용하지 않는다');
for (const p of ['src/app/(public)/tags/page.tsx','src/app/(public)/archive/page.tsx']) {
  if(!/PostTable|stats/.test(fs.readFileSync(p,'utf8'))) throw new Error(p+' 가 공용 목록/통계를 쓰지 않는다');
}
console.log('신설 페이지·통계 OK');
"
node -e "
const fs=require('fs');
const about=fs.readFileSync('src/app/(public)/about/page.tsx','utf8');
for (const k of ['초록','출처']) if(!about.includes(k)) throw new Error('소개 페이지에 '+k+' 설명이 없다');
const footer=fs.readFileSync('src/components/layout/SiteFooter.tsx','utf8');
for (const href of ['/tags','/archive','/about']) if(!footer.includes(href)) throw new Error('푸터에 '+href+' 경로가 없다');
console.log('소개·푸터 경로 OK');
"
node -e "
const fs=require('fs');
const sm=fs.readFileSync('src/app/sitemap.ts','utf8');
for (const p of ['tags','archive','about']) if(!sm.includes(p)) throw new Error('sitemap 에 '+p+' 이 없다');
console.log('sitemap OK');
"
node -e "
const { execSync } = require('child_process');
const out = execSync('npx next build', { encoding: 'utf8' });
for (const r of ['/tags','/archive','/about']) {
  if(!out.includes(r)) throw new Error('라우트 표에 '+r+' 이 없다');
}
const dyn=(out.match(/^ƒ \//gm)||[]);
const allowed=dyn.filter(d=>!/\/(api|admin)/.test(d));
if(allowed.length) throw new Error('공개 페이지가 동적이 됐다: '+allowed.join(', ')+' — searchParams 를 서버에서 읽었을 가능성');
console.log('신설 페이지 정적 생성 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 **클릭 경로를 완주한다**: 홈 → 글 상세 → 푸터의 태그 색인 → 태그 하나 선택 → 글 목록 → 아카이브 → 소개. 어디서도 막다른 길이 없어야 한다.
3. 소개 페이지 문구를 **소리 내어 읽어 보라.** 다른 AI 블로그에 붙여도 말이 되는 문장이 있으면 다시 써라.
4. 375px 에서 세 페이지 모두 가로 스크롤이 없는가.
5. 라이트/다크 양쪽에서 읽히는가.
6. 아키텍처 체크리스트:
   - 신설 페이지가 전부 정적(`○`/`●`) 인가?
   - `getAllTags()` 를 재사용했는가, 태그 집계를 다시 만들지 않았는가?
   - 헤더가 무거워지지 않았는가?
7. `phases/blog-6-redesign/index.json` 의 step 3 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`stats.ts` 함수 시그니처, 신설 라우트 3개, 태그 선택 URL 규약, 헤더/푸터 구성**을 한 줄로 기록.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **태그 클라우드(빈도로 글자 크기 조절)를 만들지 마라.** 읽기 어렵고 접근성이 나쁘다.
- **서버 컴포넌트에서 `searchParams` 를 읽지 마라.**
- **태그 집계·글 로딩을 다시 구현하지 마라.** `getAllTags()` · `getAllPosts()` 를 쓴다.
- **소개 페이지에 일반론을 쓰지 마라.**
- **조회수를 쓰지 마라.** step 4 의 범위다.
- **`content/` 의 글을 수정하지 마라.**
- **`src/lib/mdx.ts` · `src/components/mdx/` 를 수정하지 마라** (ADR-003).
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-6-redesign/index.json` 의 step 3 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
