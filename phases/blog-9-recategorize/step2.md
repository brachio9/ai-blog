# Step 2: ui

5칸이 된 카테고리를 화면에 세운다. **데이터는 step 0·1 이 끝냈다** — 여기서는 배치와 문구만 다룬다.

## 읽어야 할 파일

- `docs/UI_GUIDE.md` — 특히 「분류 축은 셋이고…」의 부호 표와 「파격 예산」
- `src/lib/categories.ts` — step 0 이 만든 5칸 (정본. 이름·순서를 여기서 다시 적지 마라)
- `src/components/layout/SiteHeader.tsx` + `SiteHeader.test.tsx`
- `src/app/(public)/page.tsx` — 홈. 카테고리 구역이 `md:grid-cols-3` 이다
- `src/app/(public)/about/page.tsx` — 「어디서 오는가」 절
- `src/app/(public)/[category]/page.tsx` — 카테고리 목록 화면

## 작업

### 1) 헤더 nav — **한 줄을 유지하는 것이 이 step 의 최대 관건**

카테고리 nav 항목이 **3개에서 5개**로 는다. 글자 수 자체는 비슷하지만
(옛 `릴리즈·발표 논문 관측·기록` 13자 / 새 `논문 릴리즈 소식 커뮤니티 기록` 13자)
**항목이 2개 늘어 간격이 두 번 더 들어간다.** 좁은 폭에서 줄바꿈이 날 수 있다.

- `CATEGORIES` 를 순회해서 그려라. 이름을 하드코딩하지 마라.
- **`nav[aria-label="주제"]`(→`/topics`)와 `nav[aria-label="카테고리"]` 의 2-nav 구조를 유지하라.** blog-8 이 세운 것이다
- `flex-wrap` 을 켜서 "해결"하지 마라 — 그건 두 줄을 허용하는 것이다
- 한 줄이 정말 안 되면 **좁은 폭에서 `shortName` 으로 바꾸는 것**을 먼저 검토하라 (`shortName` 이 그 용도로 있다)

**반드시 실측하라.** 추정하지 마라 — 320·375·414·768·1280px 에서 헤더 링크가 단일 행인지,
`scrollWidth === clientWidth`(가로 넘침 없음)인지 브라우저로 직접 재라.
요소 `top` 값을 6px 버킷으로 나눠 판단하면 베이스라인 차이 때문에 오판한다 (blog-8 실측 함정).

### 2) 홈의 카테고리 구역

`md:grid-cols-3` 은 5칸에 맞지 않는다. 3+2 로 어색하게 남는다.
`sm:grid-cols-2 lg:grid-cols-3` 처럼 자연스럽게 흐르는 배치로 바꾸거나,
「여섯 갈래」 구역이 쓰는 방식을 참고하라.

**급(級)이 거꾸로 서면 안 된다.** 홈의 순서는 머리기사 → 단신 → 카테고리 → 여섯 갈래 → 많이 읽힌 글이고,
아래로 갈수록 글자가 작아져야 한다. 카테고리 구역의 최대 글자 급을 **키우지 마라.**

### 3) about 「어디서 오는가」 절

5칸 목록으로 갱신한다. 그리고 **옛 `hf-blog` 유래 문단을 삭제하라** —
"주소는 그대로 두고 이름만 바꿨다"는 설명은 이제 거짓이다(주소를 바꿨다).

대신 **왜 5칸인지**를 한 문단으로 적어라. 사실만 쓴다:
릴리즈 노트와 기업 블로그가 한 칸을 쓰고 있었고 성격이 달라 갈랐다는 것,
그리고 **`기록`(notes)만은 직접 재 보고 만들어 본 글이라 다른 넷과 성격이 다르다**는 것.

### 4) 카테고리 목록 화면 (`[category]/page.tsx`)

`KICKER_ACCENT` 는 step 0 이 값을 채웠다. **먹 2칸에서 kicker 가 읽히는지 눈으로 확인하라** —
안료 3색 기준으로 잡힌 스타일이 무채에서 흐릿하게 보일 수 있다.

## Acceptance Criteria

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

```bash
node -e "const t=require('fs').readFileSync('src/components/layout/SiteHeader.tsx','utf8'); const src=t.replace(/\{\/\*[\s\S]*?\*\/\}/g,'').replace(/\/\*[\s\S]*?\*\//g,''); if(/flex-wrap/.test(src)) throw new Error('flex-wrap 을 켜서 두 줄을 허용했다'); if(!/aria-label=\"주제\"/.test(src)) throw new Error('주제 nav 가 사라졌다'); if(!/aria-label=\"카테고리\"/.test(src)) throw new Error('카테고리 nav 가 사라졌다'); const names=['논문','릴리즈','소식','커뮤니티','기록']; if(names.some(n=>src.includes('\"'+n+'\"'))) throw new Error('카테고리 이름을 하드코딩했다 — CATEGORIES 를 순회하라'); console.log('SiteHeader OK')"
```

> ⚠ 위 검사가 JSX 주석을 먼저 걷어내는 이유: 주석에 `flex-wrap` 같은 단어가 있으면 오탐한다 (blog-8 실측).

```bash
node -e "const t=require('fs').readFileSync('src/app/(public)/about/page.tsx','utf8'); if(t.includes('hf-blog')) throw new Error('about 에 옛 slug 설명이 남아 있다'); if(!t.includes('CATEGORIES')) throw new Error('about 이 CATEGORIES 를 순회하지 않는다'); console.log('about OK')"
```

```bash
node -e "const m=require('./.next/prerender-manifest.json'); const r=Object.keys(m.routes); for(const c of ['/papers','/releases','/news','/community','/notes']) if(!r.includes(c)) throw new Error('프리렌더 안 됨: '+c); console.log('프리렌더 경로 '+r.length+'개, 카테고리 5칸 전부 정적')"
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. **브라우저로 직접 확인한다** (자기보고 금지):
   - 헤더가 320·375·414·768·1280px 에서 **한 줄**인가
   - 홈의 카테고리 구역이 5칸에서 어색하지 않은가, 급이 계속 내려가는가
   - `community`·`notes` 의 먹 라벨이 안료 3칸과 **구분되면서도 읽히는가** (밤 모드 포함)
   - 빈 카테고리(`/releases`·`/community`)가 `.empty` 로 단정하게 그려지는가
3. `phases/blog-9-recategorize/index.json` 의 step 2 를 갱신한다. `summary` 에 **실측한 헤더 폭 결과**를 남겨라.

## 금지사항

- **`categories.ts`·`globals.css`·콘텐츠를 고치지 마라.** 이유: step 0·1 의 산출물이다. 여기서 고치면 정본이 갈린다.
- **카테고리 이름을 컴포넌트에 하드코딩하지 마라.** 이유: `CATEGORIES` 가 단일 진실 공급원이고, 이름이 두 곳에 있으면 반드시 갈린다.
- **`flex-wrap` 으로 헤더 줄바꿈을 허용하지 마라.** 이유: 제호 한 줄은 이 사이트의 시그니처다.
- **목록 항목에 축(`axis`)을 싣지 마라.** 이유: 카테고리 라벨과 나란히 서면 제목 왼쪽 끝이 흔들린다 (blog-7 실측).
- **새 안료를 만들지 마라.** 먹 2칸은 의도된 부호다.
- 기존 테스트를 깨뜨리지 마라. `SiteHeader.test.tsx` 가 깨지면 **테스트가 아니라 구현을 의심하라** — 다만 카테고리 개수를 세는 검사라면 5로 갱신하라.
