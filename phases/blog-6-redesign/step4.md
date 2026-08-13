# Step 4: data-surfacing

이미 가지고 있는 데이터를 화면에 드러낸다 — 조회수, 카테고리·태그 분포. 없는 데이터를 새로 모으지 않는다.

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — **"조회수·댓글 실패가 글 렌더를 막으면 안 된다"** 가 이 step 의 제1원칙이다
- `/docs/ADR.md` — ADR-002 (Turso 는 휘발성 수치 전용)
- `/CLAUDE.md` — CRITICAL: Turso 에는 조회수 같은 수치만
- `/src/services/turso.ts` — **`getViews(postIds): Promise<Record<string,number>>` 배치 함수가 이미 있다.** `isValidPostId` · `isViewTrackingEnabled` · `mergeViewRows` 도
- `/src/app/api/views/route.ts` — 현재 **단건 조회만** 지원 (`?id=`)
- `/src/components/post/ViewCount.tsx` — 글 상세용 단건 컴포넌트 (기존)
- `/src/components/post/PostTable.tsx` — step 2 가 만들었다. **`reserveViews` prop 을 켜면 조회수 열 자리가 확보된다.** 이 step 이 그 자리를 채운다
- `/src/lib/stats.ts` — step 3 산출물

## 왜 클라이언트가 채우는가 (설계 근거 — 바꾸지 마라)

목록 페이지는 SSG 이고 조회수는 런타임 값이다. 빌드 타임에 Turso 를 읽으면

1. 숫자가 다음 배포까지 고정되고,
2. **Turso 장애가 빌드를 깨뜨린다** — ARCHITECTURE 의 "부가 기능이 본문을 인질로 잡으면 안 된다" 에 정면으로 어긋난다.

그래서 테이블은 조회수 **없이 정적으로** 렌더되고, 클라이언트가 한 번의 배치 호출로 채운다. 실패하면 그 열만 빈 채로 남는다.

## 작업

### 1) 배치 조회 API — `src/app/api/views/route.ts`

기존 `GET ?id=` 를 유지하면서 `GET ?ids=a,b,c` 를 추가한다.

- 응답: `{ views: { "papers/moe-routing-pipeline": 12, ... } }`
- **`isValidPostId` 로 전부 검증**하고, 유효하지 않은 id 는 조용히 버린다 (400 으로 전체를 실패시키지 마라 — 목록 하나가 깨졌다고 열 전체가 사라지면 안 된다).
- **개수 상한을 두어라** (예: 100). 상한을 넘으면 앞의 N개만 처리한다. 이유: 쿼리스트링으로 임의 개수를 받으면 DB 부하가 통제되지 않는다.
- `getViews()` 를 그대로 쓴다. **새 쿼리를 짜지 마라.**
- 조회수 추적이 꺼져 있으면 빈 객체를 200 으로 반환한다. 에러가 아니다.
- `dynamic = "force-dynamic"` 을 유지한다.

### 2) `src/components/post/ViewCounts.tsx` — 목록용 클라이언트 컴포넌트

- `"use client"`. post id 목록을 받아 **한 번만** 배치 호출하고, 받은 값을 각 행에 채운다.
- 값이 오기 전·실패 시에는 **아무것도 그리지 않는다.** 0 을 그리지 마라 — 실제 0회와 구분되지 않는다.
- **레이아웃이 흔들리면 안 된다.** 목록을 그리는 쪽에서 `PostTable` 에 `reserveViews` 를 켜 자리를 먼저 확보하고, 값이 들어와도 폭이 변하지 않는지 확인하라.
- 같은 페이지에서 여러 테이블이 있어도 **호출은 한 번**이 되게 하라 (id 를 모아서 한 번에).
- 글 상세의 기존 `ViewCount.tsx`(단건, 증가 포함)와 **역할을 섞지 마라.** 목록에서는 절대 증가시키지 않는다 — 목록을 보는 것은 조회가 아니다.

### 3) 인기 글

- 조회수 기준 상위 글을 홈이나 아카이브에 보인다. **클라이언트에서 정렬**한다 (데이터가 클라이언트에 온다).
- 데이터가 없으면 **구역 자체를 그리지 않는다.** 빈 상자를 남기지 마라.
- 위치와 형태는 재량이되 UI_GUIDE 의 "균일함을 피하라" 를 지켜라 — 다른 목록과 똑같은 테이블을 하나 더 붙이는 건 피한다.

### 4) 분포 데이터 노출

step 3 의 `stats.ts` 를 써서 **숫자를 보여준다.** 새 데이터를 만들지 마라.

- 카테고리별 글 수 (카테고리 목록·아카이브 상단)
- 태그 빈도 (태그 색인 — step 3 에서 이미 했다면 중복하지 마라)
- 총 글 수·수록 기간

**차트를 새로 그리지 마라.** 본문용 `<Chart>` 는 MDX 전용이다. 여기서는 숫자와 텍스트로 충분하다.

### 5) 테스트

- `src/app/api/views/*.test.ts`: `?ids=` 가 여러 건을 돌려주는가 / 잘못된 id 가 섞여도 나머지가 오는가 / 개수 상한이 걸리는가 / 추적이 꺼졌을 때 200 + 빈 객체인가 / **`getViews` 를 호출하는가** (fetch·DB 모킹)
- `ViewCounts` 의 순수 로직(정렬·병합)을 뽑아낼 수 있으면 테스트한다. 네트워크를 타는 부분은 모킹한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const r=fs.readFileSync('src/app/api/views/route.ts','utf8');
if(!/ids/.test(r)) throw new Error('배치 조회(?ids=)가 없다');
if(!/getViews/.test(r)) throw new Error('services/turso 의 getViews 를 쓰지 않는다 — 쿼리를 새로 짰을 가능성');
if(!/force-dynamic/.test(r)) throw new Error('force-dynamic 이 사라졌다');
if(!/isValidPostId/.test(r)) throw new Error('id 검증이 없다');
console.log('배치 조회 API OK');
"
node -e "
const fs=require('fs');
if(!fs.existsSync('src/components/post/ViewCounts.tsx')) throw new Error('ViewCounts 가 없다');
const v=fs.readFileSync('src/components/post/ViewCounts.tsx','utf8');
if(!/use client/.test(v)) throw new Error('클라이언트 컴포넌트가 아니다');
if(/method:\s*[\"']POST|incrementView/.test(v)) throw new Error('목록에서 조회수를 증가시킨다 — 목록을 보는 것은 조회가 아니다');
console.log('ViewCounts 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const bad=walk('src').filter(f=>/\.tsx?\$/.test(f))
  .filter(f=>!/services|api\/views/.test(f))
  .filter(f=>/@libsql|createClient\(/.test(fs.readFileSync(f,'utf8')));
if(bad.length) throw new Error('services 밖에서 DB 를 직접 만진다: '+bad.join(', '));
console.log('DB 경계 OK');
"
node -e "
const { execSync } = require('child_process');
const out = execSync('npx next build', { encoding: 'utf8', env: { ...process.env, TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '' } });
const dyn=(out.match(/^ƒ \//gm)||[]).filter(d=>!/\/(api|admin)/.test(d));
if(dyn.length) throw new Error('공개 페이지가 동적이 됐다: '+dyn.join(', '));
console.log('Turso 없이도 빌드 통과 · 공개 페이지 정적 유지');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 브라우저에서:
   - 목록에 조회수가 채워지는가
   - **값이 들어올 때 레이아웃이 흔들리지 않는가** (열 폭·행 높이 고정)
   - 네트워크 탭에서 **배치 호출이 한 번**인가 (행마다 부르고 있지 않은가)
   - 목록을 봐도 **조회수가 증가하지 않는가** (새로고침 후 숫자 확인)
   - 글 상세에서는 기존대로 세션당 1회 증가하는가
3. **조회수를 못 받는 상황을 만들어 확인한다.** `/api/views` 를 차단하거나 환경변수를 비우고:
   - 목록이 정상으로 보이는가
   - 빈 열·빈 상자·`0` 이 남지 않는가
   - 콘솔 에러가 사용자 경험을 망치지 않는가
4. 아키텍처 체크리스트:
   - 공개 페이지가 전부 정적인가?
   - DB 접근이 `src/services/turso.ts` 를 경유하는가?
   - Turso 에 수치 외의 것을 넣지 않았는가?
5. `phases/blog-6-redesign/index.json` 의 step 4 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`?ids=` 요청/응답 형태와 개수 상한, `ViewCounts` 사용법, 인기 글 위치, 데이터 없을 때의 동작**을 한 줄로 기록.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **빌드 타임에 Turso 를 읽지 마라.** 위 "설계 근거" 참고.
- **목록에서 조회수를 증가시키지 마라.**
- **값이 없을 때 `0` 을 그리지 마라.** 실제 0회와 구분되지 않는다.
- **행마다 API 를 호출하지 마라.** 한 번의 배치 호출이다.
- **`getViews` 를 두고 새 쿼리를 짜지 마라.** `src/services/turso.ts` 밖에서 DB 를 만지지 마라.
- **Turso 에 본문·인증정보·댓글을 넣지 마라** (CLAUDE.md CRITICAL).
- **새 차트를 그리지 마라.** 숫자와 텍스트로 충분하다.
- **`content/` 의 글을 수정하지 마라.**
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-6-redesign/index.json` 의 step 4 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
