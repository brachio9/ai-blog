# Step 2: post-page

글 상세 페이지를 만든다 — `/{category}/{slug}`. 목차·출처 표기·이전/다음 글까지.

## 읽어야 할 파일

- `/CLAUDE.md` — **CRITICAL: 외부 원문을 요약·인용하면 `source.url` 표기가 필수다.** 이 step 이 그 규칙을 화면으로 구현하는 곳이다.
- `/docs/UI_GUIDE.md` — 타이포그래피(본문 세리프·단폭 68ch)·컴포넌트 규격
- `/src/lib/content/posts.ts` — `getPost(category, slug)` · `getPostsByCategory(slug)` · `getAllPosts()`
- `/src/types/content.ts` — `Post` · `PostFrontmatter` · `PostSource` · `PaperMeta`
- `/src/lib/mdx.ts` — `renderMdx(source, options?)`. **본문 컴파일은 이것만 쓴다** (ADR-003).
- `/src/components/mdx/index.ts` — `MdxBody` 래퍼와 `MDX_COMPONENTS`
- `/src/lib/format.ts` — step 0 의 날짜 포맷
- `/src/components/post/PostCard.tsx` — step 0 산출물

## 배경 (확인된 사실 — 다시 조사하지 마라)

- Next 16 에서 `params` 는 **Promise** 다. 타입은 전역 `PageProps<'/[category]/[slug]'>` 를 쓴다.
- `renderMdx(post.body)` 가 React 엘리먼트를 준다. `MdxBody` 로 감싸면 UI_GUIDE 의 본문 타이포그래피가 적용된다.
- **`rehype-slug` 가 제목에 id 를 붙인다.** 목차 앵커가 이 id 와 정확히 일치해야 한다. `rehype-slug` 는 내부적으로 `github-slugger` 를 쓰므로, 목차를 만들 때도 **같은 `github-slugger` 패키지로 slug 를 생성해야** 링크가 맞는다. 직접 정규식으로 slug 를 만들면 한글·특수문자에서 어긋난다.

## 작업

### 1) 글 상세 페이지 — `src/app/(public)/[category]/[slug]/page.tsx`

- `generateStaticParams()` 로 **모든 글**의 `{category, slug}` 조합을 정적 생성한다. `getAllPosts()` 를 쓴다.
- `generateMetadata()` 로 `title` · `description`(= `summary`) · `openGraph` · `alternates.canonical` 을 채운다.
- 없는 글은 `notFound()`.
- `props.searchParams` 를 읽지 마라 (step 1 과 같은 이유 — 정적 생성이 사라진다).

**화면 구성:**
- 카테고리 배지(목록으로 가는 링크) · 제목 · 요약 · 발행일 · 읽기 시간 · 태그
- 본문: `MdxBody` 안에 `renderMdx(post.body)`
- 하단: 이전/다음 글 (같은 카테고리 내, `publishedAt` 기준)

### 2) 출처 표기 — `src/components/post/SourceNote.tsx`

**CLAUDE.md CRITICAL 규칙의 구현체다.** `frontmatter.source` 가 있으면 본문 **위쪽에** 눈에 띄게 보여준다.

- 원문 제목 + 링크(`source.url`, 새 탭 + `rel="noopener noreferrer"`)
- 저자(`source.author`)와 라이선스(`source.license`)가 있으면 함께 표기
- 이 글이 원문의 **요약·정리**임을 명시하는 문구를 넣는다. 원문 번역 전재로 오해되면 안 된다.
- `papers` 카테고리는 `frontmatter.paper` 의 `arxivId` 와 `authors` 도 함께 표기하고, arXiv 링크(`https://arxiv.org/abs/{arxivId}`)를 건다.

### 3) 목차 — `src/components/post/TableOfContents.tsx`

- **`github-slugger` 를 설치해 `rehype-slug` 와 동일한 방식으로 id 를 만든다.** (`npm install github-slugger`)
- MDX 원문에서 `##`·`###` 제목을 추출한다. 단, **코드블록 안의 `#` 주석을 제목으로 오인하면 안 된다.** 펜스(```) 구간을 건너뛰어라. 샘플 글의 bash 코드블록에 `# 설치 —` 같은 주석이 실제로 있다.
- 제목이 2개 미만이면 목차를 렌더하지 않는다.
- 스크롤에 따라 현재 위치를 표시한다 (`IntersectionObserver`, `"use client"`).
- 데스크톱에서는 본문 옆(sticky), 모바일에서는 본문 위 접이식으로 둔다. 본문 단폭(68ch)을 침범하지 마라.
- 목차 추출 로직은 **순수 함수로 분리**해 테스트하라: `src/lib/toc.ts` 의 `extractHeadings(mdx: string): { id: string; text: string; depth: 2 | 3 }[]`

### 4) 이전/다음 글 — `src/components/post/PostNav.tsx`

같은 카테고리 안에서 `publishedAt` 기준 앞뒤 글. 없으면 그 자리를 비운다 (빈 링크를 만들지 마라).

### 5) 테스트

- `src/lib/toc.test.ts` — **코드블록 안의 `#` 을 제목으로 잡지 않는지**, `##`·`###` 깊이 구분, 한글 제목의 id 가 `github-slugger` 결과와 일치하는지, 중복 제목에 번호가 붙는지
- `src/components/post/SourceNote.test.tsx` — `source` 가 있을 때 링크가 나오고, 없으면 아무것도 렌더하지 않는지

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const p=fs.readFileSync('src/app/(public)/[category]/[slug]/page.tsx','utf8');
if(!/generateStaticParams/.test(p)) throw new Error('generateStaticParams 없음');
if(!/generateMetadata/.test(p)) throw new Error('generateMetadata 없음');
if(!/notFound\(/.test(p)) throw new Error('notFound 처리 없음');
if(!/await\s+(props\.)?params|await\s+params/.test(p)) throw new Error('params 를 await 하지 않는다');
if(/searchParams/.test(p)) throw new Error('서버 페이지에서 searchParams 를 읽었다 — 정적 생성이 사라진다');
if(!/renderMdx/.test(p)) throw new Error('renderMdx 를 쓰지 않는다 (ADR-003)');
console.log('글 상세 페이지 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk('.next/server/app').filter(f=>f.endsWith('.html'));
// 초안 1건 제외한 8건이 정적 생성되어야 한다
const postPages=html.filter(f=>/(hf-blog|papers|notes)\//.test(f));
if(postPages.length < 8) throw new Error('글 상세 정적 생성 부족: '+postPages.length+'건 (기대 8건 이상)');
const joined=postPages.map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/arxiv\.org\/abs\//.test(joined)) throw new Error('papers 글에 arXiv 링크가 없다');
console.log('글 상세 정적 생성 '+postPages.length+'건 · arXiv 링크 OK');
"
node -e "
// CLAUDE.md CRITICAL: source 가 있는 글은 화면에 출처 URL 이 나와야 한다
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk('.next/server/app').filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(f,'utf8')).join('');
const urls=[];
for (const c of ['hf-blog','papers']) for (const f of fs.readdirSync('content/'+c)) {
  const m=fs.readFileSync('content/'+c+'/'+f,'utf8').match(/^\s+url:\s*[\"']?(https?:[^\s\"']+)/m);
  if(m) urls.push(m[1]);
}
if(!urls.length) throw new Error('샘플 글에서 source.url 을 찾지 못했다');
const missing=urls.filter(u=>!html.includes(u));
if(missing.length) throw new Error('출처 URL 이 화면에 표기되지 않았다 (CLAUDE.md CRITICAL): '+missing.slice(0,3).join(', '));
console.log('출처 표기 '+urls.length+'건 전부 확인 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run build` Route 표에서 글 상세가 `●` (SSG) 인지 확인한다.
3. `npm run dev` 후 브라우저로 확인한다:
   - 홈·카테고리에서 카드를 눌러 글 상세로 들어가는가?
   - **목차 링크를 누르면 해당 제목으로 정확히 이동하는가?** (한글 제목에서 어긋나면 slugger 불일치다)
   - **코드블록 안의 `#` 주석이 목차에 섞여 들어가지 않았는가?**
   - 출처가 눈에 띄게 표기되는가? 링크가 새 탭으로 열리는가?
   - 수식·차트·다이어그램·표가 blog-1 때처럼 잘 보이는가? (본문 파이프라인 회귀 확인)
   - 이전/다음 글이 맞게 연결되는가? 첫 글/마지막 글에서 빈 링크가 없는가?
   - 375px 에서 목차가 본문을 밀어내지 않는가?
   - 라이트/다크 양쪽에서 읽히는가?
4. 아키텍처 체크리스트:
   - ADR-003 — 본문 컴파일에 `renderMdx` 만 썼는가?
   - CLAUDE.md CRITICAL — 출처 표기가 모든 해당 글에 나오는가?
   - `MdxBody` 를 재사용했는가? 본문 타이포그래피를 다시 정의하지 않았는가?
5. `phases/blog-2-public-site/index.json` 의 step 2 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **라우트 경로, `extractHeadings` 시그니처, `SourceNote`/`PostNav` 경로**를 한 줄로 기록
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **목차 slug 를 직접 정규식으로 만들지 마라.** 반드시 `github-slugger` 를 써라. 이유: `rehype-slug` 가 붙인 id 와 어긋나면 목차 링크가 전부 죽는다. 한글 제목에서 특히 잘 어긋난다.
- **코드블록 안의 `#` 을 제목으로 추출하지 마라.** 이유: 샘플 글의 bash 코드블록에 `# 설치 —` 같은 주석이 실제로 있다.
- **`renderMdx` 외의 방법으로 MDX 를 컴파일하지 마라.** 이유: ADR-003.
- **서버 페이지에서 `searchParams` 를 읽지 마라.** 이유: 정적 생성이 사라진다.
- **본문 타이포그래피를 새로 정의하지 마라.** `MdxBody` 를 쓴다.
- **댓글·조회수를 만들지 마라.** 이유: 이번 phase 범위 밖이다. 자리만 비워두고 아무것도 넣지 마라.
- **검색·RSS·OG 이미지를 만들지 마라.** 이유: step 3 의 범위다.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-2-public-site/index.json` 의 step 2 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
