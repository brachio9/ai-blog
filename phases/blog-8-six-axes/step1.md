# Step 1: frontmatter

`axis`(필수)·`format`(선택)을 스키마에 넣고, 기존 글 9편을 마이그레이션하고,
**관리자 에디터의 데이터 유실 결함을 고친다.** 화면은 건드리지 않는다.

## 읽어야 할 파일

- `docs/PRD.md` — 「분류 축 셋」 절
- `src/lib/content/schema.ts` — frontmatter zod 정본 (수정 대상)
- `src/lib/content/schema.test.ts`
- `src/types/content.ts` — `PostFrontmatter`
- `src/app/admin/editor/draft.ts` — **결함이 여기 있다** (수정 대상)
- `src/app/admin/editor/Editor.tsx` — 폼 (수정 대상)
- `src/app/admin/editor/serialize.ts`
- `content/hf-blog/`·`content/papers/`·`content/notes/` 의 mdx 9편
- step 0 이 만든 `src/lib/axes.ts`·`src/lib/formats.ts` (summary 에 유니온 값이 있다)

## 작업

### 1) 스키마에 두 필드

`src/lib/content/schema.ts` 에서 **`CATEGORY_SLUGS` 와 똑같은 패턴**으로 `AXES`/`FORMATS` 에서 파생한다.
문자열을 다시 적지 마라 — 단일 진실 공급원이 깨진다.

```ts
const AXIS_SLUGS = AXES.map((a) => a.slug) as [AxisSlug, ...AxisSlug[]];
const FORMAT_SLUGS = FORMATS.map((f) => f.slug) as [FormatSlug, ...FormatSlug[]];
```

| 필드 | 자리 | 검증 | 필수 |
|---|---|---|---|
| `axis` | 최상위 | `z.enum(AXIS_SLUGS)` | **필수** |
| `format` | 최상위 | `z.enum(FORMAT_SLUGS)` | 선택 |

`axis` 가 필수인 이유: `/topics` 가 매체의 지도 노릇을 하려면 **6축 편수 합이 전체와 같아야** 한다.
「미분류」를 허용하면 그 칸이 최대가 된다.

`superRefine` 에 규칙 하나 추가:

```
format 이 "replication" 또는 "fieldnote" 인데 category !== "notes" 면 오류
  → "재현 검증·실전 기록은 관측·기록(notes) 카테고리다 — 옮길 원문이 없는 글이다"
```

`src/types/content.ts` 의 `PostFrontmatter` 에도 두 필드를 더한다.

### 2) 관리자 에디터 데이터 유실 결함 수정 (**이 step 의 핵심**)

**지금 `src/app/admin/editor/draft.ts` 에 `lead` 와 `words` 문자열이 하나도 없다.**
`toDraftForm` 과 `toFrontmatterObject` 가 두 필드를 읽지도 쓰지도 않으므로,
`/admin/editor` 로 글을 열어 저장하면 **`lead: true` 와 `source.words` 가 조용히 사라진다.**
「1면 편집」과 「추린 비율」 시그니처가 동시에 죽는다. 둘 다 `.default(false)`/`.optional()` 이라 zod 도 안 잡는다.

`DraftForm` 에 **네 필드**를 추가하고 `toDraftForm`·`toFrontmatterObject` **양쪽**에 배선한다:

| 폼 필드 | frontmatter | 비고 |
|---|---|---|
| `axis` | `axis` | 필수. `newDraft()` 기본값 `AXES[0].slug` |
| `format` | `format` | 선택. 빈 문자열이면 키를 만들지 않는다 |
| `lead` | `lead` | boolean. **지금 유실되고 있다** |
| `sourceWords` | `source.words` | 문자열 폼 → 정수. 빈 값이면 키를 만들지 않는다. **지금 유실되고 있다** |

`Editor.tsx` 의 카테고리 `<select>` 옆에 축 `<select>`(필수)와 포맷 `<select>`(빈 옵션 포함)를 놓고,
`source` 절에 `words` 입력, 상단에 `lead` 체크박스를 놓는다.

### 3) 기존 글 9편 마이그레이션

**모든 글에 `axis` 를 넣는다.** 없으면 빌드가 깨지는 것이 의도된 동작이다.

| 파일 | axis | format |
|---|---|---|
| `content/papers/2026-08-05-moe-routing-pipeline.mdx` | `serving` | `explainer` |
| `content/papers/2026-07-18-sparse-attention-scaling.mdx` | `serving` | `explainer` |
| `content/papers/2026-06-29-long-context-benchmark.mdx` | `retrieval` | `explainer` |
| `content/hf-blog/2026-08-09-open-weight-benchmark-roundup.mdx` | `serving` | `explainer` |
| `content/hf-blog/2026-07-25-inference-endpoints-cli.mdx` | `serving` | (없음) |
| `content/hf-blog/2026-06-14-dataset-viewer-refresh.mdx` | `retrieval` | (없음) |
| `content/notes/2026-08-11-context-caching-draft.mdx` | `serving` | (없음) |
| `content/notes/2026-08-02-quantization-notes.mdx` | `serving` | (없음) |
| `content/notes/2026-07-11-eval-reading-list.mdx` | `agent` | (없음) |

**기존 필드를 건드리지 마라.** 특히 `lead: true` 와 `source.words` 가 있는 글에서 그 값이 그대로 살아 있어야 한다.

9편 중 6편이 `serving` 에 몰리고 `voice`·`domain`·`vibe-coding` 은 0편이 된다. **이건 정상이고 감출 것이 아니다** —
`/topics` 가 "무엇을 더 수집해야 하는지" 를 보여 주는 정보다.

### 4) 테스트

`schema.test.ts` 에 추가: `axis` 없으면 실패 · 모르는 `axis` 값이면 실패 · `format` 없어도 통과 ·
`format: "replication"` + `category: "papers"` 면 실패.

**왕복 무손실 테스트를 반드시 만든다** (`src/app/admin/editor/draft.test.ts`):
실제 `content/papers/2026-08-05-moe-routing-pipeline.mdx` 의 frontmatter 를
`toDraftForm` → `toFrontmatterObject` 로 통과시켜 **`lead`·`source.words`·`axis`·`format` 이 전부 살아 있는지** 검사한다.
이 테스트가 결함 재발을 막는 유일한 장치다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const s=fs.readFileSync('src/lib/content/schema.ts','utf8');
if(!/AXIS_SLUGS/.test(s)) throw new Error('AXIS_SLUGS 파생이 없다');
if(!/FORMAT_SLUGS/.test(s)) throw new Error('FORMAT_SLUGS 파생이 없다');
for(const lit of ['\"retrieval\"','\"serving\"','\"vibe-coding\"'])
  if(s.includes(lit)) throw new Error('schema.ts 에 축 문자열 '+lit+' 이 직접 적혀 있다 — AXES 에서 파생해라');
if(!/replication/.test(s)||!/fieldnote/.test(s)) throw new Error('replication/fieldnote → notes 규칙이 없다');
const t=fs.readFileSync('src/types/content.ts','utf8');
if(!/axis/.test(t)) throw new Error('PostFrontmatter 에 axis 가 없다');
console.log('스키마 OK');
"
node -e "
const fs=require('fs');
const d=fs.readFileSync('src/app/admin/editor/draft.ts','utf8');
for(const k of ['axis','format','lead','words'])
  if(!d.includes(k)) throw new Error('draft.ts 가 '+k+' 를 다루지 않는다 — 에디터 왕복에서 유실된다');
const toForm=(d.match(/toDraftForm[\s\S]*?\n}/)||[''])[0];
const toFm=(d.match(/toFrontmatterObject[\s\S]*?\n}/)||[''])[0];
for(const [fn,src] of [['toDraftForm',toForm],['toFrontmatterObject',toFm]]){
  for(const k of ['axis','lead']) if(!src.includes(k)) throw new Error(fn+' 이 '+k+' 를 다루지 않는다');
  if(!/words/.test(src)) throw new Error(fn+' 이 source.words 를 다루지 않는다');
}
console.log('에디터 왕복 배선 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('content').filter(f=>f.endsWith('.mdx'));
if(files.length<9) throw new Error('글이 '+files.length+'편뿐이다');
const axes={};
let lead=0, words=0;
for(const f of files){
  const fm=fs.readFileSync(f,'utf8').split('---')[1]||'';
  const m=fm.match(/^axis:\s*\"?([a-z-]+)\"?/m);
  if(!m) throw new Error(f+' 에 axis 가 없다');
  axes[m[1]]=(axes[m[1]]||0)+1;
  if(/^lead:\s*true/m.test(fm)) lead++;
  if(/^\s+words:\s*\d+/m.test(fm)) words++;
}
const known=['retrieval','serving','voice','agent','domain','vibe-coding'];
for(const a of Object.keys(axes)) if(!known.includes(a)) throw new Error('모르는 axis: '+a);
if(lead!==1) throw new Error('lead:true 인 글이 '+lead+'편이다 — 1편이어야 한다 (마이그레이션이 지웠을 수 있다)');
if(words!==6) throw new Error('source.words 가 있는 글이 '+words+'편이다 — 6편이어야 한다 (마이그레이션이 지웠을 수 있다)');
console.log('콘텐츠 마이그레이션 OK', JSON.stringify(axes));
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const tests=walk('src').filter(f=>/\.test\.tsx?$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/toDraftForm/.test(tests)||!/toFrontmatterObject/.test(tests)) throw new Error('에디터 왕복 테스트가 없다');
if(!/sourceWords|source\.words|words/.test(tests)) throw new Error('왕복 테스트가 source.words 를 확인하지 않는다');
console.log('왕복 무손실 테스트 존재 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const dirs=fs.readdirSync('content',{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
if(JSON.stringify(dirs)!==JSON.stringify(['hf-blog','notes','papers'])) throw new Error('content/ 디렉토리가 바뀌었다: '+dirs+' — 축은 디렉토리가 아니라 frontmatter 다');
console.log('content 디렉토리 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - **글 본문은 `content/**/*.mdx` 에만 있는가?** (CRITICAL)
   - frontmatter 검증 실패가 **빌드를 깨뜨리는가?**
   - 모든 시각이 KST(`+0900`, 콜론 없음) 인가?
   - `hf-blog`·`papers` 전 글에 `source.url` 이 있는가? (CRITICAL)
   - **`lead`·`source.words` 가 마이그레이션에서 살아남았는가?**
3. `phases/blog-8-six-axes/index.json` 의 step 1 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`DraftForm` 의 새 필드 이름 4개, 축별 글 편수 분포, `superRefine` 에 추가한 규칙**을 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`content/` 아래에 축 디렉토리를 만들지 마라.** 이유: `getAllPosts()` 가 모르는 디렉토리에서 빌드를 깨뜨린다. 축은 파일 위치가 아니라 frontmatter 다.
- **마이그레이션하면서 `lead`·`source.words` 를 지우지 마라.** 이유: 그 둘이 시그니처 두 개의 데이터다. 지금 에디터가 바로 그 짓을 하고 있어서 이 step 에서 고치는 것이다.
- **`axis` 를 선택 필드로 만들지 마라.** 이유: 편수 합이 전체와 달라지면 `/topics` 가 지도 노릇을 못 한다.
- **`axis` 를 배열로 만들지 마라.** 이유: 편수 합이 전체를 넘는다. 부차 주제는 태그가 받는다.
- **schema.ts 에 축·포맷 문자열을 직접 적지 마라.** `AXES`/`FORMATS` 에서 파생한다. 이유: 두 곳에 적으면 반드시 갈라진다.
- **`CategorySlug` · `CategoryAccent` 유니온에 항목을 더하지 마라.** 이유: 이 phase 는 카테고리를 늘리지 않는다. 늘리면 `Record<CategoryAccent,…>` 5곳과 안료 팔레트가 딸려 오는데, 네 번째 안료는 사실상 없다. 어떤 글이 세 카테고리에 안 맞아 보이면 `notes`(관측·기록)를 넓게 읽어라.
- **화면을 건드리지 마라.** 라우트는 step 2, 헤더·홈은 step 3 이다.
- **`design/` 을 수정하지 마라.**
- 기존 테스트를 깨뜨리지 마라.
