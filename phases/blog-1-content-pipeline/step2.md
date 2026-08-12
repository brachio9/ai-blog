# Step 2: math-and-diagrams

수식(KaTeX)과 다이어그램(Mermaid)을 본문에서 쓸 수 있게 한다. arXiv 논문 리뷰가 주 콘텐츠라 수식은 필수다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — "본문 요소" 표의 **다이어그램·수식** 행, 그리고 **"런타임 JS 에서 색을 읽을 때"** 경고
- `/docs/ARCHITECTURE.md` — 무거운 클라이언트 라이브러리는 해당 요소가 있는 페이지에서만 lazy-load
- `/src/lib/mdx.ts` — step 1 의 MDX 단일 진입점. **여기에 플러그인을 추가한다.**
- `/src/components/mdx/index.ts` — step 1 의 컴포넌트 매핑
- `/src/app/globals.css` — 토큰. 특히 원시 변수(`--accent` · `--border` · `--muted` · `--surface`)
- `/src/lib/theme.ts` — `DARK_CLASS` 상수. 다이어그램 테마 판별에 재사용하라.

## 배경 (실제로 빌드해 확인한 사실 — 다시 조사하지 마라)

- `remark-math` + `rehype-katex` 조합이 인라인 `$...$` 와 별행 `$$...$$` 를 모두 렌더한다. 별행은 `.katex-display` 클래스가 붙는다.
- **`katex/dist/katex.min.css` 를 import 해야 한다.** 안 하면 수식이 날것의 텍스트 더미로 보인다.
- Mermaid 11 은 `mermaid.initialize({ startOnLoad: false })` 후 `await mermaid.render(id, chart)` 로 SVG 문자열을 받는 방식이 동작한다. `useEffect` 안에서 `await import("mermaid")` 로 지연 로드하면 별도 청크로 분리된다.

**색상 함정 (반드시 지킬 것):** Tailwind v4 는 마크업에서 쓰이지 않는 `@theme` 변수를 빌드에서 제거한다. 따라서 `getComputedStyle(...).getPropertyValue("--color-accent")` 는 **빈 문자열을 반환할 수 있다.** 런타임에 색을 읽을 때는 반드시 **원시 변수명**(`--accent` · `--border` · `--muted` · `--surface` · `--heading`)을 쓴다. UI_GUIDE 의 해당 절을 읽어라.

## 작업

### 1) 의존성 설치

```bash
npm install remark-math rehype-katex katex mermaid --no-audit --no-fund
```

### 2) 수식 — `src/lib/mdx.ts` 에 플러그인 추가

- `remarkPlugins` 에 `remarkMath` 추가
- `rehypePlugins` 에 `rehypeKatex` 추가 (`rehypePrettyCode` 보다 **앞에** 두어라 — 수식 안의 문자를 코드 하이라이터가 건드리지 않게)
- `katex/dist/katex.min.css` 를 앱 어딘가에서 한 번 import 한다. 글 상세에만 필요하므로 `src/lib/mdx.ts` 또는 본문 래퍼에서 import 하는 편이 낫다 (전역 `globals.css` 보다 범위가 좁다).

별행 수식이 좁은 화면에서 넘칠 때 **가로 스크롤**되도록 CSS 를 준다 (`.katex-display { overflow-x: auto; }` 계열). 이유: UI_GUIDE 수식 규격.

### 3) 다이어그램 — `src/components/mdx/Diagram.tsx`

```tsx
"use client";
export default function Diagram({ chart }: { chart: string }): React.ReactElement;
```

요구 사항:

- `useEffect` 안에서 `await import("mermaid")` — **모듈 최상단에서 import 하지 마라.** 이유: mermaid 는 무겁고, 다이어그램이 없는 페이지까지 내려받게 된다.
- `mermaid.initialize({ startOnLoad: false, theme: "base", themeVariables: {...} })` 에 **원시 CSS 변수에서 읽은 실제 색값**을 넘긴다 (`--surface` · `--border` · `--body` · `--accent`). 변수명 함정은 위 "배경" 참고.
- **테마 전환에 반응해야 한다.** `document.documentElement` 의 `DARK_CLASS` 를 `MutationObserver` 로 관찰해 다크/라이트가 바뀌면 다시 렌더한다. 이유: 한 번 만든 SVG 는 색이 고정되어 다크로 바꾸면 읽을 수 없게 된다.
- 렌더 실패 시(잘못된 mermaid 문법) **페이지를 깨뜨리지 말고** 원본 텍스트를 `<pre>` 로 보여주고 조용히 경고만 남긴다. 이유: 글 하나의 오타가 사이트를 죽이면 안 된다.
- `next/dynamic` 으로 감싸 필요한 페이지에서만 로드되게 한다.

MDX 에서 쓰는 방법을 정하고 `MDX_COMPONENTS` 에 등록하라. 방식은 재량이되(` ```mermaid ` 코드펜스 가로채기 또는 `<Diagram chart={...} />`), **step 4 의 샘플 글이 쓸 수 있도록 summary 에 사용법을 명시하라.**

### 4) 검증용 라우트 확장 — `src/app/mdx-preview/page.tsx`

step 1 이 만든 라우트에 인라인 수식·별행 수식·Mermaid 다이어그램을 추가한다.

### 5) 테스트

`src/lib/mdx.test.ts` 를 확장해 `$E=mc^2$` 와 `$$...$$` 가 예외 없이 컴파일되는지 확인한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
if(!fs.existsSync('src/components/mdx/Diagram.tsx')) throw new Error('Diagram.tsx 없음');
const d=fs.readFileSync('src/components/mdx/Diagram.tsx','utf8');
if(/^\s*import\s+mermaid/m.test(d)) throw new Error('mermaid 를 최상단에서 import 했다 — 지연 로드가 깨진다');
if(!/import\(/.test(d)) throw new Error('동적 import 가 없다');
if(!/--(surface|border|body|accent)/.test(d)) throw new Error('원시 CSS 변수로 색을 읽지 않는다');
if(/--color-(surface|border|body|accent|chart)/.test(d)) throw new Error('@theme 변수(--color-*)를 런타임 조회에 썼다 — 트리셰이킹으로 빈 값이 된다');
if(!/MutationObserver/.test(d)) throw new Error('테마 전환 감지가 없다 — 다크 전환 시 다이어그램이 읽히지 않는다');
console.log('Diagram 구현 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const src=walk('src').filter(f=>/\.tsx?$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/katex\/dist\/katex\.min\.css/.test(src)) throw new Error('katex CSS 를 import 하지 않았다 — 수식이 날것으로 보인다');
const html=walk('.next/server/app').filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/katex/.test(html)) throw new Error('빌드 산출 HTML 에 KaTeX 출력이 없다');
if(!/katex-display/.test(html)) throw new Error('별행 수식(katex-display)이 렌더되지 않았다');
console.log('KaTeX 렌더 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 `/mdx-preview` 에서 눈으로 확인한다:
   - 수식이 조판되어 보이는가? (날것의 `\sum` 텍스트가 아니라)
   - **다이어그램이 라이트/다크 전환 시 함께 바뀌는가?** 다크에서 글자가 배경에 묻히지 않는가?
   - 375px 폭에서 별행 수식이 페이지를 밀어내지 않고 자체 가로 스크롤되는가?
   - 다이어그램이 없는 페이지(`/`)에서 mermaid 청크가 내려오지 않는가? (DevTools Network 확인)
3. 아키텍처 체크리스트:
   - ADR-003 — `src/lib/mdx.ts` 단일 진입점 유지?
   - 무거운 라이브러리를 lazy-load 했는가?
   - 런타임 색 조회에 원시 변수를 썼는가?
4. `phases/blog-1-content-pipeline/index.json` 의 step 2 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **다이어그램을 MDX 에서 쓰는 문법과 수식 사용법**을 한 줄로 기록. step 4 의 샘플 글이 이 정보만 보고 작성한다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`mermaid` 를 모듈 최상단에서 import 하지 마라.** 이유: 다이어그램이 없는 페이지까지 무거운 번들을 내려받는다 (ARCHITECTURE 규칙).
- **런타임 색 조회에 `--color-*` 를 쓰지 마라.** 이유: Tailwind v4 가 미사용 `@theme` 변수를 제거해 빈 문자열이 온다. 실측으로 확인된 사실이며, 이 경우 다이어그램이 검정/투명으로 나오는데 **빌드는 통과한다.**
- **mermaid 문법 오류가 페이지를 깨뜨리게 두지 마라.** 이유: 글 하나의 오타로 사이트가 죽는다.
- **차트(Recharts)를 만들지 마라.** 이유: step 3 의 범위다.
- **step 1 의 컴포넌트·CSS 를 재작성하지 마라.** 필요하면 확장하되 기존 동작을 바꾸지 마라.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-1-content-pipeline/index.json` 의 step 2 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
