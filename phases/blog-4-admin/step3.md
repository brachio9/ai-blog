# Step 3: editor

MDX 에디터와 실시간 프리뷰. 발행(커밋)은 다음 step 이므로 여기서는 **쓰고 미리 보는 것까지** 만든다.

## 읽어야 할 파일

- `/docs/ADR.md` — **ADR-003: MDX 컴파일 진입점은 `src/lib/mdx.ts` 하나.** 프리뷰용 별도 파이프라인 금지.
- `/docs/ARCHITECTURE.md` — "프리뷰와 실제 렌더는 같은 컴파일 경로를 쓴다"
- `/docs/UI_GUIDE.md` — 토큰과 AI 슬롭 안티패턴
- `/src/lib/mdx.ts` — **현재 `renderMdx(source, options?)` 하나를 노출한다.** 이 파일을 확장한다.
- `/src/components/mdx/index.ts` — `MDX_COMPONENTS`. `Chart` · `Diagram` 은 `next/dynamic` 으로 감싸여 있다.
- `/src/lib/content/schema.ts` — frontmatter zod 스키마. 에디터 폼 검증에 **재사용**한다.
- `/src/types/content.ts` — `PostFrontmatter` · `PostSource` · `PaperMeta`
- `/src/lib/content/posts.ts` — 파일명 규약 `content/{category}/YYYY-MM-DD-{slug}.mdx`
- `/src/lib/auth.ts` — `requireAdmin()`
- `/src/services/github.ts` — `readFile(path)` (기존 글 불러오기)
- `/src/lib/categories.ts` — `CATEGORIES`

## 이미 확인된 사실 (Next 16.3.0 에서 실측했다 — 재조사하지 마라)

이 step 의 설계는 아래 세 가지 실측 결과 위에 서 있다. **그대로 따르라.**

### (1) Server Action 은 JSX 를 반환할 수 있다

`"use server"` 함수가 서버에서 컴파일한 MDX 를 React 엘리먼트로 돌려주면 클라이언트가 그대로 렌더한다.
프로덕션 빌드에서 `<h1>` · `<table>` · Recharts 차트까지 정상 확인. **이 방식이면 ADR-003 을 지키면서 실시간 프리뷰가 된다.**

### (2) `renderMdx` 를 그대로 프리뷰에 쓰면 에러 메시지가 뭉개진다

`renderMdx` 는 `MDXRemote` 엘리먼트를 **지연 반환**한다. 컴파일 에러가 RSC 렌더 단계에서 터져
클라이언트에는 `Minified React error #441` 만 도착한다 — 사용자는 무엇이 잘못됐는지 알 수 없고, 직전 프리뷰가 화면에 그대로 남아 더 헷갈린다.

`next-mdx-remote/rsc` 의 **`compileMDX` 는 컴파일을 즉시 await** 하므로 `try/catch` 로 잡힌다. 실측한 메시지:

```
[next-mdx-remote] error compiling MDX:
Unexpected character `*` (U+002A) after name, expected a character that can start
an attribute name, such as a letter, `$`, or `_`; ...
```

→ **프리뷰는 `compileMDX` 기반의 새 함수를 쓴다.**

### (3) 프리뷰 안의 클라이언트 컴포넌트는 에디터 페이지가 참조해야 산다 ⚠

Server Action 이 돌려준 트리에 클라이언트 컴포넌트(`Chart` · `Diagram`)가 들어 있으면, **그 라우트의 React Client Manifest 에 등록되어 있지 않으면 깨진다.**

- 프로덕션: `Could not find the module ".../Chart.tsx#default" in the React Client Manifest`
- 개발: 콘솔에 `chunk.reason.enqueueModel is not a function` 만 뜨고 **프리뷰가 조용히 빈 화면**이 된다 (에러 메시지도 없다)

Server Action 파일에서 import 하는 것만으로는 **부족하다.** 실측한 해법:

> **에디터의 Server Component 페이지가 `MDX_COMPONENTS` 를 import 해서 실제로 참조**하면 등록된다.
> 렌더할 필요는 없다 — 참조만으로 충분하다. `next/dynamic` 으로 감싼 컴포넌트에서도 동일하게 동작함을 확인했다.

즉 프리뷰에서 차트·다이어그램이 안 나오면 그건 MDX 문법 문제가 아니라 **이 등록 누락**이다.

## 작업

### 1) `src/lib/mdx.ts` 확장 — 진입점은 여전히 하나

- 지금 `renderMdx` 안에 인라인으로 들어 있는 remark/rehype 설정을 **모듈 상수로 뽑아**, 아래 새 함수와 **같은 객체를 공유**하게 하라. 이유: 두 벌로 갈리는 순간 ADR-003 이 무너진다 ("프리뷰는 되는데 발행하면 깨진다").
- 새 함수를 추가한다:

```ts
export type MdxCompileResult =
  | { ok: true; content: ReactElement }
  | { ok: false; message: string };

/** 컴파일을 즉시 수행해 에러를 잡아 반환한다. 관리자 프리뷰용. */
export async function compileMdxChecked(
  source: string,
  options?: RenderMdxOptions,
): Promise<MdxCompileResult>;
```

- **`renderMdx` 의 기존 동작·시그니처를 바꾸지 마라.** 공개 글 렌더가 그걸 쓰고 있고, 본문 컴파일 실패는 빌드를 깨뜨리는 게 맞다.
- `compileMdxChecked` 는 `MDX_COMPONENTS` 를 `renderMdx` 와 동일하게 주입한다.

### 2) 프리뷰 Server Action

`src/app/admin/editor/actions.ts` (JSX 를 파일 안에서 직접 쓰면 `src/app/admin/editor/actions.tsx`) 에 `"use server"` 로 둔다.

- 첫 줄에서 **인증을 확인한다. Server Action 은 proxy matcher 를 타지 않는 별도 진입점**이다 — 빠뜨리면 누구나 서버에서 MDX 를 컴파일시킬 수 있다.
  단 여기서는 `requireAdmin()`(`notFound()` 를 던진다) 말고 **`getAdminLogin()` 으로 판정하고 `{ ok: false, message }` 를 반환**하라. Server Action 에서 예외를 던지면 클라이언트에는 위 (2) 와 같은 뭉개진 에러만 도착한다.
- `compileMdxChecked` 를 호출해 결과를 그대로 반환한다.
- 실패 시 `ok: false` 와 **컴파일러가 준 메시지**를 돌려준다. 예외를 밖으로 던지지 마라 (위 (2) 참고).

### 3) 에디터 페이지 — `src/app/admin/editor/page.tsx` (Server Component)

- 첫 줄에서 `requireAdmin()`.
- `?path=` 가 있으면 `readFile(path)` 로 기존 글을 불러와 `gray-matter` 로 frontmatter/본문을 갈라 초기값으로 넘긴다. `sha` 도 함께 넘겨라 — step 4 의 수정 커밋에 필요하다.
- `?path=` 가 없으면 신규 작성 모드.
- **`MDX_COMPONENTS` 를 import 해서 참조하라** (위 (3)). 트리셰이킹으로 사라지지 않을 방식으로 참조하고, **왜 필요한지 주석으로 남겨라.** 주석이 없으면 다음 사람이 "안 쓰는 import" 로 지운다.
- 이 페이지는 `searchParams` 를 읽으므로 동적이다. 관리자 화면이라 정상이다 — 공개 페이지의 정적 생성과는 무관하다.

### 4) 에디터 UI — `src/app/admin/editor/Editor.tsx` (`"use client"`)

두 칸 구성(좁은 화면에서는 탭 전환):

**왼쪽 — 입력**
- frontmatter 폼: `title` · `category`(select, `CATEGORIES` 순회) · `summary` · `publishedAt` · `tags` · `draft` · `source.*` · `paper.*`(papers 카테고리일 때만)
- **slug 입력** — `^[a-z0-9]+(-[a-z0-9]+)*$` 만 허용한다. 이유: 로더의 파일명 정규식은 한글도 통과시키지만 그러면 URL 이 퍼센트 인코딩되어 지저분해지고 링크가 깨지기 쉽다. 제목에서 자동 생성하되 **한글은 자동 로마자화하지 말고** 사용자가 직접 채우게 하라 (라이브러리를 새로 들이지 마라).
- 본문 textarea (MDX)
- `publishedAt` 기본값은 **현재 시각을 KST(`+0900`) ISO-8601** 로 (CLAUDE.md CRITICAL). `Z` 로 끝나는 값을 만들지 마라 — zod 스키마가 거부한다.
- 저장될 파일 경로를 실시간으로 보여준다: `content/{category}/{YYYY-MM-DD}-{slug}.mdx`

**오른쪽 — 프리뷰**
- 본문이 바뀌면 **디바운스(400~800ms)** 후 Server Action 을 호출한다. 매 타건마다 부르지 마라.
- 컴파일 실패 시 **에러 메시지를 그대로** 보여주고 **이전 프리뷰는 지운다** (낡은 화면이 남으면 오해를 부른다).
- 프리뷰 영역은 공개 글 상세와 같은 타이포 컨테이너를 쓴다 — 실제와 다르게 보이면 프리뷰의 의미가 없다.

**frontmatter 검증**은 `src/lib/content/schema.ts` 의 스키마를 재사용해 저장 전에 확인하고, 어떤 필드가 왜 틀렸는지 보여준다. 스키마를 다시 적지 마라.

이 step 에서는 **저장 버튼이 아직 동작하지 않아도 된다** (step 4). 다만 화면에 자리는 만들어 두고 비활성 상태임을 알려라.

### 5) 테스트

순수 로직만 테스트한다 (`src/**/*.test.{ts,tsx}`):

- slug 검증: 한글·공백·대문자·연속 하이픈·앞뒤 하이픈 거부, 정상 slug 통과
- 파일 경로 조립: `(category, publishedAt, slug)` → `content/{category}/YYYY-MM-DD-{slug}.mdx`
- KST 포맷: 현재 시각 생성 결과가 `+0900` 으로 끝나고 zod 스키마를 통과하는가
- frontmatter 직렬화 왕복: 폼 값 → MDX 문자열 → `gray-matter` 파싱 → 같은 값 (한글 제목·태그 포함)
- `compileMdxChecked`: 정상 MDX → `ok: true`, 깨진 MDX → `ok: false` 와 비어 있지 않은 메시지

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const m=fs.readFileSync('src/lib/mdx.ts','utf8');
if(!/compileMdxChecked/.test(m)) throw new Error('compileMdxChecked 가 없다');
if(!/compileMDX/.test(m)) throw new Error('compileMDX 를 쓰지 않는다 — 에러 메시지가 React #441 로 뭉개진다');
if(!/export function renderMdx/.test(m)) throw new Error('renderMdx 를 없애지 마라 — 공개 글 렌더가 쓴다');
const opts=(m.match(/remarkPlugins\s*:/g)||[]).length;
if(opts!==1) throw new Error('remarkPlugins 설정이 '+opts+'벌이다 — 정확히 하나를 공유해야 한다 (ADR-003)');
console.log('MDX 진입점 단일화 OK');
"
node -e "
const fs=require('fs');
const g=(p)=>fs.readFileSync(p,'utf8');
const page=g('src/app/admin/editor/page.tsx');
if(!/requireAdmin/.test(page)) throw new Error('에디터 페이지가 requireAdmin() 을 호출하지 않는다');
if(!/MDX_COMPONENTS/.test(page)) throw new Error('에디터 페이지가 MDX_COMPONENTS 를 참조하지 않는다 — 프리뷰의 차트/다이어그램이 Client Manifest 누락으로 깨진다');
const act=['src/app/admin/editor/actions.ts','src/app/admin/editor/actions.tsx'].find(p=>fs.existsSync(p));
if(!act) throw new Error('프리뷰 Server Action 파일이 없다');
const a=g(act);
if(!/use server/.test(a)) throw new Error('Server Action 선언이 없다');
if(!/getAdminLogin|requireAdmin/.test(a)) throw new Error('Server Action 이 인증을 확인하지 않는다 — proxy matcher 를 타지 않는 진입점이다');
if(!/compileMdxChecked/.test(a)) throw new Error('Server Action 이 compileMdxChecked 를 쓰지 않는다');
console.log('에디터 라우트 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const e=fs.readFileSync('src/app/admin/editor/Editor.tsx','utf8');
if(!/use client/.test(e)) throw new Error('에디터가 클라이언트 컴포넌트가 아니다');
if(/next-mdx-remote/.test(e)) throw new Error('클라이언트에서 MDX 를 직접 컴파일하지 마라 — 파이프라인이 갈라진다 (ADR-003)');
const dir='src/app/admin/editor';
const joined=fs.readdirSync(dir,{withFileTypes:true}).filter(d=>d.isFile()).map(d=>fs.readFileSync(path.join(dir,d.name),'utf8')).join('');
if(!joined.includes('+0900')) throw new Error('KST(+0900) 생성이 없다 (CLAUDE.md CRITICAL)');
console.log('에디터 UI 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const files=[];
(function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.tsx?\$/.test(e.name)) files.push(p);} })('src');
const compilers=files.filter(f=>f!=='src/lib/mdx.ts'.split('/').join(path.sep)).filter(f=>/from \"next-mdx-remote/.test(fs.readFileSync(f,'utf8')));
if(compilers.length) throw new Error('src/lib/mdx.ts 밖에서 MDX 를 컴파일한다 (ADR-003 위반): '+compilers.join(', '));
console.log('MDX 컴파일 단일 진입점 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 로그인해 `/admin/editor` 를 **눈으로 확인한다.** 이 step 의 본질은 "빌드가 통과한다"가 아니라 "프리뷰가 실제와 같게 보인다" 이다:
   - 표 · 코드블록 · 콜아웃 · 이미지가 공개 글 상세와 **같은 모습**으로 보이는가?
   - **수식**(`$인라인$`, `$$별행$$`)이 조판되는가?
   - **`<Chart ... />` 를 넣었을 때 차트가 그려지는가?** (빈 화면이면 위 (3) 등록 누락이다 — 콘솔도 확인하라)
   - **` ```mermaid ` 다이어그램이 그려지는가?**
   - 일부러 깨진 MDX(`<Broken **`)를 넣으면 **읽을 수 있는 에러**가 뜨고 이전 프리뷰가 사라지는가?
   - 라이트/다크 전환에서 프리뷰가 함께 바뀌는가?
3. **프로덕션 빌드로도 확인한다** (`npm run build && npm start`). 위 (3) 함정은 개발과 프로덕션에서 증상이 다르다.
4. `?path=content/papers/...` 로 기존 글을 열면 frontmatter 폼과 본문이 채워지는가?
5. 아키텍처 체크리스트:
   - MDX 컴파일이 `src/lib/mdx.ts` 하나를 지나는가? (ADR-003)
   - frontmatter 스키마를 재사용했는가?
   - `publishedAt` 이 `+0900` 인가? (CLAUDE.md CRITICAL)
   - 공개 페이지·글 상세가 그대로인가? 여전히 SSG(`●`) 인가?
6. `phases/blog-4-admin/index.json` 의 step 3 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`compileMdxChecked` 시그니처, 만든 파일 경로, 에디터가 step 4 에 넘길 값(경로·본문·frontmatter·sha)의 형태, Client Manifest 등록을 어디서 했는지**를 한 줄로 기록. step 4 가 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **프리뷰용 MDX 파이프라인을 따로 만들지 마라.** 클라이언트에서 `next-mdx-remote` 를 직접 쓰지 마라 (ADR-003).
- **`renderMdx` 의 시그니처·동작을 바꾸지 마라.** 공개 글 렌더가 의존한다.
- **remark/rehype 설정을 두 벌로 두지 마라.** 하나를 공유한다.
- **한글 자동 로마자화 라이브러리를 도입하지 마라.** slug 는 사용자가 ASCII 로 입력한다.
- **커밋·발행·이미지 업로드를 구현하지 마라.** step 4 의 범위다. GitHub 에 쓰기 요청을 보내지 마라.
- **`.env.local` 을 편집하거나 출력하지 마라.**
- **공개 페이지·`src/components/post/`·`src/lib/content/posts.ts` 를 수정하지 마라.**
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-4-admin/index.json` 의 step 3 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
