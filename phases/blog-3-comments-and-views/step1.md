# Step 1: comments

글 상세 페이지에 Giscus 댓글을 붙인다. 서버·DB 없이 GitHub Discussions 에 저장된다.

## 읽어야 할 파일

- `/docs/ADR.md` — **ADR-004 (댓글은 Giscus)**
- `/CLAUDE.md` — 환경변수 이름 표 (`NEXT_PUBLIC_GISCUS_*`)
- `/docs/UI_GUIDE.md` — 색 토큰·애니메이션 규칙
- `/src/lib/theme.ts` — `DARK_CLASS` · `THEME_STORAGE_KEY`. **재사용하라.**
- `/src/components/mdx/Diagram.tsx` — step 이전 phase 의 클라이언트 컴포넌트. **테마 전환 감지(`MutationObserver`) 방식을 그대로 따라 하라** — 같은 문제를 두 방식으로 풀지 마라.
- `/src/app/(public)/[category]/[slug]/page.tsx` — 댓글을 붙일 글 상세 페이지
- `/src/components/post/ViewCount.tsx` — step 0 산출물. 환경변수 없을 때 조용히 꺼지는 패턴을 참고하라.
- `/.env.example` — Giscus 환경변수 4종

## 배경 (확인된 사실 — 다시 조사하지 마라)

- `.env.local` 에 Giscus 값 4종이 이미 채워져 있고 **검증을 마쳤다**: 레포는 public, GitHub Discussions 활성화됨, `NEXT_PUBLIC_GISCUS_REPO_ID` 는 `R_` 로, `NEXT_PUBLIC_GISCUS_CATEGORY_ID` 는 `DIC_` 로 시작한다.
- Giscus 는 `<script src="https://giscus.app/client.js">` 를 삽입하면 그 자리에 iframe 을 만든다. `data-*` 속성으로 설정을 넘긴다.

**⚠ 테마 전환 함정:** 스크립트에 넘긴 `data-theme` 을 나중에 바꿔도 **이미 만들어진 iframe 은 반응하지 않는다.** React prop 을 바꾸는 것으로도 안 된다. 반드시 iframe 에 postMessage 를 보내야 한다:

```js
const iframe = document.querySelector("iframe.giscus-frame");
iframe?.contentWindow?.postMessage(
  { giscus: { setConfig: { theme } } },
  "https://giscus.app",
);
```

iframe 이 로드되기 전에 보내면 무시되므로 **로드 이후에 보내라.**

## 작업

### 1) 댓글 컴포넌트 — `src/components/post/Comments.tsx`

```tsx
"use client";
export function Comments(): React.ReactElement | null;
```

요구 사항:

- 환경변수 4종(`NEXT_PUBLIC_GISCUS_REPO` · `_REPO_ID` · `_CATEGORY` · `_CATEGORY_ID`) 중 **하나라도 없으면 `null` 을 반환**한다. 에러를 던지지 마라. 이유: 환경변수 없이도 사이트가 돌아가야 한다 (step 0 의 `ViewCount` 와 같은 원칙).
- 스크립트를 `useEffect` 안에서 컨테이너 `<div>` 에 삽입한다. 설정:
  - `data-repo` · `data-repo-id` · `data-category` · `data-category-id` — 환경변수에서
  - `data-mapping="pathname"` — 글 URL 로 Discussion 을 매칭한다
  - `data-reactions-enabled="1"`
  - `data-emit-metadata="0"`
  - `data-input-position="top"`
  - `data-lang="ko"`
  - `data-loading="lazy"`
  - `crossorigin="anonymous"`, `async`
- **테마 동기화**:
  - 초기 `data-theme` 은 현재 테마(`document.documentElement.classList.contains(DARK_CLASS)`)로 정한다. `light` / `dark` 프리셋을 쓴다.
  - `MutationObserver` 로 `document.documentElement` 의 `class` 변화를 감지해 위 postMessage 로 iframe 테마를 바꾼다.
  - **`src/lib/theme.ts` 의 `DARK_CLASS` 상수를 쓰라.** 문자열 `"dark"` 를 직접 적지 마라.
- **정리(cleanup)**: 언마운트 시 `MutationObserver` 를 해제하고 컨테이너를 비운다. 이유: 글 사이를 이동할 때 iframe 이 중복 삽입되면 댓글이 두 벌 나온다.
- 로딩 중 자리를 확보해 **댓글이 뜰 때 페이지가 크게 밀리지 않게** 하라.

### 2) 글 상세 페이지에 연결

`src/app/(public)/[category]/[slug]/page.tsx` 의 **이전/다음 글 아래**, 본문과 시각적으로 구분되게 배치한다.

- 구분선과 "댓글" 제목을 둔다.
- 본문 단폭(`max-w-[68ch]`)과 정렬을 맞춘다.
- **페이지가 여전히 `●`(SSG) 여야 한다.**

### 3) 환경변수 접근 정리 — `src/lib/giscus.ts`

```ts
export interface GiscusConfig {
  repo: string; repoId: string; category: string; categoryId: string;
}
/** 환경변수가 하나라도 비면 null. */
export function getGiscusConfig(): GiscusConfig | null;
```

`NEXT_PUBLIC_*` 는 빌드 타임에 인라인되므로 **`process.env.NEXT_PUBLIC_GISCUS_REPO` 처럼 전체 이름을 문자열로 직접 적어야 한다.** `process.env[변수명]` 같은 동적 접근은 번들러가 치환하지 못해 `undefined` 가 된다.

### 4) 테스트 — `src/lib/giscus.test.ts`

- 환경변수가 전부 있으면 설정 객체를 반환
- 하나라도 비면 `null`
- 빈 문자열도 없는 것으로 취급

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/components/post/Comments.tsx','src/lib/giscus.ts','src/lib/giscus.test.ts']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
const c=fs.readFileSync('src/components/post/Comments.tsx','utf8');
if(!/giscus\.app/.test(c)) throw new Error('giscus 스크립트를 삽입하지 않는다');
if(!/postMessage/.test(c)) throw new Error('테마 동기화 postMessage 가 없다 — 다크 전환 시 댓글창만 흰색으로 남는다');
if(!/MutationObserver/.test(c)) throw new Error('테마 변화 감지가 없다');
if(!/DARK_CLASS/.test(c)) throw new Error('src/lib/theme.ts 의 DARK_CLASS 를 재사용하지 않는다');
if(!/disconnect\(/.test(c)) throw new Error('MutationObserver 정리(cleanup)가 없다 — 글 이동 시 누수·중복');
const g=fs.readFileSync('src/lib/giscus.ts','utf8');
if(!/process\.env\.NEXT_PUBLIC_GISCUS_REPO\b/.test(g)) throw new Error('NEXT_PUBLIC_ 변수를 전체 이름으로 직접 적지 않았다 — 번들에서 undefined 가 된다');
console.log('댓글 구조 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk('.next/server/app').filter(f=>f.endsWith('.html') && /(hf-blog|papers|notes)\//.test(f));
if(html.length < 8) throw new Error('글 상세 정적 생성이 깨졌다: '+html.length+'건 (기대 8건)');
console.log('글 상세 정적 생성 유지 OK ('+html.length+'건)');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run build` Route 표에서 글 상세가 `●`(SSG) 인지 확인한다.
3. `npm run start` 후 브라우저로 확인한다 (`.env.local` 에 Giscus 값이 채워져 있다):
   - **댓글창이 실제로 뜨는가?** (GitHub 로그인 버튼이 보이면 정상)
   - **테마를 다크로 바꾸면 댓글창도 함께 어두워지는가?** 이게 이 step 의 핵심 확인 지점이다. 안 바뀌면 postMessage 가 동작하지 않은 것이다.
   - 글 A → 글 B 로 이동했을 때 **댓글창이 두 개 생기지 않는가?** 각 글의 댓글이 따로 매칭되는가?
   - 375px 폭에서 댓글창이 페이지를 밀어내지 않는가?
   - 조회수(step 0)가 여전히 정상 동작하는가?
4. **환경변수 없이도 동작하는지 확인하라.** `.env.local` 은 **절대 편집하지 마라** — 사용자의 실제 자격증명이 들어 있다. 셸에서 빈 값으로 덮어써서 확인한다:
   ```bash
   NEXT_PUBLIC_GISCUS_REPO= NEXT_PUBLIC_GISCUS_REPO_ID= npm run build
   ```
   빌드가 성공하고 글 페이지가 정상 생성되면 통과다 (댓글 영역만 사라지는 게 정상). 이 경로는 `src/lib/giscus.test.ts` 로도 반드시 덮어야 한다.
5. 아키텍처 체크리스트:
   - ADR-004 — 자체 댓글 저장소를 만들지 않았는가? Turso 에 댓글을 넣지 않았는가?
   - `src/lib/theme.ts` 를 재사용했는가? `"dark"` 문자열 하드코딩 없음?
   - UI_GUIDE 애니메이션·안티패턴 준수?
6. `phases/blog-3-comments-and-views/index.json` 의 step 1 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`Comments` 배치 위치, `getGiscusConfig()` 시그니처, 테마 동기화 방식, mapping 규약**을 한 줄로 기록
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`data-theme` 만 바꿔서 테마를 전환하려 하지 마라.** 이유: 이미 만들어진 iframe 은 반응하지 않는다. 반드시 `postMessage({giscus:{setConfig:{theme}}})` 를 쓴다.
- **`"dark"` 문자열을 직접 적지 마라.** `src/lib/theme.ts` 의 `DARK_CLASS` 를 쓴다.
- **`process.env[동적키]` 로 `NEXT_PUBLIC_*` 에 접근하지 마라.** 이유: 번들러가 치환하지 못해 `undefined` 가 된다. 전체 이름을 문자열로 적어야 한다.
- **`MutationObserver` 정리를 빠뜨리지 마라.** 이유: 글 사이 이동 시 댓글창이 중복 생성된다.
- **댓글을 Turso 나 자체 저장소에 넣지 마라.** 이유: ADR-004 · ADR-002.
- **환경변수가 없다고 예외를 던지거나 빌드를 실패시키지 마라.** 조용히 꺼져야 한다.
- **서버 컴포넌트에서 댓글을 렌더하려 하지 마라.** 이유: 글 상세의 정적 생성이 무너진다.
- **step 0 의 조회수 코드를 수정하지 마라.** 동작하면 그대로 둔다.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-3-comments-and-views/index.json` 의 step 1 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
