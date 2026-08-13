# Step 2: post-index

목록 화면을 카드 그리드에서 **밀집 테이블**로 바꾸고, 첫 화면을 콘텐츠에 돌려준다.
이 phase 에서 방문자가 가장 먼저 체감하는 변화다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — **"목록 (밀집 테이블)" 절이 이 step 의 명세다.** 행 규칙·모바일 접기·조회수 자리까지.
- `/docs/UI_GUIDE.md` — **"균일함을 피하라"** 절. 홈의 세 구역을 똑같이 만들지 마라.
- `/docs/PRD.md` — 핵심 기능 1·2 (첫 화면에서 글이 보여야 한다)
- `/src/lib/categories.ts` — step 0 의 `shortName` · `accent`
- `/src/app/globals.css` — step 1 의 `--cat-*` 토큰
- `/src/components/post/PostCard.tsx` · `PostCard.test.tsx` — **대체 대상**
- `/src/components/post/PostList.tsx` — 페이지네이션·태그 필터가 여기 얽혀 있다
- `/src/components/post/TagFilter.tsx`
- `/src/lib/pagination.ts` — `filterByTag` · `paginate` · `collectTags` · `listHref` (**재사용**)
- `/src/lib/format.ts` — 날짜 포맷
- `/src/app/(public)/page.tsx` · `[category]/page.tsx` · `search/page.tsx`
- `/src/components/search/SearchClient.tsx`

## 측정된 현재 상태 (이 step 이 고쳐야 할 것)

1440×1000 프로덕션에서 잰 값이다.

| 항목 | 지금 | 목표 |
|---|---|---|
| 첫 글까지 거리 | 히어로가 **461px** 점유 | 첫 글이 **스크롤 없이** 보인다 |
| 같은 줄 카드 높이 | 전부 **403px** (커버 있는 글 1건 때문에 늘어남) | 행 높이 **편차 0** |
| 홈 문서 높이 | 8건에 **1919px** | 더 짧아진다 |

## 작업

### 1) `src/components/post/PostTable.tsx`

목록의 기본 단위. UI_GUIDE 의 규격을 그대로 따른다.

```ts
export interface PostTableProps {
  posts: Post[];
  /** 카테고리 페이지 안에서는 구분 열이 불필요하다 */
  showCategory?: boolean;
  /** 논문 목록에서 arXiv ID 를 식별자 열에 보인다 */
  showIdentifier?: boolean;
  /** 조회수 열 자리를 확보할지. step 4 가 채운다 */
  reserveViews?: boolean;
}
```

핵심 불변식:

- **행 높이가 전부 같아야 한다.** 제목은 한 줄로 자르고(`truncate`), 요약을 목록에 넣지 마라. `frontmatter.cover` 를 목록에서 쓰지 마라 — 지금 높이가 들쭉날쭉한 원인이다.
- 행 사이는 `border-b border-border` **하나만.** 박스·그림자·배경 금지.
- 카테고리는 `accent` 키로 색을 고르되 **색만으로 알리지 마라** — `shortName` 라벨을 함께 둔다 (UI_GUIDE 접근성).
- 날짜·조회수는 `tabular-nums`.
- `reserveViews` 가 켜지면 **조회수가 없어도 열 너비를 유지**한다. 나중에 값이 들어와도 레이아웃이 흔들리면 안 된다.
- **모바일(`< md`)에서는 열을 접어** 2줄 블록(제목 / 메타 한 줄)으로 바꾼다. **가로 스크롤을 쓰지 마라.**
- 시맨틱 마크업: 진짜 표(`<table>`)로 하든 리스트로 하든 좋으나, 스크린리더가 열의 의미를 알 수 있어야 한다. 표로 한다면 `<caption>` 또는 `aria-label` 을 붙인다.

### 2) 홈 — `src/app/(public)/page.tsx`

**히어로를 마스트헤드로 줄인다.** 좌측 정렬, 화면 높이의 1/4 이내. `text-6xl` 중앙 정렬을 버린다.

그리고 **세 카테고리 구역을 같은 모양으로 반복하지 마라** (UI_GUIDE "균일함을 피하라"). 구역마다 다루는 방식을 달리한다:

- **최신** — 카테고리 구분 없이 최근 글을 한 테이블로. 홈의 주력이다
- **논문** — `showIdentifier` 로 arXiv ID 를 보인다
- **소식 / 메모** — 더 짧게. 날짜와 제목 위주

정확한 구성은 재량이되 **세 구역이 서로 구분되게** 하라. 판정 기준: 스크린샷을 봤을 때 구역이 같은 틀의 반복으로 보이면 다시 하라.

### 3) 카테고리 페이지 — `[category]/page.tsx`

- 테이블 적용, `showCategory={false}` (이미 그 카테고리 안이다)
- `papers` 면 `showIdentifier`
- 태그 필터·페이지네이션은 **기존 로직을 그대로 재사용**한다 (`src/lib/pagination.ts`). 다시 만들지 마라.
- **`useSearchParams()` + `<Suspense>` 구조를 유지해 정적 생성을 지킨다.** 서버 컴포넌트에서 `searchParams` 를 읽으면 페이지가 동적(`ƒ`)이 되어 SSG 가 사라진다.

### 4) 검색 결과 — `search/page.tsx` · `SearchClient.tsx`

결과 목록도 같은 테이블을 쓴다. 검색 입력 UI 는 유지한다.

### 5) 정리

- `PostCard.tsx` 를 지우고 `PostCard.test.tsx` 도 함께 정리한다.
- `PostList.tsx` 는 페이지네이션·필터 껍데기 역할이 남는다면 유지하고, 카드 렌더 부분만 테이블로 교체한다. 쓰이지 않게 되면 지운다.
- **본인 변경으로 쓰이지 않게 된 import·컴포넌트만** 지운다.

### 6) 테스트

- `src/components/post/PostTable.test.tsx`: 카테고리 라벨이 색과 **함께 텍스트로도** 나오는가 / `showIdentifier` 일 때 arXiv ID 가 보이는가 / 요약이 목록에 렌더되지 않는가 / `reserveViews` 일 때 값 없이도 열이 존재하는가
- 기존 목록 관련 테스트를 새 구조에 맞게 갱신한다

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
if(!fs.existsSync('src/components/post/PostTable.tsx')) throw new Error('PostTable 이 없다');
if(fs.existsSync('src/components/post/PostCard.tsx')) throw new Error('PostCard 가 남아 있다 — 테이블로 대체하기로 했다');
if(fs.existsSync('src/components/post/PostCard.test.tsx')) throw new Error('PostCard.test.tsx 가 남아 있다');
const t=fs.readFileSync('src/components/post/PostTable.tsx','utf8');
if(/frontmatter\.cover|\.cover\b/.test(t)) throw new Error('목록에서 cover 를 쓴다 — 행 높이가 들쭉날쭉해진다');
if(/summary/.test(t)) throw new Error('목록에 요약을 넣었다 — 행 높이가 갈린다');
if(!/shortName/.test(t)) throw new Error('구분 열에 shortName 을 쓰지 않는다');
if(!/tabular/.test(t)) throw new Error('숫자에 tabular-nums 가 없다');
console.log('PostTable 규약 OK');
"
node -e "
const fs=require('fs');
const home=fs.readFileSync('src/app/(public)/page.tsx','utf8');
if(/text-6xl|text-5xl/.test(home)) throw new Error('히어로가 아직 크다 — 첫 화면을 콘텐츠에 돌려줘야 한다');
if(/text-center/.test(home)) throw new Error('중앙 정렬 히어로가 남아 있다 (UI_GUIDE: 좌측 정렬)');
if(!/PostTable/.test(home)) throw new Error('홈이 테이블을 쓰지 않는다');
for (const f of ['src/app/(public)/[category]/page.tsx','src/app/(public)/search/page.tsx']) {
  if(!/PostTable/.test(fs.readFileSync(f,'utf8'))) throw new Error(f+' 가 테이블을 쓰지 않는다');
}
console.log('목록 화면 적용 OK');
"
node -e "
const { execSync } = require('child_process');
const out = execSync('npx next build', { encoding: 'utf8' });
const ssg = (out.match(/● \//g)||[]).length;
if(ssg < 10) throw new Error('정적 생성 페이지가 '+ssg+'건뿐이다 — searchParams 를 서버에서 읽어 SSG 가 깨졌을 가능성');
if(!/Proxy \(Middleware\)/.test(out)) throw new Error('라우트 표에 Proxy 가 없다');
console.log('정적 생성 유지 OK ('+ssg+'건)');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const dead=walk('src').filter(f=>/\.tsx?\$/.test(f)).filter(f=>/PostCard/.test(fs.readFileSync(f,'utf8')));
if(dead.length) throw new Error('PostCard 참조가 남아 있다: '+dead.join(', '));
console.log('죽은 참조 없음');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 **브라우저에서 재본다.** 이 step 은 수치로 판정한다:
   - 1440×1000 에서 **첫 글이 스크롤 없이 보이는가** — `document.querySelector('table, ul')` 의 `getBoundingClientRect().top < window.innerHeight`
   - **행 높이 편차가 0 인가** — 모든 행의 `getBoundingClientRect().height` 가 같은가
   - 홈 문서 높이가 **1919px 보다 줄었는가**
   - 375px 에서 **페이지가 가로로 밀리지 않는가** (표만이 아니라 페이지 전체)
   - 라이트/다크 양쪽에서 카테고리 3색이 구분되는가
3. **"균일함" 눈 점검**: 홈 스크린샷을 보고 세 구역이 같은 틀의 반복으로 보이면 다시 하라.
4. 태그 필터·페이지네이션·검색이 예전처럼 동작하는가 (`?tag=MoE` → 1건).
5. 아키텍처 체크리스트:
   - 글 상세가 여전히 SSG(`●`) 인가? 동적 라우트가 늘지 않았는가?
   - `pagination.ts` 를 재사용했는가, 다시 만들지 않았는가?
6. `phases/blog-6-redesign/index.json` 의 step 2 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`PostTable` props 시그니처, 홈의 구역 구성, 조회수 열 자리 확보 방식**을 한 줄로 기록. step 4 가 그 열을 채운다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **목록에 카드를 쓰지 마라.** UI_GUIDE 금지 항목이다.
- **목록에 요약·커버 이미지를 넣지 마라.** 행 높이가 갈린다.
- **목록에서 가로 스크롤을 쓰지 마라.** 모바일은 열을 접는다.
- **서버 컴포넌트에서 `searchParams` 를 읽지 마라.** 정적 생성이 사라진다.
- **`src/lib/pagination.ts` 의 로직을 다시 구현하지 마라.**
- **조회수를 여기서 가져오지 마라.** step 4 의 범위다. 여기서는 **자리만** 만든다.
- **`src/lib/mdx.ts` · `src/components/mdx/` 를 수정하지 마라** (ADR-003).
- **`content/` 의 글을 수정하지 마라.**
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-6-redesign/index.json` 의 step 2 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
