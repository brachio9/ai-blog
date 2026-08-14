# Step 4: frontpage

시그니처 **1면 편집**을 홈에 적용한다. 홈이 매번 같은 배치가 아니라 **그날의 편집**이 되게 한다.

## 읽어야 할 파일

- `design/brief.md` — 시그니처 절, 읽는 사람 셋(특히 "매일 훑는 단골"), 실패 신호
- `design/components/signatures.html` — 후보 02 의 그림
- `design/components/entries.html` — 머리기사·단신·색인의 실제 크기
- `design/styles.css` — `.entry-lead` · `.brief-set` · `.brief-item`
- `src/app/(public)/page.tsx` — 홈 (수정 대상)
- `src/lib/content/posts.ts` — 글 로딩·정렬
- `src/lib/stats.ts` — 통계
- step 1 의 `lead` 필드, step 3 의 `PostLead` · `PostBrief` · `PostIndexRow` (summary 에 시그니처가 있다)

## 작업

### 1) 머리기사 선정

```ts
/**
 * 1면 머리기사를 고른다.
 * frontmatter 의 lead 가 true 인 글이 있으면 그중 가장 최근 것, 없으면 전체에서 가장 최근 글.
 * 항상 정확히 하나를 돌려준다 (글이 0편이면 null).
 */
export function pickLead(posts: Post[]): Post | null;
```

`src/lib/` 안에 두고 테스트를 함께 만든다. 경계값을 반드시 덮어라 — `lead` 가 여럿일 때, 없을 때, 글이 0편일 때.

**손 안 대면 저절로 굴러가야 한다.** `lead` 를 아무 글에도 안 붙여도 홈은 정상 동작해야 한다.

### 2) 홈 구성

`design/components/signatures.html` 의 후보 02 를 따른다.

1. 마스트헤드 (step 2 산출물) + `.rule-pair`
2. **머리기사 하나** — `PostLead`. 표제/부제/리드 3단 + 데이트라인 + 추린 비율
3. **단신 묶음** — 머리기사를 뺀 최근 글들을 `.brief-set` 으로 뭉친다
4. 그 아래 기존 요소(카테고리별 최신, 많이 읽힌 글)는 유지하되 급을 낮춘다

**지면당 머리기사는 하나다.** 둘이 되는 순간 편집이 아니라 나열이다.

### 3) 급 차이를 실제로 벌린다

머리기사의 표제는 `.entry-lead .headline` 이 `clamp(30px, 4.6vw, 54px)` 다. **이걸 작게 조정하지 마라.**
파격 예산은 "대담하게"이고, 신문 지면은 급 차이가 클수록 산다. 머리기사와 단신의 제목 크기가
눈에 띄게 다르지 않으면 이 시그니처는 실패한 것이다.

### 4) "10초 판단" 을 지킨다

`design/brief.md` 의 실패 신호 — *단골이 10초 안에 "오늘 새 글"을 못 고르면 실패*.
머리기사와 단신이 **첫 화면(1000px) 안에** 들어와야 한다. 마스트헤드가 화면을 먹으면 이 시그니처가 무의미해진다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const lib=walk('src/lib').filter(f=>/\.tsx?$/.test(f)&&!/\.test\./.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/pickLead/.test(lib)) throw new Error('pickLead 가 src/lib 에 없다');
const tests=walk('src').filter(f=>/\.test\.tsx?$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/pickLead/.test(tests)) throw new Error('pickLead 의 테스트가 없다');
console.log('머리기사 선정 OK');
"
node -e "
const fs=require('fs');
const home=fs.readFileSync('src/app/(public)/page.tsx','utf8');
if(!/PostLead/.test(home)) throw new Error('홈이 PostLead 를 쓰지 않는다 — 1면 편집이 없다');
if(!/PostBrief|brief-set/.test(home)) throw new Error('홈에 단신 묶음이 없다');
if(!/pickLead/.test(home)) throw new Error('홈이 pickLead 를 쓰지 않는다');
const leads=(home.match(/<PostLead/g)||[]).length;
if(leads!==1) throw new Error('홈에 PostLead 가 '+leads+'개다 — 지면당 머리기사는 하나다');
console.log('1면 편집 OK');
"
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
const m=css.match(/\.entry-lead[^{]*\.headline\s*\{[^}]*\}/);
if(!m) throw new Error('.entry-lead .headline 규칙이 없다');
if(!/clamp\(/.test(m[0])) throw new Error('머리기사 표제가 clamp 가 아니다 — 급을 스케일 밖으로 키우는 것이 이 시그니처다');
console.log('머리기사 급 OK');
"
node -e "
const out=require('child_process').execSync('cat .next/prerender-manifest.json',{encoding:'utf8'});
const routes=Object.keys(JSON.parse(out).routes||{});
if(!routes.includes('/')) throw new Error('홈이 프리렌더되지 않는다 — SSG 가 깨졌다');
if(routes.length<25) throw new Error('프리렌더 경로가 '+routes.length+'개뿐이다');
console.log('홈 정적 생성 유지 OK ('+routes.length+'경로)');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const pages=walk('.next/server/app').filter(f=>/(^|\/)page\.html$/.test(f));
if(!pages.length) throw new Error('프리렌더된 page.html 이 하나도 없다');
const home=pages.map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/entry-lead/.test(home)) throw new Error('프리렌더 HTML 어디에도 entry-lead 가 없다 — 머리기사가 실제로 그려지지 않았다');
console.log('머리기사 렌더 확인 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `docs/UI_GUIDE.md` 의 불변 넷과 시그니처 셋을 지켰는가?
   - **지면당 머리기사가 정확히 하나인가?**
   - `lead` 를 아무 글에도 안 붙여도 홈이 정상 동작하는가? (기본값 = 최신 글)
   - 홈이 정적 생성을 유지하는가?
   - 조회수 실패가 홈 렌더를 막지 않는가?
3. `phases/blog-7-design-system/index.json` 의 step 4 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`pickLead` 의 시그니처·경로와 홈의 구역 순서**를 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **머리기사를 둘 이상 두지 마라.** 이유: 둘이 되는 순간 편집이 아니라 나열이다.
- **머리기사 표제를 작게 조정하지 마라.** 이유: 급 차이가 이 시그니처의 전부다. 파격 예산은 "대담하게"다.
- **조회수로 머리기사를 자동 선정하지 마라.** 이유: 편할 뿐 편집이 아니다. 사람이 정하거나(=`lead`) 최신순이거나 둘 중 하나다.
- **`lead` 를 필수로 만들지 마라.** 이유: 1인 운영에서 매번 편집 결정을 요구하는 장치는 반드시 흐지부지된다.
- **가운데 정렬 히어로를 되살리지 마라.**
- **`design/` 아래 파일을 수정하지 마라.**
- **글 상세 화면을 건드리지 마라.** step 5 의 몫이다.
- 기존 테스트를 깨뜨리지 마라.
