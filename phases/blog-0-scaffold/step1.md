# Step 1: design-tokens

`docs/UI_GUIDE.md` 의 디자인 토큰을 실제 CSS 변수 + Tailwind v4 유틸리티로 구현하고, 라이트/다크 토글을 붙인다. 화면 구성(헤더·푸터 등)은 step 2 소관이다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — **색상·타이포그래피·레이아웃 표가 이 step 의 명세다.** 값을 임의로 바꾸지 마라.
- `/docs/ADR.md` — ADR-008 (Tailwind v4 CSS-first)
- `/src/app/globals.css` — step 0 이 만든 create-next-app 기본 CSS. 전면 교체 대상.
- `/src/app/layout.tsx` — step 0 이 만든 루트 레이아웃. 폰트와 테마 스크립트를 여기에 붙인다.

## 배경 (검증된 사실 — 다시 조사하지 마라)

Tailwind v4 의 `dark:` 는 **기본이 `prefers-color-scheme`** 이다. 사용자 토글(.dark 클래스)로 제어하려면 CSS 에 아래 선언이 반드시 있어야 한다:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

이 선언 + `:root` / `.dark` 의 변수 재정의 + `@theme inline` 조합이 실제 빌드에서 아래처럼 나오는 것을 확인했다:

```
.dark\:border-accent:where(.dark,.dark *){border-color:var(--color-accent)}
.dark{--color-bg:#14110f; --color-accent:#e07a55; ...}
text-accent{color:var(--color-accent)}
```

## 작업

### 1) `src/app/globals.css` 전면 재작성

구조는 다음 순서를 지킨다:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root  { /* 라이트 토큰 — UI_GUIDE '색상' 표의 라이트 열 */ }
.dark  { /* 다크 토큰 — 같은 표의 다크 열 */ }

@theme inline { /* 위 변수를 Tailwind 유틸리티로 노출 */ }
```

**구현해야 할 토큰** (`docs/UI_GUIDE.md` 의 표에서 값을 그대로 가져올 것):
- 표면/텍스트: `bg` · `surface` · `border` · `heading` · `body` · `muted` · `faint` · `accent` · `accent-hover`
- 시맨틱: 성공 · 주의 · 오류 · 정보
- 차트 카테고리 색 5종 — 차트 컴포넌트가 CSS 변수로 읽어야 하므로 반드시 변수로 노출한다 (다음 phase 에서 Recharts 가 사용한다)

폰트 변수(`--font-sans` / `--font-serif` / `--font-mono`)도 `@theme inline` 에 노출한다.

`body` 에 `background-color` 와 `color` 를 토큰으로 지정한다.

### 2) 폰트 — `src/app/layout.tsx`

`next/font/google` 로 self-host 한다 (외부 런타임 요청이 생기면 안 된다):

| 역할 | 폰트 | CSS 변수 |
|---|---|---|
| UI·목록·내비 | `Inter` | `--font-sans` |
| 글 본문 | `Source_Serif_4` | `--font-serif` |
| 코드 | `JetBrains_Mono` | `--font-mono` |

`subsets: ["latin"]`, `display: "swap"`, `variable: "--font-..."` 를 지정하고 `<html>` 에 클래스로 붙인다.

한글 본문이 주 콘텐츠다. 위 3종은 한글 글리프가 없으므로 **CSS 폰트 스택에 한글 폴백을 명시**하라 (`"Apple SD Gothic Neo", "Malgun Gothic", sans-serif` 계열). 한글이 기본 산세리프로 떨어지는 것까지는 허용하되, 폴백이 없어 깨지는 일은 없어야 한다.

### 3) 테마 토글 — 깜빡임(FOUC) 없이

- `<html>` 태그에 `suppressHydrationWarning` 을 준다.
- `<head>` 안에 **인라인 스크립트**를 넣어 페인트 전에 테마를 확정한다: `localStorage.theme` 을 읽고, 없으면 `matchMedia("(prefers-color-scheme: dark)")` 로 판단해 `document.documentElement.classList` 에 `dark` 를 붙인다.
- 이유: 이 스크립트가 없으면 다크 사용자에게 흰 화면이 한 번 번쩍인다. React 렌더 이후에 처리하면 늦다.
- 토글 **UI 버튼은 만들지 마라** — step 2 (layout-shell) 소관이다. 이 step 은 토글이 동작할 **기반**(클래스 적용 + localStorage 규약)만 만든다.
- 테마 값 규약: `localStorage.theme` 은 `"light"` | `"dark"` 만 저장한다. 값이 없으면 시스템 설정을 따른다. 이 규약을 `src/lib/theme.ts` 에 상수/헬퍼로 정리해 step 2 가 재사용하게 하라.

### 4) 검증용 테스트

`src/lib/theme.test.ts` 에 테마 헬퍼의 단위 테스트를 작성한다 (localStorage 값에 따라 어떤 클래스가 결정되는지). jsdom 환경이므로 `document`·`localStorage` 를 쓸 수 있다.

### 5) 토큰 확인용 임시 페이지

`src/app/page.tsx` 를 토큰 확인용으로 채운다 — 각 색 토큰, 3종 폰트, 본문 단폭(`max-w-[68ch]`)을 눈으로 확인할 수 있는 단순한 나열. step 2 에서 실제 Intro 로 교체될 임시 화면이다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
grep -q "@custom-variant dark" src/app/globals.css && echo "dark custom-variant OK"
grep -q "@theme inline" src/app/globals.css && echo "theme inline OK"
test ! -f tailwind.config.js && test ! -f tailwind.config.ts && echo "CSS-first OK"
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
const need=['--color-bg','--color-surface','--color-border','--color-heading','--color-body','--color-muted','--color-accent','--font-sans','--font-serif','--font-mono'];
const miss=need.filter(t=>!css.includes(t));
if(miss.length)throw new Error('토큰 누락: '+miss.join(', '));
if(!/\.dark\s*{/.test(css))throw new Error('.dark 토큰 블록 없음');
console.log('토큰 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('.next/static').filter(f=>f.endsWith('.css'));
if(!files.length)throw new Error('빌드 산출 CSS 를 찾지 못했다');
const css=files.map(f=>fs.readFileSync(f,'utf8')).join('');
// 테마는 .dark 의 토큰 재정의가 구동한다. `dark:` 유틸리티를 마크업에서 쓰지 않으면
// Tailwind v4 는 그 배리언트를 아예 산출하지 않으므로 where(.dark 유무로 판정하면 안 된다.
if(!/\.dark\{[^}]*--bg:/.test(css))throw new Error('빌드 산출 CSS 에 .dark 토큰 재정의가 없다 — 다크모드가 동작하지 않는다');
console.log('빌드 산출 .dark 토큰 재정의 OK ('+files.length+' 파일 검사)');
"
```

마지막 커맨드는 `npm run build` 이후에 실행해야 한다 (`.next/` 가 있어야 함).

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. 아키텍처 체크리스트:
   - `UI_GUIDE.md` 의 색상 값을 그대로 썼는가? 임의로 바꾸지 않았는가?
   - AI 슬롭 안티패턴을 도입하지 않았는가? (gradient-text, backdrop blur, glow, 보라/인디고, gradient orb)
   - ADR-008 위반 없는가? (`tailwind.config.*` 부재)
   - 컴포넌트에 hex 를 직접 쓰지 않고 토큰만 썼는가?
3. `phases/blog-0-scaffold/index.json` 의 step 1 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **정의한 토큰 이름 목록과 테마 헬퍼 경로**를 한 줄로 기록
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`UI_GUIDE.md` 의 색상 값을 임의로 바꾸지 마라.** 이유: 디자인 명세가 문서에 있고, 코드가 문서를 이긴다면 문서가 무의미해진다. 값이 잘못됐다고 판단되면 고치지 말고 `blocked` 로 보고하라.
- **보라/인디고 계열을 쓰지 마라.** 이유: UI_GUIDE 안티패턴 1번.
- **헤더·푸터·내비게이션·토글 버튼을 만들지 마라.** 이유: step 2 의 범위다.
- **`tailwind.config.*` 를 만들지 마라.** 이유: ADR-008.
- **`next/font` 대신 외부 CDN 링크(`<link href="fonts.googleapis.com">`)를 쓰지 마라.** 이유: 런타임 외부 요청과 레이아웃 시프트가 생긴다.
- 기존 테스트를 깨뜨리지 마라.
