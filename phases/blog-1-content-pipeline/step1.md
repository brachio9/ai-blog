# Step 1: mdx-renderer

MDX 를 실제 화면으로 바꾸는 파이프라인과 기본 본문 컴포넌트(표·이미지·코드·인용·제목)를 만든다. 수식·다이어그램은 step 2, 차트는 step 3 소관이다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — **"본문 요소 (핵심 요구사항)" 표가 이 step 의 명세다.** 표·이미지·코드블록·콜아웃 규격.
- `/docs/ADR.md` — ADR-003 (MDX 컴파일 경로 단일화)
- `/docs/ARCHITECTURE.md` — `src/components/mdx/` 계약
- `/CLAUDE.md` — MDX 진입점은 `src/lib/mdx.ts` 하나
- `/src/lib/content/posts.ts` · `/src/types/content.ts` — step 0 산출물. `Post.body` 가 여기서 컴파일할 MDX 문자열이다.
- `/src/app/globals.css` — 사용할 토큰. 여기 있는 것만 쓴다.

## 배경 (실제로 빌드해 확인한 사실 — 다시 조사하지 마라)

Next 16 + React 19 에서 아래 조합이 정상 동작함을 확인했다:

- `next-mdx-remote@6` 의 `next-mdx-remote/rsc` 에서 `MDXRemote` 를 가져와 **Server Component 에서 await 없이** 사용 → 정적 프리렌더까지 성공
- `remark-gfm` 이 표를 만들고 정렬 지정(`|---:|`)도 `text-align:right` 로 반영됨
- `components` prop 으로 넘긴 커스텀 컴포넌트가 MDX 스코프에 주입됨
- `rehype-slug` 가 `<h2 id="...">` 를 부여함

**코드 하이라이팅 함정:** `rehype-pretty-code` 에 테마를 하나만 주면 `<span style="color:#xxx">` 로 색이 **인라인으로 박혀 다크모드에서 바꿀 수 없다.** 반드시 이중 테마로 설정하라:

```ts
[rehypePrettyCode, { theme: { light: "github-light", dark: "github-dark" }, defaultLang: "plaintext" }]
```

이렇게 하면 인라인 색 대신 `--shiki-light` · `--shiki-dark` · `--shiki-light-bg` · `--shiki-dark-bg` CSS 변수가 심긴다 (확인함). **CSS 에서 이 변수를 골라 쓰는 규칙을 직접 작성해야 한다** — 기본 상태로는 아무 색도 적용되지 않는다.

## 작업

### 1) 의존성 설치

```bash
npm install next-mdx-remote remark-gfm rehype-pretty-code rehype-slug rehype-autolink-headings shiki --no-audit --no-fund
```

### 2) MDX 컴파일 단일 진입점 — `src/lib/mdx.ts`

**이 파일이 프로젝트에서 MDX 를 컴파일하는 유일한 곳이다** (ADR-003). 관리자 프리뷰도 나중에 이걸 재사용한다.

```ts
export interface RenderMdxOptions {
  /** 추가로 주입할 컴포넌트 (다음 step 들이 수식·차트·다이어그램을 여기로 넣는다) */
  components?: Record<string, React.ComponentType<any>>;
}

/** MDX 문자열을 React 엘리먼트로 컴파일한다. Server Component 에서 호출한다. */
export function renderMdx(source: string, options?: RenderMdxOptions): React.ReactElement;
```

remark/rehype 플러그인 목록도 **이 파일에서만** 구성한다. 다른 곳에서 `MDXRemote` 를 직접 import 하지 마라.

기본 컴포넌트 매핑(`src/components/mdx/index.ts` 에서 가져온 것)과 `options.components` 를 병합하되, **호출자가 넘긴 것이 기본값을 덮어쓰도록** 한다.

### 3) 본문 컴포넌트 — `src/components/mdx/`

`UI_GUIDE.md` 의 "본문 요소" 표를 구현한다.

| 파일 | 대상 | 요구 사항 |
|---|---|---|
| `Table.tsx` | `table` | `overflow-x-auto` 컨테이너로 감싼다. 헤더 행 `bg-surface` + 하단 보더. 셀 `px-3 py-2 text-sm`. **좁은 화면에서 표만 가로 스크롤되고 페이지 본문은 절대 가로 스크롤되지 않아야 한다.** 스크롤 가능함을 우측 페이드로 알린다. |
| `Image.tsx` | `img` | `<figure>` + `<figcaption>`(alt 를 캡션으로). `next/image` 사용, `alt` 없으면 빌드 실패. 클릭 시 라이트박스 확대 (`"use client"`). |
| `CodeBlock.tsx` | `pre` | 복사 버튼(우상단, hover 시 노출) + 언어 라벨. 가로 스크롤. `"use client"` 는 복사 버튼에만 국한하라. |
| `Callout.tsx` | 커스텀 | 좌측 3px 보더 + 시맨틱 색(`--success`/`--warning`/`--danger`/`--info`). 인라인 SVG 아이콘. `type` prop. |
| `Heading.tsx` | `h2`~`h4` | `rehype-slug` 가 부여한 id 에 앵커 링크. hover 시에만 링크 표식 노출. |
| `Anchor.tsx` | `a` | 내부 링크는 `next/link`, 외부 링크는 `target="_blank" rel="noopener noreferrer"` + 외부 표시 |

`src/components/mdx/index.ts` 에서 `MDX_COMPONENTS` 로 묶어 내보낸다.

### 4) 코드 하이라이팅 CSS — `src/app/globals.css` 에 추가

`--shiki-light` / `--shiki-dark` 를 테마에 따라 고르는 규칙을 추가한다. 기존 토큰 블록을 **지우지 말고 덧붙여라**.

```css
/* 라이트: --shiki-light 사용, 다크(.dark): --shiki-dark 사용 */
```

`code[data-theme] span` 과 `pre[data-theme]` 양쪽에 `color` 와 `background-color` 를 적용해야 한다.

### 5) 본문 타이포그래피

글 본문은 세리프(`font-serif`), 단폭 `max-w-[68ch]`, 행간 `leading-[1.75]`. **표·코드블록·이미지는 이 폭을 넘어 확장해도 된다** (UI_GUIDE 레이아웃 규칙).

이걸 `src/components/mdx/MdxBody.tsx` 같은 래퍼로 제공해 다음 phase 의 글 상세 페이지가 그대로 쓰게 하라.

### 6) 검증용 임시 라우트 — `src/app/mdx-preview/page.tsx`

표·코드·이미지·콜아웃·링크·제목을 모두 담은 MDX 문자열을 인라인으로 두고 `renderMdx` 로 렌더한다. **step 4 에서 실제 샘플 글로 대체되므로 과하게 만들지 마라.** 다음 step 들의 AC 도 이 라우트를 확장해 쓴다.

주의 사항:

- **폴더명 앞에 `_` 를 붙이지 마라.** Next.js App Router 에서 `_` 접두사 폴더는 private folder 로 취급되어 **라우트 자체가 생기지 않는다** (실제로 확인한 사실). 그러면 아래 AC 의 빌드 산출 HTML 검사도 통과하지 못한다.
- **`notFound()` 로 프로덕션에서 막지도 마라.** `npm run build` 는 프로덕션 모드라 그 경우 MDX 가 프리렌더되지 않아 AC 가 실패한다.
- 이 라우트는 검증 전용이며 **다음 phase(`blog-2-public-site`)에서 삭제된다.** 사이트 내비게이션 어디에도 링크를 걸지 마라.

### 7) 테스트

`src/lib/mdx.test.ts` — `renderMdx` 가 표·코드블록을 포함한 MDX 를 예외 없이 컴파일하는지, `options.components` 로 넘긴 컴포넌트가 기본값을 덮어쓰는지.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/lib/mdx.ts','src/components/mdx/index.ts','src/components/mdx/Table.tsx','src/components/mdx/CodeBlock.tsx','src/components/mdx/Callout.tsx']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
console.log('MDX 컴포넌트 파일 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
// import 만 잡는다. 단순 substring 이면 next-mdx-remote 의 동작을 설명하는 주석까지 위반으로 걸린다.
const offenders=walk('src').filter(f=>/\.tsx?$/.test(f) && f!=='src/lib/mdx.ts' && /from [\"']next-mdx-remote/.test(fs.readFileSync(f,'utf8')));
if(offenders.length) throw new Error('ADR-003 위반 — src/lib/mdx.ts 외부에서 next-mdx-remote 를 직접 import: '+offenders.join(', '));
console.log('MDX 컴파일 진입점 단일화 OK');
"
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
if(!css.includes('--shiki-light')||!css.includes('--shiki-dark')) throw new Error('shiki 이중 테마 CSS 규칙이 없다 — 코드 색이 적용되지 않는다');
if(!css.includes('--chart-1')) throw new Error('기존 토큰 블록이 지워졌다');
console.log('코드 하이라이팅 CSS + 기존 토큰 보존 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk('.next/server/app').filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/<table/.test(html)) throw new Error('빌드 산출 HTML 에 표가 없다');
if(!/--shiki-light/.test(html)) throw new Error('빌드 산출 HTML 에 shiki 이중 테마 변수가 없다 (단일 테마로 설정했을 가능성)');
if(/<span style=\"color:#/.test(html)) throw new Error('코드 색이 인라인 style 로 박혔다 — 다크모드 전환 불가');
console.log('빌드 산출 HTML 검증 OK');
"
pytest scripts/test_execute.py -q
```

마지막 두 커맨드는 `npm run build` 이후에 실행한다.

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 `/mdx-preview` 를 열어 눈으로 확인한다:
   - 375px 폭에서 **표만 가로 스크롤되고 페이지는 가로 스크롤되지 않는가?**
   - 라이트/다크 전환 시 코드블록 색이 실제로 바뀌는가?
   - 복사 버튼이 동작하는가?
3. 아키텍처 체크리스트:
   - ADR-003 — `src/lib/mdx.ts` 외부에서 `next-mdx-remote` 를 import 하지 않았는가?
   - UI_GUIDE 의 모서리 반경·애니메이션 허용 목록·AI 슬롭 안티패턴을 지켰는가?
   - 색을 토큰으로만 썼는가?
4. `phases/blog-1-content-pipeline/index.json` 의 step 1 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`renderMdx` 시그니처, `MDX_COMPONENTS` 키 목록, 본문 래퍼 경로**를 한 줄로 기록
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`src/lib/mdx.ts` 외의 파일에서 `next-mdx-remote` 를 import 하지 마라.** 이유: ADR-003. 프리뷰와 실제 렌더가 갈라지면 "프리뷰는 되는데 발행하면 깨진다"가 생긴다.
- **`rehype-pretty-code` 에 테마를 하나만 주지 마라.** 이유: 색이 인라인으로 박혀 다크모드에서 못 바꾼다. 실제로 확인한 사실이다.
- **수식·다이어그램·차트를 만들지 마라.** 이유: step 2·3 의 범위다.
- **기존 토큰 블록(`:root` / `.dark` / `@theme inline`)을 지우거나 값을 바꾸지 마라.** 이유: blog-0 step 1 의 검증된 산출물이다. 덧붙이기만 하라.
- **글 목록·글 상세 페이지를 만들지 마라.** 이유: 다음 phase 의 범위다.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-1-content-pipeline/index.json` 의 step 1 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
