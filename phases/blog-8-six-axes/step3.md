# Step 3: nav-and-frontpage

축을 화면에 세운다. 헤더에 「주제」, 홈에 「여섯 갈래」, 글 상세 데이트라인에 축 한 조각.

## 읽어야 할 파일

- `docs/UI_GUIDE.md` — 「분류 축은 셋이고 색을 쓰는 것은 하나뿐이다」 · 「파격 예산」
- `design/brief.md` — 긴장 축, 시그니처 셋
- `design/components/masthead.html` — 제호·내비의 시각적 정본
- `src/components/layout/SiteHeader.tsx` — **`flex-wrap` 을 일부러 껐다.** 주석을 읽어라
- `src/components/layout/SiteHeader.test.tsx` — **무수정으로 통과해야 한다**
- `src/app/(public)/page.tsx` — 홈. 1면 편집 구조
- `src/components/post/PostHeader.tsx` — 데이트라인
- `src/app/(public)/tags/page.tsx` — 안내 한 줄 추가 대상
- step 0~2 산출물 (summary 참조)

## 작업

### 1) 헤더에 「주제」

`SiteHeader.tsx` 에 **별도 `nav`** 로 넣는다. **`nav[aria-label="카테고리"]` 를 건드리지 마라** —
`SiteHeader.test.tsx` 가 그 nav 의 링크 수를 `CATEGORIES.length` 와 정확히 비교한다.
별도 nav 로 넣으면 기존 테스트가 그대로 통과한다.

```
초록 │ 주제 │ 릴리즈·발표  논문  관측·기록 │ 색인  아카이브 │ 🔍 ☾
     └ nav[aria-label="주제"] (신규)
```

「주제」를 **카테고리보다 앞**에 둔다 — 매체의 약속이 출처보다 앞선다.

step 0 에서 카테고리 이름이 짧아져 글자 예산이 줄었다. **헤더는 여전히 한 줄이어야 한다** —
`flex-wrap` 을 켜지 마라. 좁은 화면에서 토글이 다음 줄로 떨어져 머리가 두 줄이 된다 (실측된 문제).

### 2) 홈에 「여섯 갈래」 구역

`src/app/(public)/page.tsx` 의 카테고리 구역 **아래**, 인기 글 **위**에 넣는다.

**머리기사(`.entry-lead`)와 단신(`.brief-set`)은 손대지 마라.** 시그니처 3(지면당 머리기사 하나)이다.
`md:grid-cols-3` 카테고리 구역도 그대로 둔다 — 카테고리가 안 늘었으므로 고칠 이유가 없다.

새 구역의 규칙:

- **글 제목을 싣지 않는다.** 번호(mono) + 축 이름 + 편수(mono) + 설명 한 줄만.
  이유: 단신 아래에서 제목이 다시 커지면 **급이 거꾸로 선다** (blog-7 이 실측으로 잡은 문제).
- 그리드는 `sm:grid-cols-2 lg:grid-cols-3` (6칸 2행). **카테고리 구역의 `md:grid-cols-3` 을 재사용하지 마라** —
  두 구역이 같아 보이면 안 된다. 하는 일이 다르다 (안내판 vs 목록).
- 편수 0인 축도 싣는다.

### 3) 글 상세 데이트라인에 축

`PostHeader.tsx` 의 `.dateline` 에 축 링크 한 조각을 더한다 (`/topics/{axis}`).
번호는 넣지 않는다 — 데이트라인은 자리가 좁다. 이름만.

`format` 이 있으면 곁줄에 `.kicker` 한 줄로 표시한다 (없으면 아무것도 안 그린다).

### 4) 목록 항목에는 축을 싣지 않는다

`PostTable` · `PostBrief` · `PostIndexRow` 를 **건드리지 마라.**
카테고리 라벨과 축 라벨이 나란히 서면 제목의 왼쪽 끝이 흔들린다 (blog-7 실측).

### 5) `/tags` 안내 한 줄

태그의 역할이 좁아졌다는 것을 적는다 — 주제는 `/topics` 에 따로 있고, 태그는 **모델·툴·기법 이름 전용**이다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const h=fs.readFileSync('src/components/layout/SiteHeader.tsx','utf8');
if(!/topics/.test(h)) throw new Error('헤더에 /topics 링크가 없다');
if(!/aria-label=\"카테고리\"/.test(h)) throw new Error('카테고리 nav 의 aria-label 이 사라졌다 — 기존 테스트가 깨진다');
if(/flex-wrap/.test(h)) throw new Error('헤더에 flex-wrap 이 켜졌다 — 좁은 화면에서 머리가 두 줄이 된다');
console.log('헤더 OK');
"
node -e "
const fs=require('fs');
const p=fs.readFileSync('src/app/(public)/page.tsx','utf8');
if(!/AXES|countByAxis/.test(p)) throw new Error('홈에 여섯 갈래 구역이 없다');
if((p.match(/<PostLead/g)||[]).length!==1) throw new Error('홈의 PostLead 가 1개가 아니다 — 지면당 머리기사는 하나다');
if(!/md:grid-cols-3/.test(p)) throw new Error('카테고리 구역의 md:grid-cols-3 이 사라졌다 — 건드리지 말라고 했다');
if(!/sm:grid-cols-2/.test(p)) throw new Error('축 구역이 카테고리 구역과 같은 그리드를 쓴다 — 두 구역이 같아 보이면 안 된다');
console.log('홈 구성 OK');
"
node -e "
const fs=require('fs');
for(const f of ['src/components/post/PostTable.tsx','src/components/post/PostBrief.tsx','src/components/post/PostIndexRow.tsx']){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  if(/axis|AXES|getAxis/.test(t)) throw new Error(f+' 에 축이 실렸다 — 목록 항목의 부호는 카테고리 하나뿐이다');
}
const ph=fs.readFileSync('src/components/post/PostHeader.tsx','utf8');
if(!/axis/.test(ph)) throw new Error('글 상세 데이트라인에 축이 없다');
if(/text-cat-|CAT_CLASS\[.*axis|--cat-/.test(ph.replace(/category/g,''))) throw new Error('축에 안료를 썼다');
console.log('축 표기 위치 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('src/app').concat(walk('src/components')).filter(f=>/\.tsx$/.test(f)&&!/\.test\./.test(f));
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const n=(t.match(/rule-pair/g)||[]).length;
  if(n>2) throw new Error(f+' 에 rule-pair 가 '+n+'번 있다 — 화면당 최대 2번이다');
}
console.log('괘선 절제 OK');
"
node -e "
const routes=Object.keys(JSON.parse(require('fs').readFileSync('.next/prerender-manifest.json','utf8')).routes||{});
if(!routes.includes('/')) throw new Error('홈이 프리렌더되지 않는다');
if(routes.length<32) throw new Error('프리렌더 경로가 '+routes.length+'개뿐이다');
console.log('정적 생성 유지 OK ('+routes.length+'경로)');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const pages=walk('.next/server/app').filter(f=>/(^|\/)page\.html$/.test(f));
const home=pages.map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/entry-lead/.test(home)) throw new Error('프리렌더 HTML 에 머리기사가 없다');
console.log('머리기사 렌더 확인 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - **`SiteHeader.test.tsx` 가 무수정으로 통과하는가?**
   - 헤더가 한 줄을 유지하는가? (`flex-wrap` 을 켜지 않았는가)
   - **홈에서 급이 계속 내려가는가?** 머리기사 → 단신 → 카테고리 → 여섯 갈래. 축 구역의 최대 글자 급이 바로 위 구역보다 크면 안 된다
   - 목록 항목에 축이 안 실렸는가?
   - 정적 생성이 유지되는가?
3. `phases/blog-8-six-axes/index.json` 의 step 3 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **헤더 nav 구조, 홈 구역 순서, 데이트라인의 축 표기 형태**를 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`nav[aria-label="카테고리"]` 를 건드리지 마라.** 이유: `SiteHeader.test.tsx` 가 링크 수를 `CATEGORIES.length` 와 정확히 비교한다.
- **헤더에 `flex-wrap` 을 켜지 마라.** 이유: 좁은 화면에서 토글이 다음 줄로 떨어져 머리가 두 줄이 된다 (실측).
- **머리기사를 둘 이상 두지 마라.** 이유: 시그니처 3 — 둘이 되면 편집이 아니라 나열이다.
- **축 구역에 글 제목을 싣지 마라.** 이유: 단신 아래에서 제목이 다시 커지면 급이 거꾸로 선다 (blog-7 실측).
- **목록 항목(`PostTable`·`PostBrief`·`PostIndexRow`)에 축을 싣지 마라.** 이유: 제목의 왼쪽 끝이 흔들린다 (blog-7 실측).
- **축에 색을 주지 마라.**
- **`design/` 을 수정하지 마라.**
- **`site.ts`·about 을 건드리지 마라.** step 4 의 몫이다.
- 기존 테스트를 깨뜨리지 마라.
