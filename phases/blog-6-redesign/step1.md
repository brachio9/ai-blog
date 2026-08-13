# Step 1: tokens-and-type

색 토큰과 폰트를 새 방향으로 갈아끼운다. 레이아웃은 다음 step 들 소관이다 — 이 step 은 **토큰·조판 규칙만** 바꾼다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — **색상 표 전체와 타이포그래피 절이 이 step 의 명세다.** 값을 임의로 바꾸지 마라.
- `/src/app/globals.css` — 현재 토큰 정의 (`:root` / `.dark` / `@theme inline`)
- `/src/app/layout.tsx` — `next/font/google` 로 폰트 3종을 불러 CSS 변수로 노출하는 곳
- `/src/lib/categories.ts` — step 0 이 붙인 `accent` 키 (`"hf" | "paper" | "note"`)
- `/src/components/mdx/Chart.tsx` — `--chart-1` … `--chart-5` 를 **런타임에 읽는다**
- `/src/components/mdx/Diagram.tsx` — Mermaid 테마에 색 변수를 넘긴다

## 이미 확인된 사실 (Next 16 에서 실측했다 — 재조사하지 마라)

### (1) 한글 웹폰트는 `next/font/google` 로 된다. 단 `subsets` 에 `korean` 을 넣지 마라

`next/font/google` 타입 정의에 **`"korean"` 서브셋은 존재하지 않는다** (전체 타입에서 0회). 넣으면 컴파일 에러다:

```
Type '"korean"' is not assignable to type '"latin" | "latin-ext"'.
```

**그래도 한글은 정상적으로 서빙된다.** `subsets: ["latin"]` 만 선언해도 생성된 CSS 에 한글 유니코드 범위가 들어간다 — 실측 결과 `unicode-range` 선언 474개, `U+AC00` 포함, woff2 청크 359개(중앙값 10KB). 브라우저는 필요한 범위만 받는다.

렌더 폭을 재서 한글이 웹폰트로 그려지는 것을 확인했다 (같은 문자열, 64px 기준):

| | 한글 폭 |
|---|---|
| IBM Plex Sans KR | 599.37 |
| Noto Serif KR | 651.07 |
| monospace (폴백 대조군) | 630.66 |

세 값이 전부 달랐다 — 두 웹폰트가 한글을 직접 그렸다는 뜻이다.

**대가:** 한글 범위는 `subsets` 로 preload 할 수 없어 **지연 로드된다.** 첫 페인트에 폴백이 잠깐 보인다. `next/font` 가 자동 생성하는 metric-adjusted 폴백이 레이아웃 흔들림을 줄여 주므로 `adjustFontFallback` 을 끄지 마라.

### (2) `IBM Plex Mono` 에는 한글이 없다

숫자·라틴 전용이다. 스택 뒤에 한글 폴백을 반드시 남겨라.

## 작업

### 1) 폰트 — `src/app/layout.tsx`

| 역할 | 폰트 | weight |
|---|---|---|
| UI·목록 (sans) | `IBM_Plex_Sans_KR` | 400, 600 |
| 본문 (serif) | `Noto_Serif_KR` | 400, 600 |
| 데이터·코드 (mono) | `IBM_Plex_Mono` | 400 |

- `subsets: ["latin"]` 만 쓴다 (위 (1)).
- **굵기를 더 늘리지 마라.** 한글 폰트는 굵기 하나가 곧 청크 한 벌이다.
- 기존 `Inter` · `Source_Serif_4` · `JetBrains_Mono` import 를 제거한다.
- CSS 변수 이름(`--font-*`)은 자유롭게 정하되 `globals.css` 의 `--sans` / `--serif` / `--mono` 와 짝을 맞춘다.

`globals.css` 의 폰트 스택에서 **한글 폴백(`Apple SD Gothic Neo` 등)을 지우지 마라.** 지연 로드 구간과 폰트 실패 시의 안전망이다.

### 2) 색 토큰 — `src/app/globals.css`

UI_GUIDE 의 표대로 `:root` 와 `.dark` 를 다시 쓴다.

- 중성: `bg` `surface` `border` `heading` `body` `muted` `faint`
- 신규: `focus` (포커스 링 전용)
- 신규: `cat-hf` · `cat-paper` · `cat-note`
- 시맨틱(성공·주의·오류·정보)·차트 5색: **UI_GUIDE 의 새 값으로 교체**
- **`--chart-1` … `--chart-5` 변수 이름을 바꾸지 마라.** `Chart.tsx` 가 그 이름으로 읽는다. 이름이 바뀌면 **경고도 빌드 실패도 없이 차트가 검정이 된다.**
- `@theme inline` 에 새 토큰(`--color-cat-*`, `--color-focus`)을 노출해 Tailwind 유틸리티로 쓸 수 있게 한다.
- 기존 `accent` 토큰을 쓰는 곳이 많다. **`accent` 를 지우지 말고** 링크 규칙(아래)에 맞게 값만 조정하거나, 지울 거면 **참조를 전부 함께 고쳐라.** 빌드가 통과해도 색이 사라진 채로 남으면 안 된다.

### 3) 한글 조판 — 전역

```css
word-break: keep-all;
overflow-wrap: break-word;
```

- **전역에 적용한다.** 지금은 `word-break: normal` 이라 제목이 "…한 / 글로" 처럼 단어 중간에서 끊긴다.
- `overflow-wrap: break-word` 를 함께 둬야 긴 URL·식별자가 컨테이너를 밀어내지 않는다.
- 숫자·날짜에 쓸 유틸리티로 `font-variant-numeric: tabular-nums` 를 마련한다 (Tailwind 의 `tabular-nums` 로 충분하면 그걸 쓴다).

### 4) 링크 스타일

UI_GUIDE 대로 **본문 링크는 색을 쓰지 않는다** — `heading` 색 + 밑줄(`underline-offset`), 밑줄 색은 `border` → hover 시 `heading`. 내비게이션 링크는 `muted` → hover `heading`, 밑줄 없음.

포커스 링은 `outline-focus` 로 통일한다.

### 5) `faint` 오용 정리

`faint` 는 라이트 모드 대비가 **2.42:1** 이라 텍스트 기준(3:1)에 못 미친다. UI_GUIDE 가 장식·비활성 전용으로 못박았다. 지금 **정보를 담은 텍스트에 쓰는 두 곳을 `muted` 로 바꿔라**:

- `src/components/post/TagFilter.tsx` — 태그 개수
- `src/components/search/SearchClient.tsx` — 입력 placeholder

비활성 페이지네이션(`PostList.tsx`)과 앵커 아이콘(`Heading.tsx`)은 비활성·장식이므로 `faint` 로 두어도 된다.

### 6) 테스트

- `src/app/globals.css` 는 테스트하기 어렵다. 대신 **AC 의 빌드 산출 CSS 검사**로 갈음한다.
- 기존 테스트가 옛 색·폰트 이름을 단정하면 갱신한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
for (const t of ['--cat-hf','--cat-paper','--cat-note','--focus']) {
  if(!css.includes(t)) throw new Error('토큰 '+t+' 이 없다');
}
for (let i=1;i<=5;i++) if(!css.includes('--chart-'+i)) throw new Error('--chart-'+i+' 이 사라졌다 — 차트가 검정이 된다');
if(!/word-break:\s*keep-all/.test(css)) throw new Error('word-break: keep-all 이 없다 — 한글 제목이 단어 중간에서 끊긴다');
if(!/overflow-wrap:\s*break-word/.test(css)) throw new Error('overflow-wrap: break-word 가 없다 — 긴 URL 이 레이아웃을 민다');
console.log('토큰·조판 규칙 OK');
"
node -e "
const fs=require('fs');
const l=fs.readFileSync('src/app/layout.tsx','utf8');
for (const f of ['IBM_Plex_Sans_KR','Noto_Serif_KR','IBM_Plex_Mono']) {
  if(!l.includes(f)) throw new Error('폰트 '+f+' 를 불러오지 않는다');
}
for (const old of ['Inter','Source_Serif_4','JetBrains_Mono']) {
  if(l.includes(old)) throw new Error('옛 폰트 '+old+' 가 남아 있다');
}
if(/subsets:\s*\[[^\]]*korean/.test(l)) throw new Error('korean 서브셋은 next/font 에 없다 — 컴파일 에러가 난다');
console.log('폰트 교체 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const css=walk('.next/static').filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/word-break:\s*keep-all/.test(css)) throw new Error('빌드 산출 CSS 에 keep-all 이 없다');
if(!/\.dark\{[^}]*--bg:/.test(css)) throw new Error('빌드 산출 CSS 에 .dark 토큰 재정의가 없다');
const ko=(css.match(/u\+ac00/gi)||[]).length;
if(!ko) throw new Error('빌드 산출 CSS 에 한글 유니코드 범위가 없다 — 한글이 웹폰트로 안 그려진다');
console.log('빌드 산출 CSS OK (한글 범위 '+ko+'건)');
"
node -e "
const fs=require('fs');
for (const [f,label] of [['src/components/post/TagFilter.tsx','태그 개수'],['src/components/search/SearchClient.tsx','검색 placeholder']]) {
  if(/text-faint/.test(fs.readFileSync(f,'utf8'))) throw new Error(f+' 가 아직 faint 를 쓴다 ('+label+' 는 정보 텍스트다)');
}
console.log('faint 오용 정리 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 **눈으로 확인한다**:
   - 한글 본문이 세리프로 보이는가? 한 문장 안에서 **라틴과 한글의 서체가 갈리지 않는가?**
   - 제목이 단어 중간에서 끊기지 않는가
   - 라이트/다크를 전환하며 본문·메타·테두리가 전부 읽히는가
   - **본문 글의 차트가 검정이 아닌가** (`/papers/moe-routing-pipeline` 등에서 확인) — 이게 깨지면 `--chart-*` 이름이 어긋난 것이다
   - 다이어그램이 라이트/다크 양쪽에서 읽히는가
   - 코드블록 색이 테마 전환에 따라 바뀌는가
3. 첫 로드에서 한글이 잠깐 폴백으로 보였다가 바뀌는 것은 **정상이다** (위 (1)). 레이아웃이 크게 튀면 그건 문제이니 보고하라.
4. 아키텍처 체크리스트:
   - `--chart-1`…`--chart-5` 이름이 그대로인가?
   - 글 상세가 여전히 SSG(`●`) 인가?
   - 폰트 굵기를 필요 이상 늘리지 않았는가?
5. `phases/blog-6-redesign/index.json` 의 step 1 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **새 토큰 이름 목록(특히 `--cat-*`·`--focus`), 폰트 3종과 CSS 변수 이름, 링크 스타일 규칙**을 한 줄로 기록.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`subsets` 에 `"korean"` 을 넣지 마라.** next/font 에 없는 값이라 컴파일 에러다.
- **`--chart-1` … `--chart-5` 변수 이름을 바꾸지 마라.** 차트가 조용히 검정이 된다.
- **한글 폴백 폰트를 스택에서 지우지 마라.**
- **레이아웃·컴포넌트 구조를 바꾸지 마라.** step 2~5 의 범위다. 이 step 은 토큰과 조판 규칙만이다.
- **아이콘 라이브러리를 설치하지 마라.**
- **`content/` 의 글을 수정하지 마라.**
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-6-redesign/index.json` 의 step 1 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
