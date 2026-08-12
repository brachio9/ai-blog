# Step 3: search-and-feeds

검색·RSS·sitemap·OG 이미지를 붙여 사이트를 공개 가능한 상태로 만든다. 전부 DB 없이 빌드 타임에 처리한다.

## 읽어야 할 파일

- `/docs/ADR.md` — **ADR-007 (검색은 DB 없이 클라이언트에서)**
- `/CLAUDE.md` — 환경변수 이름 표 (`NEXT_PUBLIC_SITE_URL`)
- `/src/lib/content/posts.ts` — `getAllPosts()` · `getAllTags()`
- `/src/lib/categories.ts` · `/src/lib/format.ts`
- `/src/components/post/PostList.tsx` · `TagFilter.tsx` — step 1 산출물. 검색 결과 목록에 **재사용하라.**
- `/src/components/layout/SiteFooter.tsx` — 이미 `/rss.xml` 링크가 걸려 있다. 이 step 이 그 대상을 만든다.

## 배경 (실제로 확인한 사실 — 다시 조사하지 마라)

- **`next/og` 의 `ImageResponse` 는 한글을 정상 렌더링한다.** 실제로 1200×630 이미지에 한글 제목을 넣어 확인했다. **한글 폰트를 따로 내려받아 주입하지 마라** — 불필요한 복잡도이고 빌드가 느려진다.
- 클라이언트에서 `useSearchParams()` 를 쓰고 `<Suspense>` 로 감싸면 페이지가 정적 생성(SSG)으로 유지된다. 서버 컴포넌트에서 `searchParams` 를 읽으면 페이지가 통째로 동적이 된다 (step 1 에서 실측함).
- Route Handler 를 정적으로 만들려면 `export const dynamic = "force-static"` 을 선언한다.

## 작업

### 1) 사이트 URL 상수 — `src/lib/site.ts`

```ts
/** 절대 URL 이 필요한 곳(RSS·sitemap·OG)에서 쓴다. 배포 시 NEXT_PUBLIC_SITE_URL 로 덮어쓴다. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const SITE_NAME = "AI 동향 블로그";
export const SITE_DESCRIPTION = "...";
```

**환경변수가 없어도 빌드가 실패하면 안 된다.** 실제 도메인은 `blog-4-deploy` 에서 설정한다. 이름은 `CLAUDE.md` 의 환경변수 표를 그대로 따르라.

### 2) 피드·인덱스 생성 순수 함수 — `src/lib/feed.ts`

라우트에서 로직을 떼어내 테스트 가능하게 만든다.

```ts
export interface SearchDoc {
  id: string;          // `${category}/${slug}`
  title: string;
  summary: string;
  category: CategorySlug;
  slug: string;
  tags: string[];
  publishedAt: string;
}

export function buildSearchIndex(posts: Post[]): SearchDoc[];
export function buildRssXml(posts: Post[], siteUrl: string): string;
```

RSS 요구 사항:
- RSS 2.0. `<title>` · `<link>` · `<description>` · `<language>ko</language>` · `<lastBuildDate>`
- 각 항목에 `<guid isPermaLink="true">` 로 글 절대 URL, `<pubDate>` 는 RFC 822
- **제목·요약에 XML 특수문자(`&`, `<`, `>`)가 들어가면 이스케이프하라.** 안 하면 피드가 깨진다.
- 본문 전문을 넣지 마라. `summary` 까지만.

검색 인덱스 요구 사항:
- **본문(`Post.body`)을 넣지 마라.** 제목·요약·태그까지만. 이유: 인덱스 크기가 커지면 초기 로딩이 느려진다 (ADR-007 의 트레이드오프).

### 3) 정적 라우트

| 경로 | 파일 | 비고 |
|---|---|---|
| `/rss.xml` | `src/app/rss.xml/route.ts` (Route Handler 는 레이아웃을 쓰지 않으므로 `(public)` 밖에 둔다) | `dynamic = "force-static"`, `Content-Type: application/xml` |
| `/search-index.json` | `src/app/search-index.json/route.ts` | `dynamic = "force-static"` |
| `/sitemap.xml` | `src/app/sitemap.ts` | Next 내장 `MetadataRoute.Sitemap` 규약을 쓴다 |
| `/robots.txt` | `src/app/robots.ts` | Next 내장 `MetadataRoute.Robots`. sitemap 위치를 가리킨다 |

sitemap 에는 홈 · 카테고리 3개 · 모든 글 · `/search` 를 넣는다. **초안은 제외**된다 (`getAllPosts()` 가 이미 걸러준다).

### 4) 검색 페이지 — `src/app/(public)/search/page.tsx`

- 서버 컴포넌트는 `searchParams` 를 읽지 않는다. `<Suspense>` 안에 클라이언트 검색 컴포넌트를 둔다.
- `src/components/search/SearchClient.tsx` (`"use client"`):
  - `useSearchParams()` 로 `?q=` 를 읽는다 (URL 공유 가능해야 한다).
  - `/search-index.json` 을 fetch 해 `minisearch` 로 검색한다 (`npm install minisearch`).
  - 인덱스는 **한 번만** 받아 재사용한다. 입력할 때마다 다시 받지 마라.
  - 한글 검색이 되어야 한다. minisearch 기본 토크나이저는 공백 기준이라 한글 부분 일치가 약하다 — `prefix: true` 와 적절한 `tokenize`/`processTerm` 설정으로 **"벤치마"로 "벤치마크"가 잡히게** 하라.
  - 입력 디바운스(150~300ms).
  - 결과는 step 1 의 `PostList` 를 재사용해 보여준다. 새 목록 UI 를 만들지 마라.
  - 검색어가 없으면 전체 태그 목록(`TagFilter`)이나 안내를 보여준다.
  - 결과가 없으면 "검색 결과 없음"을 명확히 보여준다.
- 헤더에 검색 진입점을 추가한다. `SiteHeader` 를 최소한으로만 수정하라 (blog-0 의 활성 표시 동작을 깨뜨리지 마라).

### 5) OG 이미지

- `src/app/opengraph-image.tsx` — 사이트 기본 OG (루트에 두면 하위 전체에 상속된다)
- `src/app/(public)/[category]/[slug]/opengraph-image.tsx` — 글별 OG. 제목 + 카테고리 이름 + 사이트 이름. **글 상세 페이지와 같은 디렉토리**에 두어야 그 라우트에 적용된다.
- `UI_GUIDE.md` 의 색 토큰 값을 쓰되, **OG 이미지에는 CSS 변수가 없으므로 hex 를 직접 적는다.** 이건 예외로 허용한다 (`ImageResponse` 는 별도 렌더러라 앱 CSS 가 없다).
- 긴 제목이 넘치지 않게 줄 수를 제한하라.
- **한글 폰트를 따로 주입하지 마라** (위 "배경" 참고).

### 6) 테스트 — `src/lib/feed.test.ts`

- `buildRssXml` 이 유효한 XML 을 만드는지, `&`·`<` 가 포함된 제목이 이스케이프되는지
- 항목 수가 초안을 제외한 글 수와 맞는지
- `buildSearchIndex` 에 본문이 들어가지 않는지 (`body` 키 부재)
- 절대 URL 이 `siteUrl` 기준으로 만들어지는지

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/lib/site.ts','src/lib/feed.ts','src/lib/feed.test.ts','src/app/rss.xml/route.ts','src/app/search-index.json/route.ts','src/app/sitemap.ts','src/app/robots.ts','src/app/(public)/search/page.tsx','src/components/search/SearchClient.tsx']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
const sp=fs.readFileSync('src/app/(public)/search/page.tsx','utf8');
if(/await\s+(props\.)?searchParams/.test(sp)) throw new Error('검색 서버 페이지에서 searchParams 를 읽었다 — 정적 생성이 사라진다');
if(!/Suspense/.test(sp)) throw new Error('Suspense 로 감싸지 않았다');
const sc=fs.readFileSync('src/components/search/SearchClient.tsx','utf8');
if(!/useSearchParams/.test(sc)) throw new Error('검색어를 URL 에서 읽지 않는다 — 공유 불가');
if(!/PostList/.test(sc)) throw new Error('step 1 의 PostList 를 재사용하지 않는다');
for (const f of ['src/app/rss.xml/route.ts','src/app/search-index.json/route.ts']) {
  if(!/force-static/.test(fs.readFileSync(f,'utf8'))) throw new Error('force-static 선언 없음: '+f);
}
console.log('라우트·검색 규약 OK');
"
node -e "
// 피드 순수 함수를 직접 검증 (라우트를 띄우지 않고)
const fs=require('fs');
const feed=fs.readFileSync('src/lib/feed.ts','utf8');
if(/post\.body|\.body\b/.test(feed.replace(/\/\/.*|\/\*[\s\S]*?\*\//g,''))) throw new Error('검색 인덱스/RSS 에 본문을 넣었을 가능성 — ADR-007 트레이드오프 위반');
if(!/&amp;|escape|replace\(/.test(feed)) throw new Error('XML 이스케이프 처리가 보이지 않는다');
console.log('feed.ts 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const out=walk('.next/server/app').map(f=>f.replace(/\\\\/g,'/'));
for (const r of ['rss.xml','search-index.json','sitemap','robots']) {
  if(!out.some(f=>f.includes(r))) throw new Error('빌드 산출물에 없음: '+r);
}
if(!out.some(f=>/opengraph-image/.test(f))) throw new Error('OG 이미지 라우트가 생성되지 않았다');
console.log('정적 라우트 생성 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run build` Route 표에서 `/search` 가 `○`(Static) 인지 확인한다. `ƒ` 면 서버에서 `searchParams` 를 읽은 것이다.
3. `npm run start` 후 브라우저·curl 로 확인한다:
   - `curl localhost:3000/rss.xml` 이 유효한 XML 인가? 초안이 안 들어갔는가?
   - `curl localhost:3000/sitemap.xml` · `/robots.txt` 가 나오는가?
   - `/search` 에서 **"벤치마"를 치면 "벤치마크" 글이 잡히는가?** (한글 부분 일치)
   - 검색어를 넣은 URL(`/search?q=추론`)을 새로 열었을 때 결과가 그대로 나오는가?
   - 푸터의 RSS 링크가 404 가 아닌가?
   - **글 상세의 OG 이미지를 직접 열어(`/{category}/{slug}/opengraph-image`) 한글 제목이 네모가 아닌 글자로 보이는가?**
   - 375px 에서 검색 화면이 깨지지 않는가?
4. 아키텍처 체크리스트:
   - ADR-007 — 검색에 DB·서버를 쓰지 않았는가? 인덱스에 본문이 없는가?
   - `PostList` · `TagFilter` · `format.ts` 를 재사용했는가?
   - 환경변수 이름이 `CLAUDE.md` 표와 일치하는가?
5. `phases/blog-2-public-site/index.json` 의 step 3 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **추가된 라우트 목록, `feed.ts` 함수 시그니처, `SITE_URL` 규약, 검색 인덱스 필드**를 한 줄로 기록
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`NEXT_PUBLIC_SITE_URL` 이 없다고 빌드를 실패시키지 마라.** 이유: 실제 도메인은 `blog-4-deploy` 에서 정한다. 기본값을 두어라.
- **OG 이미지에 한글 폰트를 내려받아 주입하지 마라.** 이유: `next/og` 가 한글을 이미 정상 렌더링한다 (실측 확인). 불필요한 복잡도와 빌드 지연만 생긴다.
- **검색 인덱스나 RSS 에 본문 전문을 넣지 마라.** 이유: ADR-007 의 트레이드오프 — 인덱스가 커지면 초기 로딩이 무너진다.
- **검색을 서버 라우트나 DB 로 구현하지 마라.** 이유: ADR-007.
- **서버 컴포넌트에서 `searchParams` 를 읽지 마라.** 이유: 정적 생성이 사라진다.
- **새 글 목록 UI 를 만들지 마라.** step 1 의 `PostList` 를 재사용하라.
- **댓글·조회수를 만들지 마라.** 이유: 이번 phase 범위 밖이다.
- **`SiteHeader` 를 크게 뜯어고치지 마라.** 검색 진입점 추가 정도로 최소화하고, blog-0 의 카테고리 활성 표시 동작을 깨뜨리지 마라.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-2-public-site/index.json` 의 step 3 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
