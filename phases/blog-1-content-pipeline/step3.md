# Step 3: charts

벤치마크 수치를 MDX 안에 데이터로 적으면 그래프로 그려주는 `<Chart>` 컴포넌트를 만든다. 스크린샷과 달리 확대해도 안 깨지고 다크모드에 대응한다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — "본문 요소" 표의 **차트** 행, **차트 카테고리 색** 표, **"런타임 JS 에서 색을 읽을 때"** 경고
- `/docs/ARCHITECTURE.md` — lazy-load 규칙
- `/src/lib/mdx.ts` · `/src/components/mdx/index.ts` — step 1·2 산출물
- `/src/components/mdx/Diagram.tsx` — step 2 가 만든 클라이언트 컴포넌트. **테마 전환 감지 방식을 그대로 따라 하라** (같은 문제를 두 방식으로 풀지 마라).
- `/src/app/globals.css` — `--chart-1` ~ `--chart-5` 원시 변수

## 배경 (실제로 빌드·실행해 확인한 사실 — 다시 조사하지 마라)

- `recharts@3` 은 Next 16 + React 19 에서 정상 동작한다. `"use client"` + `ResponsiveContainer` 조합으로 정적 페이지에서도 렌더된다.
- `fill="var(--chart-1)"` 처럼 CSS 변수를 그대로 넘기면 브라우저가 해석한다. 실측: `--chart-1: #a8442a` 정의 시 막대가 `rgb(168, 68, 42)` 로 칠해졌고, 테마 전환 시 다크값으로 자동으로 바뀐다.

**⚠ 가장 중요한 함정:** CSS 변수가 **정의되어 있지 않으면 Recharts 는 에러 없이 검정(`rgb(0,0,0)`)으로 칠한다.** 빌드도 통과하고 콘솔 경고도 없다. 실측으로 확인했다.

그리고 Tailwind v4 는 마크업에서 쓰이지 않는 `@theme` 변수를 제거하므로 **`var(--color-chart-1)` 은 항상 빈 값이 되어 차트 전체가 검정으로 나온다.** 반드시 원시 변수 `var(--chart-1)` ~ `var(--chart-5)` 를 써라.

## 작업

### 1) 의존성 설치

```bash
npm install recharts --no-audit --no-fund
```

### 2) 차트 컴포넌트 — `src/components/mdx/Chart.tsx`

```tsx
"use client";

export type ChartKind = "bar" | "line" | "scatter";

export interface ChartSeries {
  key: string;    // data 항목의 필드명
  label: string;  // 범례 표기
}

export interface ChartProps {
  kind: ChartKind;
  data: Record<string, string | number>[];
  xKey: string;              // 가로축으로 쓸 필드명
  series: ChartSeries[];     // 1개 이상
  yLabel?: string;
  height?: number;           // 기본 280
  caption?: string;
}

export default function Chart(props: ChartProps): React.ReactElement;
```

요구 사항:

- 색은 `series` 순서대로 `var(--chart-1)` … `var(--chart-5)` 를 순환 사용한다. **`--color-chart-*` 를 쓰지 마라** (위 함정 참고).
- 축·격자·라벨 색은 `var(--border)` · `var(--muted)` 를 쓴다.
- `ResponsiveContainer` 로 반응형. 컨테이너는 `border border-border rounded-md p-4` (UI_GUIDE 차트 규격).
- 툴팁의 배경·글자색도 토큰을 따른다. Recharts 기본 흰 툴팁이 다크모드에서 튀지 않게 하라.
- `caption` 이 있으면 `<figure>` + `<figcaption>` 으로 감싼다.
- **접근성**: 차트 옆에 원본 수치를 읽을 수 있는 수단을 둔다 (시각장애 사용자용 `<table>` 을 `sr-only` 로 두거나, 접었다 펼 수 있는 표). UI_GUIDE 접근성 규칙 — "차트에 텍스트 요약 또는 원본 표 병기".
- `next/dynamic` 으로 감싸 차트가 있는 페이지에서만 recharts 를 내려받게 한다.
- `series` 가 비었거나 `data` 가 비면 차트 대신 안내 문구를 보여준다 (빈 SVG 로 두지 마라).

`MDX_COMPONENTS` 에 `Chart` 를 등록해 MDX 에서 바로 쓰게 한다.

### 3) 검증용 라우트 확장 — `src/app/mdx-preview/page.tsx`

막대·선 차트를 각각 하나씩 추가한다. **series 를 2개 이상** 두어 색 순환이 실제로 동작하는지 볼 수 있게 하라.

### 4) 테스트 — `src/components/mdx/Chart.test.tsx`

`@testing-library/react` 로:
- `series` 2개를 넘겼을 때 범례 라벨이 모두 렌더되는지
- `data` 가 비었을 때 안내 문구가 나오는지
- 접근성용 수치 표가 존재하는지

주의: jsdom 에는 레이아웃이 없어 `ResponsiveContainer` 가 크기 0 으로 SVG 를 그리지 않을 수 있다. **SVG 내부 요소 개수를 단언하지 말고** 범례·표·안내 문구처럼 DOM 에 확실히 나오는 것을 검증하라. 필요하면 테스트에서 고정 `width`/`height` 를 주는 방식을 쓴다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const c=fs.readFileSync('src/components/mdx/Chart.tsx','utf8');
if(/--color-chart-/.test(c)) throw new Error('치명적: --color-chart-* 사용 — Tailwind v4 트리셰이킹으로 빈 값이 되어 차트가 전부 검정으로 나온다');
if(!/var\(--chart-1\)/.test(c)) throw new Error('원시 차트 변수 var(--chart-1) 를 쓰지 않는다');
if(!/--(border|muted)/.test(c)) throw new Error('축·격자 색에 토큰을 쓰지 않는다');
console.log('차트 색 토큰 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const offenders=walk('src').filter(f=>/\.tsx?$/.test(f) && !/Chart/.test(f) && /from ['\"]recharts/.test(fs.readFileSync(f,'utf8')));
if(offenders.length) throw new Error('Chart 외부에서 recharts 직접 import: '+offenders.join(', '));
console.log('recharts 캡슐화 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 `/mdx-preview` 에서 **반드시 눈으로 확인한다**:
   - **막대·선이 검정이 아닌가?** 검정이면 CSS 변수가 해석되지 않은 것이다 — 위 함정을 다시 읽어라.
   - series 2개가 서로 다른 색인가?
   - 라이트/다크 전환 시 차트 색·축·툴팁이 함께 바뀌는가?
   - 375px 폭에서 차트가 페이지를 밀어내지 않는가?
   - 차트가 없는 페이지(`/`)에서 recharts 청크가 내려오지 않는가?
3. 아키텍처 체크리스트:
   - UI_GUIDE 차트 색 순서(`--chart-1`~`5`)를 지켰는가?
   - 접근성 — 원본 수치를 읽을 수단이 있는가?
   - lazy-load 했는가?
4. `phases/blog-1-content-pipeline/index.json` 의 step 3 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`<Chart>` 의 props 시그니처와 MDX 사용 예시**를 한 줄로 기록. step 4 의 샘플 글이 이 정보만 보고 작성한다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`var(--color-chart-N)` 을 쓰지 마라. 반드시 `var(--chart-N)`.** 이유: Tailwind v4 가 미사용 `@theme` 변수를 제거해 빈 값이 되고, Recharts 는 그걸 조용히 검정으로 칠한다. 빌드는 통과하므로 눈으로 보기 전엔 모른다.
- **차트 색을 hex 로 하드코딩하지 마라.** 이유: 다크모드에서 전환되지 않는다.
- **`Chart.tsx` 외부에서 `recharts` 를 import 하지 마라.** 이유: 캡슐화가 깨지면 lazy-load 경계가 무너진다.
- **step 1·2 의 컴포넌트를 재작성하지 마라.** 테마 전환 감지는 step 2 의 방식을 따르라.
- **샘플 글을 쓰지 마라.** 이유: step 4 의 범위다.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-1-content-pipeline/index.json` 의 step 3 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
