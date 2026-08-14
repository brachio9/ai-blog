# Step 2: masthead-and-nav

지면의 머리와 끝을 신문 지면으로 바꾼다. 제호·내비·괘선 쌍·푸터.

## 읽어야 할 파일

- `design/brief.md` — 계보(신문 지면) 절, 재료 상자, 긴장 축
- `design/components/masthead.html` — **이 step 의 시각적 정본.** 소스를 열어 마크업을 보고 가져다 쓴다
- `design/readme.md` — 이미 만들어져 있는 클래스 목록
- `design/styles.css` — `.rule-pair` · `.masthead*` · `.dateline` 정의
- `src/components/layout/SiteHeader.tsx`
- `src/components/layout/SiteFooter.tsx`
- `src/components/layout/Container.tsx`
- `src/components/layout/ThemeToggle.tsx`
- `src/app/(public)/layout.tsx` · `src/app/layout.tsx`
- `src/lib/site.ts` — `SITE_NAME` · `SITE_DESCRIPTION`
- `src/lib/categories.ts` — 카테고리 정의
- step 0 의 토큰, step 1 의 스키마 (요약 참조)

## 작업

### 1) 신문 재료 클래스를 `globals.css` 로 가져온다

`design/styles.css` 의 아래 클래스를 **정의를 바꾸지 말고** 옮긴다:

`.rule-pair` · `.masthead` · `.masthead-title` · `.masthead-line` · `.masthead-meta` · `.dateline` ·
`.headline` · `.deck` · `.lede` · `.page`

### 2) 제호 (마스트헤드)

`design/components/masthead.html` 의 두 변형을 따른다.

- **홈** — 제호 크게 + 설명 한 문단 + 발행 정보 한 줄(`.masthead-meta`, mono). 그 아래 `.rule-pair` 하나.
- **카테고리** — 제호는 작아지고(`초록 · 최신 논문` kicker) 카테고리 이름이 커진다. 편수와 기간을 mono 로.

**가운데 정렬하지 마라.** 히어로가 아니라 제호이므로 화면을 차지하지 않는다.
사이트 이름·설명은 반드시 `src/lib/site.ts` 에서 읽는다 — 문자열을 하드코딩하지 마라.

### 3) 내비

- 현재 위치는 **밑줄이 아니라 안료**(`--color-accent`)로 가리킨다. 이유: 링크의 밑줄과 겹쳐 구분이 안 된다.
- 카테고리 3개 + 색인(`/tags`) + 아카이브(`/archive`) 를 노출한다.
- 검색과 테마 토글은 지금 위치·동작을 유지한다. **모바일에서 헤더가 두 줄로 접히지 않게** 하라 — 실측에서 토글이 다음 줄로 떨어진다.

### 4) 푸터

푸터는 링크 창고가 아니라 **되찾기 장치**다 (기록용 독자가 가장 자주 쓴다).
`.rule-pair` 로 지면을 닫고, 왼쪽에 제호·한 줄 원칙, 오른쪽에 색인·아카이브·소개·RSS.

### 5) 괘선 쌍은 아껴 쓴다

`.rule-pair` 는 이 시스템이 쓰는 **유일한 장식**이다. **한 화면에 한 번**을 원칙으로 한다
(머리에 한 번, 푸터에 한 번까지가 상한이다). 세 번 이상 나오면 이미 흔해진 것이다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
for(const c of ['.rule-pair','.masthead','.masthead-title','.dateline','.headline','.deck','.lede'])
  if(!css.includes(c)) throw new Error(c+' 클래스가 globals.css 에 없다');
const rp=css.match(/\.rule-pair\s*\{[^}]*\}/);
if(!rp||!/border-top/.test(rp[0])) throw new Error('.rule-pair 에 굵은 선이 없다');
if(!/\.rule-pair::after/.test(css)) throw new Error('.rule-pair::after 가 없다 — 굵은선/얇은선 쌍이 아니다');
console.log('신문 재료 클래스 OK');
"
node -e "
const fs=require('fs');
const h=fs.readFileSync('src/components/layout/SiteHeader.tsx','utf8');
const f=fs.readFileSync('src/components/layout/SiteFooter.tsx','utf8');
if(!/SITE_NAME/.test(h)) throw new Error('SiteHeader 가 SITE_NAME 을 읽지 않는다 — 이름을 하드코딩하지 마라');
if(/초록/.test(h.replace(/\/\/.*|\/\*[\s\S]*?\*\//g,''))) throw new Error('SiteHeader 에 사이트명이 하드코딩돼 있다');
for(const p of ['/tags','/archive']) if(!h.includes(p)&&!f.includes(p)) throw new Error('탐색 경로 '+p+' 가 헤더·푸터 어디에도 없다');
console.log('제호·탐색 경로 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('src/app').concat(walk('src/components')).filter(f=>/\.tsx$/.test(f));
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const n=(t.match(/rule-pair/g)||[]).length;
  if(n>2) throw new Error(f+' 에 rule-pair 가 '+n+'번 있다 — 괘선 쌍은 화면당 최대 2번(머리·푸터)이다');
  if(/text-center|justify-center/.test(t) && /masthead/.test(t)) throw new Error(f+' 의 마스트헤드가 가운데 정렬이다');
}
console.log('괘선 절제·좌측 정렬 OK');
"
node -e "
const fs=require('fs');
const out=require('child_process').execSync('ls .next/server/app',{encoding:'utf8'});
console.log('빌드 산출 확인 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const css=walk('.next/static').filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/rule-pair/.test(css)) throw new Error('빌드 산출 CSS 에 rule-pair 가 없다 — 클래스가 실제로 쓰이지 않았다');
console.log('빌드 산출 CSS OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `docs/ARCHITECTURE.md` 디렉토리 구조를 따르는가?
   - `docs/UI_GUIDE.md` 의 불변 넷을 지켰는가? (두 목소리·안료·손으로 정한 척도·떠 있지 않은 지면)
   - 공개 페이지가 **정적 생성(SSG)** 을 유지하는가? 서버 컴포넌트에서 `searchParams` 를 읽으면 동적이 된다
   - 사이트명·설명이 `src/lib/site.ts` 단일 출처인가?
3. `phases/blog-7-design-system/index.json` 의 step 2 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **globals.css 로 옮긴 클래스 목록과 SiteHeader/SiteFooter 의 구조**를 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **가운데 정렬 히어로를 만들지 마라.** 이유: 첫 화면은 마스트헤드 한 덩이와 곧바로 목록이다. 실측에서 옛 히어로가 461px 를 먹었다.
- **`.rule-pair` 를 화면당 3번 이상 쓰지 마라.** 이유: 이 시스템의 유일한 장식이라 아껴 쓸수록 세다.
- **목록·글 상세 화면을 건드리지 마라.** 이 step 은 헤더·푸터·마스트헤드까지다. 목록은 step 3, 홈 1면은 step 4, 기사면은 step 5 다.
- **`design/` 아래 파일을 수정하지 마라.**
- **아이콘 라이브러리를 설치하지 마라.** 이유: 그 기본 룩 자체가 템플릿 신호다. 필요한 것은 `src/components/ui/icons.tsx` 에 직접 그린다.
- 기존 테스트를 깨뜨리지 마라.
