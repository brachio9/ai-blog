# Step 2: layout-shell

사이트 공통 껍데기를 만든다 — 헤더(카테고리 내비), 푸터, 테마 토글 버튼, 페이지 컨테이너. 개별 페이지의 내용(Intro 히어로, 글 목록 등)은 이후 phase 소관이다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — 레이아웃·컴포넌트·아이콘·애니메이션 규격
- `/docs/PRD.md` — 카테고리 3종 (`hf-blog` · `papers` · `notes`) 과 각 이름
- `/docs/ARCHITECTURE.md` — `src/components/layout/` 계약
- `/src/app/globals.css` — step 1 이 정의한 토큰. 여기 있는 토큰만 쓴다.
- `/src/lib/theme.ts` — step 1 이 만든 테마 규약 헬퍼. **재사용하라. 다시 만들지 마라.**
- `/src/app/layout.tsx` — step 1 이 폰트·테마 스크립트를 붙여둔 루트 레이아웃

## 작업

### 1) 카테고리 설정 — `src/lib/categories.ts`

`PRD.md` 의 카테고리 표를 **단일 진실 공급원**으로 만든다.

```ts
export type CategorySlug = "hf-blog" | "papers" | "notes";

export interface Category {
  slug: CategorySlug;
  name: string;        // 화면 표기 (한글)
  description: string; // 카테고리 페이지 상단 설명
}

export const CATEGORIES: readonly Category[] = [ /* PRD 표 그대로 */ ];
export function getCategory(slug: string): Category | undefined;
```

**핵심 불변식: 카테고리 추가가 이 파일 수정만으로 끝나야 한다.** 내비게이션·푸터 어디에도 카테고리 이름을 하드코딩하지 마라. 전부 `CATEGORIES` 를 순회해서 그린다.

### 2) 레이아웃 컴포넌트 — `src/components/layout/`

| 파일 | 역할 |
|---|---|
| `SiteHeader.tsx` | 사이트 이름(홈 링크) + 카테고리 내비 + 테마 토글. 현재 경로에 해당하는 카테고리를 활성 표시. |
| `SiteFooter.tsx` | 저작권, 출처 정책 한 줄, RSS 링크 자리(아직 링크는 `/rss.xml` 로 걸어두되 파일은 다음 phase 에서 생김) |
| `ThemeToggle.tsx` | `"use client"`. 라이트/다크 전환 버튼. |
| `Container.tsx` | `max-w-6xl mx-auto px-5 md:px-8` 페이지 컨테이너 |

`ThemeToggle` 요구 사항:
- `src/lib/theme.ts` 의 규약을 사용한다 (`localStorage.theme` = `"light"` | `"dark"`).
- 클릭 시 `document.documentElement.classList` 를 토글하고 `localStorage` 에 저장한다.
- **하이드레이션 불일치를 피할 것.** 서버는 현재 테마를 알 수 없다. 마운트 전에는 테마 의존 아이콘을 확정 렌더하지 말고, 중립 상태(또는 `aria-label` 만 있는 자리)로 두었다가 마운트 후 확정하라.
- 아이콘은 인라인 SVG (`strokeWidth 1.5`, `currentColor`). **이모지 금지.**
- `aria-label` 필수.

### 3) 루트 레이아웃 조립 — `src/app/layout.tsx`

`<SiteHeader />` + `<main>` + `<SiteFooter />` 구조로 조립한다. step 1 이 넣은 폰트 변수와 테마 인라인 스크립트는 **그대로 유지**한다 (지우지 마라).

`metadata` 에 `title.template` 을 설정해 하위 페이지가 `제목 | 사이트명` 형태를 갖게 한다.

### 4) 홈 페이지 정리 — `src/app/page.tsx`

step 1 의 토큰 확인용 나열을 지우고, 레이아웃 셸이 붙은 최소 홈으로 바꾼다 (사이트 제목 + 한 줄 소개 + 카테고리 링크 카드 3개 정도). Intro 히어로 완성본은 다음 phase 소관이므로 **과하게 만들지 마라.**

### 5) 테스트

- `src/lib/categories.test.ts` — `CATEGORIES` 가 PRD 의 3개 slug 를 모두 갖는지, `getCategory` 가 미지의 slug 에 `undefined` 를 주는지
- `src/components/layout/SiteHeader.test.tsx` — `@testing-library/react` 로 렌더 후 카테고리 3개 링크가 모두 나오는지. **하드코딩된 이름이 아니라 `CATEGORIES` 를 순회해 검증하라.**

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/lib/categories.ts','src/components/layout/SiteHeader.tsx','src/components/layout/SiteFooter.tsx','src/components/layout/ThemeToggle.tsx','src/components/layout/Container.tsx']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
for (const c of ['SiteHeader','SiteFooter']) {
  const src=fs.readFileSync('src/components/layout/'+c+'.tsx','utf8');
  for (const s of ['hf-blog','papers','notes']) {
    if(src.includes('\"'+s+'\"')||src.includes(\"'\"+s+\"'\")) throw new Error(c+' 에 카테고리 slug 하드코딩: '+s);
  }
}
console.log('레이아웃 컴포넌트 + 카테고리 비하드코딩 OK');
"
node -e "
const fs=require('fs');
const t=fs.readFileSync('src/components/layout/ThemeToggle.tsx','utf8');
if(!/from\s+['\"][^'\"]*lib\/theme['\"]/.test(t)) throw new Error('ThemeToggle 이 src/lib/theme 를 import 하지 않는다 — step1 헬퍼를 재사용해야 한다');
console.log('theme 헬퍼 재사용 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 로 띄워 아래를 눈으로 확인한다:
   - 테마 토글이 실제로 라이트/다크를 바꾸고, 새로고침해도 유지되는가?
   - 다크 상태에서 새로고침할 때 흰 화면이 번쩍이지 않는가?
   - 모바일 폭(375px)에서 헤더가 깨지지 않는가?
3. 아키텍처 체크리스트:
   - `ARCHITECTURE.md` 의 `src/components/layout/` 계약을 따랐는가?
   - `UI_GUIDE.md` 의 모서리 반경 규칙(균일한 `rounded-2xl` 금지)과 애니메이션 허용 목록을 지켰는가?
   - 색을 토큰으로만 썼는가? hex 직접 사용 없음?
   - 카테고리 추가가 `src/lib/categories.ts` 수정만으로 되는가?
4. `phases/blog-0-scaffold/index.json` 의 step 2 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **생성한 컴포넌트 경로와 `CATEGORIES` 계약**을 한 줄로 기록
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **카테고리 이름·slug 를 컴포넌트에 하드코딩하지 마라.** 이유: 카테고리 추가가 설정 한 곳 수정으로 끝나야 한다 (PRD 요구사항).
- **글 목록·글 상세·검색·댓글을 만들지 마라.** 이유: 다음 phase 의 범위다.
- **step 1 이 만든 토큰·폰트·테마 스크립트를 지우거나 바꾸지 마라.** 이유: 그 step 의 산출물이며, 여기서 바꾸면 검증된 동작이 깨진다.
- **이모지를 아이콘으로 쓰지 마라.** 이유: UI_GUIDE 안티패턴.
- **스크롤 트리거 애니메이션·패럴랙스를 넣지 마라.** 이유: UI_GUIDE 애니메이션 허용 목록에 없다.
- 기존 테스트를 깨뜨리지 마라.
