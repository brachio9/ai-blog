# Step 1: category-pages

카테고리별 글 목록 페이지를 만든다 — `/{category}`. 태그 필터와 페이지네이션을 붙이되 **페이지는 정적 생성을 유지한다.**

## 읽어야 할 파일

- `/docs/PRD.md` — 카테고리 3종과 각 `description`
- `/docs/UI_GUIDE.md` — 레이아웃·컴포넌트 규격
- `/src/lib/content/posts.ts` — `getPostsByCategory(slug)` · `getAllTags()`
- `/src/lib/categories.ts` — `CATEGORIES` · `getCategory(slug)` · `categoryHref(category)`
- `/src/components/post/PostCard.tsx` — step 0 산출물. **재사용하라. 새 카드를 만들지 마라.**
- `/src/lib/format.ts` — step 0 의 날짜 포맷. 재사용하라.
- `/src/components/layout/Container.tsx`

## 배경 (실제로 빌드해 확인한 사실 — 다시 조사하지 마라)

**1. Next.js 16 동적 라우트 규약**

- `params` 는 **Promise** 다. 반드시 `await` 한다.
- 타입은 전역 `PageProps<'/[category]'>` 를 쓴다. 직접 props 인터페이스를 정의하지 마라.

```tsx
export default async function Page(props: PageProps<'/[category]'>) {
  const { category } = await props.params;
}
```

- 정적 생성을 위해 `generateStaticParams()` 를 제공한다.

**2. ⚠ 서버에서 `searchParams` 를 읽으면 페이지가 통째로 동적이 된다**

실측했다. 서버 컴포넌트에서 `await props.searchParams` 를 하면 `generateStaticParams` 가 있어도 빌드 결과가 `ƒ /[cat]` (Dynamic, server-rendered on demand) 이 되고 **정적 HTML 이 하나도 생성되지 않는다.**

반면 **클라이언트 컴포넌트에서 `useSearchParams()` 로 읽고 `<Suspense>` 로 감싸면** 결과가 `● /aa` `● /bb` (SSG, prerendered as static HTML) 로 유지된다. 이것도 실측으로 확인했다.

**따라서 이 step 의 필수 구조는 다음과 같다:**

```tsx
// 서버 컴포넌트 — props.searchParams 를 절대 읽지 않는다
export default async function Page(props: PageProps<'/[category]'>) {
  const { category } = await props.params;
  const posts = getPostsByCategory(category);       // 전체를 넘긴다
  return (
    <Suspense fallback={null}>
      <CategoryPostList posts={...} basePath={...} tags={...} />
    </Suspense>
  );
}
```

필터·페이지네이션은 클라이언트가 처리한다. 이유: URL 공유 가능성(`?tag=추론&page=2`)과 정적 생성을 동시에 얻기 위해서다. 무료 정적 호스팅이 목표이므로 카테고리 페이지가 서버 렌더가 되면 안 된다.

**3. `/[category]` 는 최상위 동적 세그먼트라 알 수 없는 경로를 전부 삼킨다.** `getCategory(slug)` 로 검증해 없으면 `notFound()` 를 호출하라. `/아무거나` 가 빈 목록으로 200 을 반환하면 안 된다.

## 작업

### 1) 카테고리 페이지 — `src/app/(public)/[category]/page.tsx` (서버 컴포넌트)

- `generateStaticParams()` 로 `CATEGORIES` 의 slug 3개를 정적 생성.
- `generateMetadata()` 로 카테고리 이름·설명을 `title`/`description` 에 넣는다. 루트 레이아웃의 `title.template` 이 `%s | AI 동향 블로그` 를 붙여준다.
- 알 수 없는 카테고리는 `notFound()`.
- 상단에 카테고리 이름 + `description`.
- **`props.searchParams` 를 읽지 마라.** 글 목록 전체를 클라이언트 컴포넌트에 넘긴다.
- 클라이언트에 넘길 때는 **본문(`Post.body`)을 빼고** 카드에 필요한 필드만 추려 넘겨라. 이유: 본문까지 직렬화하면 HTML 이 불필요하게 커진다.

### 2) 목록 클라이언트 컴포넌트 — `src/components/post/PostList.tsx`

```tsx
"use client";

export interface PostListItem {
  slug: string;
  category: CategorySlug;
  title: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  readingMinutes: number;
  cover?: string;
}

export interface PostListProps {
  items: PostListItem[];
  /** 태그 링크의 기준 경로 (예: "/papers"). 검색 페이지도 재사용한다. */
  basePath: string;
  showCategory?: boolean;
}
```

- `useSearchParams()` 로 `tag` · `page` 를 읽는다.
- 한 페이지 **10건**.
- 태그는 **넘겨받은 items 에서 직접 집계**한다. `getAllTags()` 는 전체 태그라 그 카테고리에 없는 태그까지 나온다.
- 태그 값은 URL 인코딩된 한글이다. `useSearchParams().get()` 은 자동 디코딩하지만, 링크를 만들 때는 `URLSearchParams` 로 인코딩하라.
- 페이지 수가 1이면 페이지네이션 UI 를 숨긴다.
- **범위를 벗어난 `page`(0·음수·초과·숫자 아님)는 조용히 1페이지로 되돌리지 말고** "해당 페이지에 글이 없습니다" + 1페이지로 가는 링크를 보여준다. 이유: 잘못된 URL 을 조용히 삼키면 사용자가 링크가 깨진 걸 모른다.
- 필터·페이지 이동은 `next/link` 로 URL 을 바꾼다 (뒤로가기가 동작해야 한다).
- 이전/다음 링크와 현재 위치 표시, `aria-current="page"`.
- 카드는 step 0 의 `PostCard` 를 쓴다.

### 3) 태그 필터 컴포넌트 — `src/components/post/TagFilter.tsx`

```tsx
export interface TagFilterProps {
  tags: { tag: string; count: number }[];
  activeTag?: string;
  basePath: string;
}
```

선택된 태그를 시각적으로 표시하고 해제 수단을 둔다. step 3 의 검색 페이지가 재사용한다.

### 4) 필터·페이지네이션 순수 함수 — `src/lib/pagination.ts`

로직을 UI 에서 떼어내 테스트 가능하게 만든다.

```ts
export const PAGE_SIZE = 10;
export function filterByTag<T extends { tags: string[] }>(items: T[], tag?: string): T[];
export function paginate<T>(items: T[], page: number): { items: T[]; totalPages: number; isOutOfRange: boolean };
export function collectTags(items: { tags: string[] }[]): { tag: string; count: number }[];
```

### 5) 헤더 활성 표시 확인

`SiteHeader` 는 이미 현재 경로의 카테고리를 활성 표시한다 (blog-0 산출물). `/{category}` 와 `/{category}/{slug}` 양쪽에서 유지되는지 확인만 하고 **동작하면 건드리지 마라.**

### 6) 테스트 — `src/lib/pagination.test.ts`

- 10건 단위 분할, 마지막 페이지 잔여 처리
- 범위 밖 페이지에서 `isOutOfRange: true`
- 빈 목록에서 `totalPages` 가 1 이상인지 (0 으로 나누지 않는지)
- `filterByTag` 가 태그 포함 조건으로 동작하는지, `undefined` 면 전체를 주는지
- `collectTags` 가 개수를 맞게 세고 정렬하는지

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const p=fs.readFileSync('src/app/(public)/[category]/page.tsx','utf8');
if(!/generateStaticParams/.test(p)) throw new Error('generateStaticParams 없음');
if(!/notFound\(/.test(p)) throw new Error('notFound 처리 없음 — 알 수 없는 카테고리가 200 을 반환한다');
if(!/await\s+(props\.)?params|await\s+params/.test(p)) throw new Error('params 를 await 하지 않는다');
if(/searchParams/.test(p)) throw new Error('치명적: 서버 페이지에서 searchParams 를 읽었다 — 페이지가 통째로 동적이 되어 정적 생성이 사라진다');
if(!/Suspense/.test(p)) throw new Error('Suspense 로 감싸지 않았다 — useSearchParams 사용 시 정적 생성이 실패한다');
console.log('카테고리 페이지 규약 OK');
"
node -e "
const fs=require('fs');
const l=fs.readFileSync('src/components/post/PostList.tsx','utf8');
if(!/^\"use client\"|^'use client'/m.test(l)) throw new Error('PostList 가 클라이언트 컴포넌트가 아니다');
if(!/useSearchParams/.test(l)) throw new Error('useSearchParams 를 쓰지 않는다');
if(!/PostCard/.test(l)) throw new Error('step 0 의 PostCard 를 재사용하지 않는다');
console.log('PostList 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const out=walk('.next/server/app').filter(f=>f.endsWith('.html'));
for (const c of ['hf-blog','papers','notes']) {
  if(!out.some(f=>f.endsWith('/'+c+'.html')||f.includes('/'+c+'/index.html'))) {
    throw new Error('정적 HTML 이 생성되지 않았다: /'+c+' — 서버에서 searchParams 를 읽었을 가능성이 높다');
  }
}
console.log('카테고리 3개 정적 생성(SSG) OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. **`npm run build` 출력의 Route 표를 직접 확인하라.** `/[category]` 아래 `● /hf-blog` `● /papers` `● /notes` 로 나와야 한다. `ƒ` (Dynamic) 이면 서버에서 `searchParams` 를 읽은 것이다.
3. `npm run dev` 후 브라우저로 확인한다:
   - `/papers` · `/hf-blog` · `/notes` 가 각각 뜨는가?
   - **`/없는카테고리` 가 404 인가?**
   - 태그를 누르면 필터되고 URL 이 바뀌는가? 한글 태그가 깨지지 않는가? 뒤로가기가 동작하는가?
   - `?page=999` 에서 안내 문구가 나오는가?
   - 375px 폭에서 목록·태그가 깨지지 않는가?
4. 아키텍처 체크리스트:
   - `PostCard` · `format.ts` 를 재사용했는가?
   - 카테고리 slug 하드코딩 없음?
   - UI_GUIDE 안티패턴 없음?
5. `phases/blog-2-public-site/index.json` 의 step 1 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`PostListItem`/`PostListProps` 시그니처, `pagination.ts` 함수 목록, 쿼리 파라미터 규약(`tag`·`page`), 정적 생성 유지 방식**을 한 줄로 기록
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **서버 컴포넌트에서 `searchParams` 를 읽지 마라.** 이유: 실측으로 확인했다 — 페이지가 `ƒ` (Dynamic) 이 되어 정적 HTML 이 하나도 생성되지 않는다. 무료 정적 호스팅 목표에 어긋난다.
- **`useSearchParams()` 를 쓰는 컴포넌트를 `<Suspense>` 없이 두지 마라.** 이유: 정적 생성이 실패한다.
- **`params` 를 await 하지 않고 쓰지 마라.** 이유: Next 16 에서 Promise 다.
- **`PageProps` 대신 직접 props 인터페이스를 정의하지 마라.**
- **알 수 없는 카테고리에 빈 목록을 반환하지 마라.** 반드시 `notFound()`.
- **새 글 카드를 만들지 마라.** step 0 의 `PostCard` 재사용.
- **클라이언트에 `Post.body`(본문 MDX)를 넘기지 마라.** 이유: HTML 이 불필요하게 커진다.
- **글 상세 페이지를 만들지 마라.** 이유: step 2 의 범위다.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-2-public-site/index.json` 의 step 1 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
