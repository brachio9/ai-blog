# Step 5: og-and-feed

직렬화 산출물(OG 이미지·RSS·검색 인덱스)에 축을 싣고, **OG 이미지의 색 결함을 고친다.**

## 읽어야 할 파일

- `src/app/(public)/[category]/[slug]/opengraph-image.tsx` — **결함이 여기 있다** (수정 대상)
- `src/app/globals.css` — `--cat-hf`·`--cat-paper`·`--cat-note` 가 지금 무엇을 가리키는지 확인하라
- `design/foundations/color.html` — 안료 3색의 실제 값
- `src/lib/feed.ts` — `SearchDoc` · `buildRssXml`
- `src/app/rss.xml/route.ts` · `src/app/search-index.json/route.ts`
- `src/app/opengraph-image.tsx` — 루트 OG (카테고리를 안 쓴다)
- step 0~4 산출물 (summary 참조)

## 작업

### 1) OG 이미지 색 교정 (**결함 수정**)

`opengraph-image.tsx` 의 `ACCENT_COLOR` 가 지금 이렇다:

```ts
const ACCENT_COLOR: Record<CategoryAccent, string> = {
  hf: "#8a5a00", paper: "#0f6b63", note: "#a8442a",
};
```

**이 값들은 blog-7 이전의 시맨틱 색(`--warning`·`--info`)이다.** 팔레트가 안료로 교체됐는데 이 파일이 안 따라왔다.
현재 `--cat-note` 는 **藍(파랑)** 인데 OG 는 적갈로 나가고, `--cat-paper` 는 草綠(녹색)인데 청록으로 나간다.
주석이 근거로 든 "UI_GUIDE 의 라이트 값"도 blog-7 에서 사라졌다.

**고치는 방법**: `design/foundations/color.html` 과 `globals.css` 의 안료 매핑을 보고,
낮(라이트) 바탕 기준 값으로 세 색을 다시 적는다. OG 카드 배경이 라이트이므로 라이트 값이 맞다.

- `hf` → 朱土 (`--color-accent-2` 계열)
- `paper` → 草綠 (`--color-accent` 계열)
- `note` → 藍 (`--color-accent-3` 계열)

`ImageResponse` 는 앱 CSS 가 닿지 않는 별도 렌더러라 `var()` 를 못 읽는다 — 값을 적는 것 자체는 불가피하다.
**대신 주석에 "이 값의 정본은 `design/styles.css` 의 안료 ramp 다. 팔레트가 바뀌면 여기도 고쳐야 한다"를 남겨라.**
OKLCH 를 그대로 쓸 수 있으면 쓰고, `ImageResponse` 가 못 읽으면 같은 색의 hex 로 변환해 적는다 (변환값을 주석에 근거와 함께).

### 2) OG 이미지에 축 한 줄

카테고리 이름 아래에 축 이름을 작게 넣는다. **번호는 넣지 마라** — OG 카드는 작다.

### 3) 검색 인덱스와 RSS

```ts
// src/lib/feed.ts
export interface SearchDoc {
  // ... 기존
  axis: AxisSlug;
  format?: FormatSlug;
}
```

`buildRssXml` 의 `<item>` 에 `<category>{축 이름}</category>` 를 넣는다.
RSS 리더가 주제로 거를 수 있게 된다.

**기존 글의 URL 은 한 글자도 바뀌면 안 된다.**

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const og=fs.readFileSync('src/app/(public)/[category]/[slug]/opengraph-image.tsx','utf8');
for(const stale of ['#8a5a00','#0f6b63','#a8442a'])
  if(og.includes(stale)) throw new Error('OG 에 옛 시맨틱 색 '+stale+' 이 남아 있다 — 안료로 교체해야 한다');
if(!/ACCENT_COLOR/.test(og)) throw new Error('ACCENT_COLOR 가 사라졌다');
if(!/design\//.test(og)) throw new Error('OG 색의 정본이 design/ 라는 주석이 없다 — 다음에 또 어긋난다');
if(!/axis/.test(og)) throw new Error('OG 에 축이 없다');
console.log('OG 색 교정·축 표기 OK');
"
node -e "
const fs=require('fs');
const f=fs.readFileSync('src/lib/feed.ts','utf8');
if(!/axis/.test(f)) throw new Error('SearchDoc 에 axis 가 없다');
if(!/<category>/.test(f)) throw new Error('RSS item 에 <category> 가 없다');
console.log('feed OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const cand=walk('.next/server/app').filter(f=>/search-index/.test(f));
if(!cand.length) throw new Error('search-index 산출물을 못 찾았다');
const hit=cand.some(f=>/\"axis\"/.test(fs.readFileSync(f,'utf8')));
if(!hit) throw new Error('검색 인덱스 산출물에 axis 가 없다');
console.log('검색 인덱스 OK ('+cand.length+'개 산출물)');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const rss=walk('.next/server/app').filter(f=>/rss/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!rss) throw new Error('RSS 산출물을 못 찾았다');
for(const slug of ['moe-routing-pipeline','open-weight-benchmark-roundup','quantization-notes'])
  if(!rss.includes(slug)) throw new Error('RSS 에서 기존 글 '+slug+' 이 사라졌다');
for(const seg of ['/papers/','/hf-blog/','/notes/'])
  if(!rss.includes(seg)) throw new Error('RSS 의 기존 URL 규약 '+seg+' 이 바뀌었다');
console.log('기존 글 URL 무손상 OK');
"
node -e "
const routes=Object.keys(JSON.parse(require('fs').readFileSync('.next/prerender-manifest.json','utf8')).routes||{});
const posts=routes.filter(r=>/^\/(hf-blog|papers|notes)\/[^/]+$/.test(r));
if(posts.length<8) throw new Error('글 상세 프리렌더가 '+posts.length+'개뿐이다');
const og=routes.filter(r=>/opengraph-image/.test(r));
if(og.length<8) throw new Error('OG 이미지 프리렌더가 '+og.length+'개뿐이다');
if(!routes.includes('/topics')) throw new Error('/topics 가 사라졌다');
console.log('정적 생성 최종 OK ('+routes.length+'경로, 글 '+posts.length+'편)');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - **기존 글 URL 이 RSS·sitemap 에서 한 건도 안 바뀌었는가?**
   - OG 이미지 색이 현재 안료와 맞는가? (`note` 는 파랑이어야 한다)
   - `source.url` 표기가 그대로인가? (CRITICAL)
   - 정적 생성이 유지되는가?
3. `phases/blog-8-six-axes/index.json` 의 step 5 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **교정한 OG 색 세 값과 그 근거, `SearchDoc` 의 새 필드**를 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **기존 글의 URL 을 바꾸지 마라.** 이유: 이미 발행된 주소·RSS·sitemap 이 걸려 있다 (`docs/PRD.md`).
- **OG 색을 임의로 정하지 마라.** 이유: 정본은 `design/styles.css` 의 안료 ramp 다. 지금 어긋난 것이 바로 그렇게 해서 생긴 결함이다.
- **OG 카드에 축 번호를 넣지 마라.** 이유: 카드가 작다. 이름만 넣는다.
- **`design/` 을 수정하지 마라.**
- **화면·스키마를 건드리지 마라.** 이 step 은 직렬화 산출물이다.
- 기존 테스트를 깨뜨리지 마라.
