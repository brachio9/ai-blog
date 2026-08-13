# Step 0: identity

사이트 이름을 **초록**으로 바꾸고, 대표 문구를 다시 쓰고, 흩어진 아이콘을 한 곳으로 모은다.
색·레이아웃은 다음 step 들 소관이다. 이 step 은 **이름·문구·아이콘만** 건드린다.

## 읽어야 할 파일

- `/docs/PRD.md` — 사이트 이름의 뜻, 카테고리 표(긴 이름 / 짧은 이름), 신설 페이지 목록
- `/docs/UI_GUIDE.md` — **"균일함을 피하라"** 절과 **문구 판정 기준**, 아이콘 규격
- `/CLAUDE.md` — CRITICAL 규칙
- `/src/lib/site.ts` — `SITE_NAME` · `SITE_DESCRIPTION` (현재 "AI 동향 블로그")
- `/src/lib/categories.ts` — `Category` 타입과 `CATEGORIES`
- `/src/components/layout/SiteHeader.tsx` · `SiteFooter.tsx` — **사이트명이 하드코딩돼 있다**
- `/src/app/layout.tsx` — `metadata.title.template`
- `/src/app/(public)/page.tsx` — 히어로 문구
- `/src/app/opengraph-image.tsx` · `/src/app/(public)/[category]/[slug]/opengraph-image.tsx`

## 작업

### 1) `src/lib/site.ts`

- `SITE_NAME` 을 `"초록"` 으로.
- `SITE_DESCRIPTION` 을 다시 쓴다. 지금 문구는 어느 AI 블로그에 붙여도 말이 된다. **무엇을 · 어디서 · 어떤 원칙으로** 다루는지가 들어가야 한다. 특히 **번역이 아니라 요약**이라는 점.
- `SITE_URL` 로직은 건드리지 마라 (배포에 물려 있다).

### 2) 사이트명 하드코딩 제거

`SiteHeader.tsx` 와 `SiteFooter.tsx` 가 문자열을 직접 들고 있다. **`site.ts` 를 읽게 바꿔라.** 이름이 두 군데 이상에 있으면 다음에 또 어긋난다.

`src/app/layout.tsx` 의 `metadata` 도 `SITE_NAME` 을 쓰는지 확인한다.

### 3) `src/lib/categories.ts` — 짧은 이름과 색 키

`Category` 에 두 필드를 추가한다. **slug 은 절대 바꾸지 마라** — 발행된 글 주소·RSS·sitemap 이 걸려 있다.

```ts
export interface Category {
  slug: CategorySlug;
  /** 카테고리 페이지 제목용 (예: "최신 논문") */
  name: string;
  /** 밀집 목록의 구분 열용. 2~3자 (예: "논문") */
  shortName: string;
  /** 색 토큰 키. globals.css 의 --cat-* 와 짝을 이룬다 */
  accent: "hf" | "paper" | "note";
  description: string;
}
```

짧은 이름은 PRD 표를 따른다 (소식 / 논문 / 메모). `description` 도 다시 써라 — "따로 모아둔 개인 스크랩과 메모." 는 무엇을 기대할 수 있는지 알려주지 않는다.

색 값 자체는 여기서 정하지 않는다 (step 1 이 `globals.css` 에 정의한다). 여기서는 **키만** 붙인다.

### 4) 아이콘 단일 출처 — `src/components/ui/icons.tsx`

현재 인라인 SVG 가 **9개 파일에 11개** 흩어져 있다 (`SiteHeader` · `ThemeToggle`×2 · `PostNav` · `TableOfContents` · `TagFilter` · `SearchClient` · `Anchor` · `Callout` · `CopyButton`×2). 각각 따로 그려져 획 두께와 크기가 갈린다.

- 필요한 아이콘을 **하나의 파일에 같은 규격으로 다시 그린다**: 24px viewBox, `strokeWidth 1.5`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`, `stroke="currentColor"`.
- 각 아이콘은 `size` 를 받고 기본 20. `aria-hidden` 을 기본으로 하고, 단독으로 의미를 가질 때만 호출부에서 레이블을 준다.
- 기존 9개 파일이 이 파일에서 가져다 쓰도록 바꾼다. **인라인 SVG 를 남겨 두지 마라.**
- **아이콘 라이브러리를 설치하지 마라** (UI_GUIDE 금지 항목). `package.json` 에 의존성을 추가하지 않는다.

### 5) 대표 문구 다시 쓰기

`src/app/(public)/page.tsx` 의 히어로 문구를 다시 쓴다. **레이아웃은 step 2 가 바꾸므로 여기서는 텍스트만** 손댄다.

판정 기준은 UI_GUIDE 에 있다 — **그 문장을 다른 AI 블로그에 그대로 붙여도 말이 되면 다시 써라.** 구체적인 것을 써라: 어떤 출처를 다루는지, 원문을 어떻게 대하는지.

푸터 문구도 같은 기준으로 본다. 출처 표기 원칙 문장은 지켜야 할 내용이니 유지하되 표현을 다듬어도 된다.

### 6) OG 이미지

`opengraph-image.tsx` 두 개가 사이트명을 그린다. 새 이름이 들어가게 하고, 폰트·색 지정이 하드코딩돼 있으면 step 1 이 토큰을 바꿔도 깨지지 않는지 확인한다. **깨지면 이 step 에서 고쳐라.**

### 7) 테스트

- `src/lib/categories.test.ts` (없으면 신설): 모든 카테고리가 `shortName`(1~4자)과 `accent` 를 가지며, `accent` 값이 세 종류 안에 있고 **서로 겹치지 않는가**
- `SiteHeader.test.tsx` 가 옛 사이트명을 단정하고 있으면 갱신한다

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const site=fs.readFileSync('src/lib/site.ts','utf8');
if(!/초록/.test(site)) throw new Error('site.ts 에 새 사이트명이 없다');
for (const f of ['src/components/layout/SiteHeader.tsx','src/components/layout/SiteFooter.tsx']) {
  const s=fs.readFileSync(f,'utf8');
  if(/AI 동향 블로그/.test(s)) throw new Error(f+' 에 옛 사이트명이 하드코딩돼 있다');
  if(!/SITE_NAME/.test(s)) throw new Error(f+' 이 site.ts 의 SITE_NAME 을 쓰지 않는다');
}
console.log('사이트명 단일 출처 OK');
"
node -e "
const fs=require('fs');
if(!fs.existsSync('src/components/ui/icons.tsx')) throw new Error('아이콘 단일 출처 파일이 없다');
const icons=fs.readFileSync('src/components/ui/icons.tsx','utf8');
const strokes=[...icons.matchAll(/strokeWidth=[{\"]([0-9.]+)/g)].map(m=>m[1]);
const uniq=[...new Set(strokes)];
if(uniq.length>1) throw new Error('아이콘 획 두께가 여러 개다: '+uniq.join(', '));
console.log('아이콘 파일 OK (획 두께 '+(uniq[0]||'미지정')+')');
"
node -e "
const fs=require('fs'), path=require('path');
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?walk(p):/\.tsx\$/.test(e.name)&&files.push(p);}})('src');
const ICONS=path.join('src','components','ui','icons.tsx');
const OG=/opengraph-image/;
const offenders=files.filter(f=>f!==ICONS&&!OG.test(f)&&/<svg/.test(fs.readFileSync(f,'utf8')));
if(offenders.length) throw new Error('아이콘이 아직 흩어져 있다: '+offenders.join(', '));
console.log('인라인 SVG 가 icons.tsx 하나로 모임');
"
node -e "
const fs=require('fs');
const c=fs.readFileSync('src/lib/categories.ts','utf8');
for (const k of ['shortName','accent']) if(!c.includes(k)) throw new Error('categories.ts 에 '+k+' 가 없다');
for (const slug of ['hf-blog','papers','notes']) if(!c.includes(slug)) throw new Error('slug '+slug+' 이 사라졌다 — 발행된 글 주소가 깨진다');
console.log('카테고리 확장 OK (slug 보존)');
"
node -e "
const pkg=require('./package.json');
const deps={...pkg.dependencies,...pkg.devDependencies};
for (const bad of ['lucide-react','@heroicons/react','react-icons','@phosphor-icons/react','feather-icons']) {
  if(deps[bad]) throw new Error('아이콘 라이브러리를 설치했다: '+bad+' (UI_GUIDE 금지)');
}
console.log('아이콘 라이브러리 없음 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 **눈으로 확인한다**:
   - 헤더·푸터·탭 제목·OG 이미지에 새 이름이 나오는가
   - 아이콘들의 **획 두께와 크기가 자리마다 같아 보이는가** (검색·테마·목차·이전글·복사)
   - 문구를 소리 내어 읽어 보라. 다른 AI 블로그에 붙여도 말이 되면 다시 써라
3. 아키텍처 체크리스트:
   - slug 이 그대로인가? (`/papers/moe-routing-pipeline` 이 여전히 200 인가)
   - 사이트명이 `site.ts` 한 곳에만 있는가?
   - 아이콘 라이브러리를 설치하지 않았는가?
4. `phases/blog-6-redesign/index.json` 의 step 0 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **새 사이트명·문구, `Category` 의 새 필드 시그니처, `icons.tsx` 가 노출하는 아이콘 이름 목록**을 한 줄로 기록. 다음 step 들이 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **카테고리 slug 을 바꾸지 마라.** 발행된 글 주소·RSS·sitemap·Giscus 매핑이 전부 걸려 있다.
- **색·레이아웃·폰트를 건드리지 마라.** step 1~5 의 범위다. 이 step 은 이름·문구·아이콘만이다.
- **아이콘 라이브러리를 설치하지 마라.**
- **`src/lib/mdx.ts` · `src/components/mdx/` 의 렌더 동작을 바꾸지 마라** (ADR-003). `Anchor`·`Callout`·`CopyButton` 은 아이콘 참조만 바꾼다.
- **`content/` 의 글을 수정하지 마라.**
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-6-redesign/index.json` 의 step 0 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라 (271개).
