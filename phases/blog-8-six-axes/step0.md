# Step 0: axes

주제 축(6개)과 발행 포맷(5개)을 데이터로 정의하고, 카테고리 이름표를 6축 매체에 맞게 바꾼다.
**이 step 은 데이터 정의만 한다. 스키마·화면은 건드리지 않는다.**

## 읽어야 할 파일

- `docs/PRD.md` — 「분류 축 셋」 절이 이 step 의 정본이다. 축 6개·포맷 5개 표를 그대로 옮긴다
- `docs/UI_GUIDE.md` — 「분류 축은 셋이고 색을 쓰는 것은 하나뿐이다」 절
- `src/lib/categories.ts` — 형태 원본이자 수정 대상
- `src/lib/categories.test.ts` — 무엇이 고정돼 있는지
- `src/app/globals.css` — 안료가 셋뿐임을 확인만 하라 (수정 대상 아님)

## 작업

### 1) `src/lib/axes.ts` — 주제 축

`categories.ts` 와 **같은 형태**로 만든다. 단일 진실 공급원이고, `docs/PRD.md` 의 표를 그대로 옮긴다.

```ts
export type AxisSlug =
  | "retrieval" | "serving" | "voice" | "agent" | "domain" | "vibe-coding";

export interface Axis {
  slug: AxisSlug;
  /** 목차 번호. 화면에는 mono 두 자리('01')로 그린다. 안료가 아니라 이것이 축의 부호다. */
  order: number;
  name: string;
  /** 2~4자. 헤더·목록의 좁은 자리용 */
  shortName: string;
  /** 글이 0편이어도 이 문장이 매체의 약속을 싣는다 */
  description: string;
  /** 화면에 보여 줄 대표 키워드 6~10개. 필터용이 아니다 */
  covers: readonly string[];
}

export const AXES: readonly Axis[];
export function axisHref(axis: Axis): string;      // `/topics/${axis.slug}`
export function getAxis(slug: string): Axis | undefined;
```

**`accent` 필드를 만들지 마라.** 이 phase 전체가 그 위에 서 있다 — 축이 색을 안 쓰기 때문에 안료 예산도,
`Record<CategoryAccent,…>` 5곳도, `@theme inline` 도 건드리지 않는다.

`description` 은 직접 쓴다. 각 축이 무엇을 다루는지 한두 문장으로, 구체적으로. 원본 설계서의 키워드 목록을
`covers` 에 6~10개씩 넣어라 (예: `retrieval` → late chunking, 리랭킹, 하이브리드 검색, GraphRAG, 인용 충실도 …).

### 2) `src/lib/formats.ts` — 발행 포맷

같은 형태. **`href` 는 만들지 마라** — 포맷은 라우트가 없다.

```ts
export type FormatSlug = "explainer" | "digest" | "replication" | "kr-first" | "fieldnote";
export interface Format { slug: FormatSlug; name: string; description: string }
export const FORMATS: readonly Format[];
export function getFormat(slug: string): Format | undefined;
```

### 3) `src/lib/categories.ts` — 이름표 3개만 교체

`CATEGORIES` 배열의 `name`·`shortName`·`description` 만 고친다.
**`CategorySlug`·`CategoryAccent` 유니온, `CAT_CLASS`, `categoryHref`, `getCategory` 는 한 글자도 건드리지 마라.**

| slug | name | shortName |
|---|---|---|
| `hf-blog` | 릴리즈·발표 | 소식 |
| `papers` | 논문 | 논문 |
| `notes` | 관측·기록 | 관측 |

`description` 은 `docs/PRD.md` 의 「카테고리」 표 성격 열을 풀어 쓴다. 특히 `notes` 는
"묶기 전 스크랩" 이 아니라 **"커뮤니티에서 관측한 것과 직접 해 본 것"** 으로 넓어졌다는 것이 드러나야 한다.

### 4) `RESERVED_SEGMENTS` — 라우트 충돌 방지

`categories.ts` 에 예약어 목록을 두고, 카테고리 slug 이 여기 들어가면 안 된다는 것을 테스트로 강제한다.

```ts
/** 정적 라우트가 점유한 최상위 세그먼트. 카테고리 slug 이 이 중 하나면 그 카테고리는 도달 불가능해진다. */
export const RESERVED_SEGMENTS: readonly string[];
```

`topics` · `tags` · `archive` · `about` · `search` · `admin` · `api` · `rss.xml` · `sitemap.xml` · `search-index.json` 을 포함한다.
지금은 잠재 위험이지만 카테고리가 바뀌는 순간 실사고가 된다.

### 5) 테스트

`src/lib/axes.test.ts` · `src/lib/formats.test.ts` 를 만든다. `categories.test.ts` 와 같은 종류로:

- `AXES.length === 6`, `FORMATS.length === 5`
- slug 중복 없음, `order` 가 1..6 연속
- `shortName` 길이 1~4
- `getAxis` 가 없는 slug 에 `undefined`
- **`AXES` 의 어떤 항목에도 `accent` 키가 없다** — 축은 색을 쓰지 않는다

`categories.test.ts` 에는 예약어 충돌 검사를 추가한다 (기존 검사는 건드리지 마라 — 3-slug 정확일치는 그대로 통과해야 한다).

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for(const f of ['src/lib/axes.ts','src/lib/formats.ts','src/lib/axes.test.ts','src/lib/formats.test.ts'])
  if(!fs.existsSync(f)) throw new Error(f+' 가 없다');
const a=fs.readFileSync('src/lib/axes.ts','utf8');
for(const s of ['retrieval','serving','voice','agent','domain','vibe-coding'])
  if(!a.includes('\"'+s+'\"')) throw new Error('축 '+s+' 이 없다');
if(/accent/i.test(a)) throw new Error('axes.ts 에 accent 가 있다 — 축은 색을 쓰지 않는다 (안료는 카테고리 전용)');
if(/--cat-|text-cat-/.test(a)) throw new Error('axes.ts 가 카테고리 색 토큰을 참조한다');
const f=fs.readFileSync('src/lib/formats.ts','utf8');
for(const s of ['explainer','digest','replication','kr-first','fieldnote'])
  if(!f.includes('\"'+s+'\"')) throw new Error('포맷 '+s+' 이 없다');
if(/Href|href/.test(f)) throw new Error('formats.ts 에 href 가 있다 — 포맷은 라우트가 없다');
console.log('축·포맷 정의 OK');
"
node -e "
const fs=require('fs');
const c=fs.readFileSync('src/lib/categories.ts','utf8');
const union=(c.match(/export type CategorySlug[\s\S]*?;/)||[''])[0];
for(const s of ['hf-blog','papers','notes']) if(!union.includes(s)) throw new Error('CategorySlug 에서 '+s+' 이 사라졌다');
if(/\|\s*\"(?!hf-blog|papers|notes)/.test(union.replace(/CategorySlug/,''))) throw new Error('CategorySlug 에 새 slug 이 추가됐다 — 이 phase 는 카테고리를 늘리지 않는다');
const acc=(c.match(/export type CategoryAccent[\s\S]*?;/)||[''])[0];
if(!/\"hf\"/.test(acc)||!/\"paper\"/.test(acc)||!/\"note\"/.test(acc)) throw new Error('CategoryAccent 가 바뀌었다');
if((acc.match(/\"/g)||[]).length!==6) throw new Error('CategoryAccent 항목 수가 3이 아니다');
for(const n of ['릴리즈·발표','관측·기록']) if(!c.includes(n)) throw new Error('새 카테고리 이름 '+n+' 이 없다');
if(!c.includes('RESERVED_SEGMENTS')) throw new Error('RESERVED_SEGMENTS 가 없다');
for(const r of ['topics','tags','archive','about','search','admin','api'])
  if(!c.includes('\"'+r+'\"')) throw new Error('예약어 '+r+' 이 RESERVED_SEGMENTS 에 없다');
console.log('카테고리 이름표·예약어 OK');
"
node -e "
const fs=require('fs');
const t=fs.readFileSync('src/lib/categories.test.ts','utf8');
if(!/toEqual\(\[\s*\"hf-blog\",\s*\"papers\",\s*\"notes\"\s*\]\)/.test(t.replace(/\s+/g,' ').replace(/ /g,''))
   && !/hf-blog[\s\S]{0,40}papers[\s\S]{0,40}notes/.test(t)) throw new Error('기존 3-slug 정확일치 검사가 사라졌다');
if(!/RESERVED_SEGMENTS/.test(t)) throw new Error('예약어 충돌 검사가 추가되지 않았다');
console.log('기존 계약 유지 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const app=walk('src/app').concat(walk('src/components')).filter(f=>/\.tsx?$/.test(f));
for(const f of app){ if(/from \"@\/lib\/axes\"|from \"@\/lib\/formats\"/.test(fs.readFileSync(f,'utf8')))
  throw new Error(f+' 가 벌써 axes/formats 를 쓴다 — step 0 은 데이터 정의만이다'); }
const css=fs.readFileSync('src/app/globals.css','utf8');
const before=(css.match(/--color-accent-3-500/g)||[]).length;
if(!before) throw new Error('안료 ramp 가 사라졌다');
if(/--color-accent-4|--cat-[a-z]+:\s*var\(--color-accent-4/.test(css)) throw new Error('네 번째 안료를 만들었다');
console.log('경계 준수 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `docs/PRD.md` 의 「분류 축 셋」 표와 `axes.ts`·`formats.ts` 의 값이 일치하는가?
   - **`CategorySlug`·`CategoryAccent` 가 그대로인가?** (이 phase 는 카테고리를 늘리지 않는다)
   - **축에 색을 주지 않았는가?** (`docs/UI_GUIDE.md`)
   - 테스트가 `src/**/*.test.{ts,tsx}` 에 있는가?
3. `phases/blog-8-six-axes/index.json` 의 step 0 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`AxisSlug`·`FormatSlug` 유니온 값, `AXES`/`FORMATS` 의 export 시그니처, 바뀐 카테고리 이름표 3개, `RESERVED_SEGMENTS` 내용**을 기록. 다음 step 들이 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`CategorySlug` · `CategoryAccent` 유니온에 항목을 더하지 마라.** 이유: `Record<CategoryAccent,…>` 5곳과 안료 팔레트가 전부 딸려 온다. 네 번째 안료는 사실상 없다.
- **축에 `accent` 를 주지 마라.** 이유: 축의 부호는 번호(mono)다. 새 이름으로 `text-cat-xxx` 를 쓰면 Tailwind v4 가 `@theme` 에 없는 클래스를 안 만들어 조용히 무색이 된다.
- **`src/app/globals.css` 와 `design/` 을 수정하지 마라.** 이유: 이 step 은 색을 건드릴 이유가 없다. 디자인이 정본이고 앱이 따라온다.
- **화면·스키마를 건드리지 마라.** 이 step 은 데이터 정의만이다. 스키마는 step 1, 라우트는 step 2, 화면은 step 3 이다.
- **`categories.test.ts` 의 기존 검사를 지우거나 완화하지 마라.** 이유: 3-slug 정확일치가 카테고리 확장을 막는 안전망이다.
- 기존 테스트를 깨뜨리지 마라.
