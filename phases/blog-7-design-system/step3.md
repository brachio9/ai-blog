# Step 3: entries-and-ratio

목록 항목을 **성격 셋**(머리기사·단신·색인)으로 만들고, 시그니처 **추린 비율**의 목록형을 붙인다.

## 읽어야 할 파일

- `design/brief.md` — 긴장 축 절("화면마다 위치를 고른다"), 시그니처 절
- `design/components/entries.html` — **이 step 의 시각적 정본**
- `design/components/signatures.html` — 후보 01 의 A 형태(데이트라인 한 조각)
- `design/styles.css` — `.entry*` · `.brief-*` · `.index-row` · `.list-tight` · `.list-loose` · `.ratio`
- `src/components/post/PostTable.tsx`
- `src/components/post/PostList.tsx`
- `src/components/post/TagPosts.tsx`
- `src/app/(public)/[category]/page.tsx`
- `src/app/(public)/archive/page.tsx`
- `src/app/(public)/tags/page.tsx`
- `src/app/(public)/search/page.tsx`
- `src/lib/categories.ts` · `src/lib/format.ts`
- step 1 의 `countBodyChars` · `compressionRatio` (summary 에 시그니처가 있다)

## 작업

### 1) 항목 클래스를 `globals.css` 로 가져온다

`design/styles.css` 에서 **정의를 바꾸지 말고** 옮긴다:

`.entry` · `.entry-rail` · `.entry-title` · `.entry-meta` · `.entry-lead` ·
`.brief-set` · `.brief-item` · `.index-row` · `.list-tight` · `.list-loose` ·
`.cat-papers` · `.cat-news` · `.cat-notes` · `.cat-label` · `.tag` · `.ratio`

`--entry-pad` 는 step 0 에서 이미 정의돼 있다.

### 2) 항목 컴포넌트 셋

`src/components/post/` 에 셋을 만든다. **하나로 합치지 마라** — 성격이 다른 것이 요점이다.

```tsx
/** 머리기사 — 지면당 하나. 표제/부제/리드 3단이 전부 들어간다. */
export function PostLead(props: { post: Post; ratio?: RatioInfo | null }): ReactElement;

/** 단신 — 날짜 + 카테고리 + 제목 한 줄. 짧은 것들을 뭉칠 때. */
export function PostBrief(props: { post: Post }): ReactElement;

/** 색인 — 날짜 · 제목 · 구분 3열. 훑어서 되찾는 것이 유일한 목적. */
export function PostIndexRow(props: { post: Post }): ReactElement;
```

`PostTable` 은 **삭제하지 말고** 색인 성격으로 정리하거나 `PostIndexRow` 를 쓰도록 바꾼다.
기존 테스트가 참조하고 있으면 테스트도 함께 옮겨라 — 고아 테스트를 남기지 마라.

**제목의 왼쪽 끝이 흔들리면 안 된다.** 레일 폭(`--rail`)은 항목마다 같아야 한다.
행 높이는 달라도 된다 (옛 지침의 "모든 행 높이가 같아야 한다"는 폐기됐다).

### 3) 추린 비율 — 목록형

`.ratio` 를 `PostLead` 의 데이트라인 안에 한 조각으로 넣는다 (`추림 6:1` 형태).

- 값은 step 1 의 `compressionRatio(post.source?.words, countBodyChars(body))` 로 구한다. **비율 계산을 여기서 다시 만들지 마라.**
- `null` 이면 **아무것도 그리지 않는다.** 자리도 비우지 마라 — 없는 것이 정상인 글이 있다.
- `.ratio-scale`(확장형)은 여기서 쓰지 마라. 기사면 전용이고 step 5 의 몫이다.

### 4) 화면별로 긴장 축 위 위치를 고른다

같은 데이터를 화면마다 다른 밀도로 싣는다.

| 화면 | 성격 | 밀도 |
|---|---|---|
| `/archive` | 색인 | `.list-tight` — 되찾기 전용 |
| `/tags` | 색인 | `.list-tight` |
| `/[category]` | 기본 + 요약 한 줄 | `.list-loose` 로 시작 |
| `/search` | 색인 | 기본 |

**전부 같은 밀도로 만들지 마라.** 화면마다 다른 위치에 서는 것이 이 시스템의 요구다.

### 5) 조회수 자리

조회수는 런타임 값이라 비어 있을 수 있다. **없어도 레이아웃이 흔들리면 안 된다.**
`ViewCounts` 의 배치 조회(`?ids=`)를 그대로 쓴다 — 새 API 를 만들지 마라.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
for(const c of ['.entry','.entry-rail','.entry-title','.entry-lead','.brief-item','.index-row','.list-tight','.list-loose','.ratio','.cat-label'])
  if(!css.includes(c)) throw new Error(c+' 클래스가 globals.css 에 없다');
console.log('항목 클래스 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('src/components/post');
const all=files.map(f=>fs.readFileSync(f,'utf8')).join('');
for(const c of ['PostLead','PostBrief','PostIndexRow']) if(!new RegExp('function\\\\s+'+c+'|const\\\\s+'+c).test(all)) throw new Error(c+' 컴포넌트가 없다');
console.log('항목 컴포넌트 셋 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const all=walk('src').filter(f=>/\.tsx?$/.test(f)&&!/\.test\./.test(f));
const txt=all.map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/compressionRatio/.test(txt)) throw new Error('compressionRatio 를 쓰지 않는다 — 비율을 어딘가에서 다시 계산하고 있을 가능성');
if(/ratio-scale/.test(txt)) throw new Error('.ratio-scale 을 목록 step 에서 쓰고 있다 — 기사면 전용이다 (step 5)');
console.log('비율 단일 출처 OK');
"
node -e "
const fs=require('fs');
const tight=['src/app/(public)/archive/page.tsx','src/app/(public)/tags/page.tsx'];
let found=0;
for(const f of tight){ if(!fs.existsSync(f)) throw new Error(f+' 가 없다'); if(/list-tight/.test(fs.readFileSync(f,'utf8'))) found++; }
if(!found) throw new Error('archive·tags 중 어느 것도 list-tight 를 쓰지 않는다 — 화면마다 밀도가 달라야 한다');
const cat=fs.readFileSync('src/app/(public)/[category]/page.tsx','utf8');
if(/list-tight/.test(cat)) throw new Error('카테고리 화면이 색인 밀도다 — 전부 같은 밀도로 만들지 마라');
console.log('화면별 밀도 배분 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const src=walk('src').filter(f=>/\.tsx?$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('');
if(/PostCard/.test(src)) throw new Error('PostCard 참조가 남아 있다 — 이미 삭제된 컴포넌트다');
console.log('죽은 참조 없음 OK');
"
node -e "
const out=require('child_process').execSync('cat .next/prerender-manifest.json',{encoding:'utf8'});
const n=Object.keys(JSON.parse(out).routes||{}).length;
if(n<25) throw new Error('프리렌더 경로가 '+n+'개뿐이다 — SSG 가 깨졌을 가능성 (서버에서 searchParams 를 읽었는지 확인)');
console.log('정적 생성 유지 OK ('+n+'경로)');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `docs/UI_GUIDE.md` 의 불변 넷을 지켰는가?
   - **제목의 왼쪽 끝이 흔들리지 않는가?** (레일 폭 고정)
   - 공개 페이지가 정적 생성을 유지하는가? 클라이언트에서 `useSearchParams()` + `<Suspense>` 를 쓰는가?
   - 조회수 실패가 글 렌더를 막지 않는가?
   - 목록에서 가로 스크롤이 생기지 않는가?
3. `phases/blog-7-design-system/index.json` 의 step 3 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **세 컴포넌트의 props 시그니처와 파일 경로, 화면별 밀도 배분**을 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **세 컴포넌트를 하나로 합치지 마라.** 이유: 성격이 다른 것이 이 시스템의 요점이다. 무엇을 얼마나 크게 싣는지가 편집이다.
- **비율 계산을 다시 구현하지 마라.** step 1 의 `compressionRatio` 만 쓴다. 이유: 두 곳에서 계산하면 반드시 갈라진다.
- **`.ratio-scale`(확장형)을 목록에서 쓰지 마라.** 이유: 기사면 전용이고, 한 화면에 한 번이라야 뜻이 산다.
- **비율이 `null` 일 때 자리를 비워 두지 마라.** 이유: `source` 없는 글은 비율이 없는 것이 정상이다.
- **화면을 전부 같은 밀도로 만들지 마라.** 이유: 두 화면을 나란히 놨는데 구분이 안 되면 실패다 (`design/brief.md` 실패 신호).
- **목록을 카드 그리드로 만들지 마라.** 이유: 밀도가 죽고 높이가 들쭉날쭉해진다. 실측에서 같은 줄 카드가 전부 403px 로 늘어난 적이 있다.
- **`design/` 아래 파일을 수정하지 마라.**
- **홈 화면(`src/app/(public)/page.tsx`)을 건드리지 마라.** step 4 의 몫이다.
- 기존 테스트를 깨뜨리지 마라.
