# Step 4: identity

매체의 정체성 문구를 6축에 맞게 다시 쓴다. **앱 쪽만 고친다** — 가드레일 문서(`CLAUDE.md`·`docs/*.md`)는 이미 갱신돼 있다.

## 읽어야 할 파일

- `docs/PRD.md` — 「목표」·「분류 축 셋」·「카테고리」 절. **이 문서가 정본이다**
- `CLAUDE.md` — 프로젝트 한 줄 설명
- `design/brief.md` — 「무엇을 만드는가」 절
- `src/lib/site.ts` — `SITE_NAME` · `SITE_DESCRIPTION` (수정 대상)
- `src/app/(public)/about/page.tsx` — 소개 (수정 대상)
- `src/components/layout/SiteFooter.tsx` — 원칙 한 줄
- step 0~3 산출물 (summary 참조)

## 작업

### 1) `src/lib/site.ts`

`SITE_NAME` 은 **그대로 「초록」이다.** 오히려 6축으로 넓어지면서 이름이 더 맞는다 —
하루 수백 건을 몇 건으로 줄이는 것이 곧 抄錄이다.

`SITE_DESCRIPTION` 을 다시 쓴다:

```
영문 AI 원문을 여섯 갈래로 좁혀 한글로 추려 적습니다.
옮긴 글에는 원문 링크를, 직접 잰 글에는 측정 조건을 함께 답니다.
```

**여섯 축을 여기 나열하지 마라.** 이 문자열은 `.masthead-line`(max-width 52ch)에 그대로 실린다 —
여섯을 나열하면 마스트헤드가 히어로가 되어 "첫 화면에서 글이 보여야 한다"를 깬다.
여섯의 나열은 `/topics` 색인과 about 이 맡는다.

뒷문장이 두 갈래("옮긴 글" / "직접 잰 글")인 것이 의도다 — 매체가 요약만 하는 곳이 아니라는 사실을
한 문장에 넣으면서 출처 원칙(CLAUDE.md CRITICAL)도 함께 선언한다.

### 2) `src/app/(public)/about/page.tsx`

**「왜 「초록」인가」** — 기존 문단을 유지하고 한 문단을 **덧붙인다.** 다시 쓰지 마라.
넣어야 할 내용: 다루는 범위는 늘었지만 하는 일은 같다 · 무엇을 뺐는지가 절반이다 ·
요즘은 남의 글을 옮기기만 하지 않고 직접 재 보고 만들어 본 기록도 싣는다 ·
그런 글에는 옮길 원문이 없으니 대신 **측정 조건과 실패한 시도**를 적는다.

**원칙은 셋을 유지한다** (코드 주석이 "원칙은 셋뿐이다"를 못 박고 있다).
출처 원칙에 한 문장만 보탠다 — 커뮤니티에서 본 성능 수치는 직접 재 보기 전까지 **「주장」이라고 적고**,
재 본 글에는 하드웨어·설정·측정 방법을 함께 적는다.

**「무엇을 읽는가」를 두 절로 나눈다** (현재는 `CATEGORIES` 목록 하나다):

1. **「여섯 갈래」** — `AXES` 순회. 번호(mono) + 이름 + description + 편수 + `/topics/{slug}` 링크. **위에 온다**
2. **「어디서 오는가」** — `CATEGORIES` 순회. 현재 마크업 그대로 (안료 라벨 + 편수 + description)

그리고 2번 아래에 **주소와 이름이 어긋난 이유**를 적는다:

> 주소에 남은 `hf-blog` 는 이 사이트가 허깅페이스 블로그만 옮기던 시절의 흔적입니다.
> 이미 걸린 링크를 끊지 않으려고 주소는 그대로 두고 이름만 바꿨습니다.

감추지 마라. `design/brief.md` 의 정정 표기 정신이다.

### 3) 문구 판정 기준

새로 쓰는 모든 문장에 적용한다: **그 문장을 다른 AI 블로그에 그대로 붙여도 말이 되면 다시 써라.**
"AI 시대의 인사이트" 류 일반론 금지. 구체적 사실만 — 어떤 출처를, 어떤 원칙으로, 얼마나.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const s=fs.readFileSync('src/lib/site.ts','utf8');
if(!/SITE_NAME\s*=\s*\"초록\"/.test(s)) throw new Error('SITE_NAME 이 바뀌었다 — 이름은 그대로다');
const d=(s.match(/SITE_DESCRIPTION[^;]*;/s)||[''])[0];
if(!/여섯/.test(d)) throw new Error('SITE_DESCRIPTION 에 여섯 갈래가 안 드러난다');
if(!/원문 링크/.test(d)) throw new Error('SITE_DESCRIPTION 에서 출처 원칙이 빠졌다');
for(const a of ['검색','서빙','음성','에이전트','도메인','바이브코딩']){
  if((d.match(new RegExp(a,'g'))||[]).length) { }
}
const axisNames=['검색·RAG','서빙·학습','음성','에이전트·자동화','도메인·정책','바이브코딩'];
const listed=axisNames.filter(n=>d.includes(n)).length;
if(listed>=3) throw new Error('SITE_DESCRIPTION 이 축을 나열한다 — 마스트헤드가 히어로가 된다');
if(/HuggingFace 블로그와 arXiv 논문 등/.test(d)) throw new Error('옛 설명이 그대로다');
console.log('site.ts OK');
"
node -e "
const fs=require('fs');
const a=fs.readFileSync('src/app/(public)/about/page.tsx','utf8');
if(!/AXES/.test(a)) throw new Error('about 이 AXES 를 순회하지 않는다');
if(!/CATEGORIES/.test(a)) throw new Error('about 에서 CATEGORIES 절이 사라졌다');
if(!/hf-blog/.test(a)) throw new Error('about 에 hf-blog 주소 유래 설명이 없다 — 어긋남을 감추지 마라');
if(!/주장/.test(a)) throw new Error('about 에 미검증 주장 표기 원칙이 없다');
const principles=(a.match(/PRINCIPLES/g)||[]).length;
if(!principles) throw new Error('원칙 목록이 사라졌다');
console.log('about OK');
"
node -e "
const fs=require('fs');
const p=fs.readFileSync('docs/PRD.md','utf8');
if(!/slug 은 고정이다/.test(p)) throw new Error('PRD 의 \"slug 은 고정\" 문장이 사라졌다');
const c=fs.readFileSync('CLAUDE.md','utf8');
const crit=(c.match(/CRITICAL:/g)||[]).length;
if(crit<7) throw new Error('CLAUDE.md 의 CRITICAL 항목이 '+crit+'개로 줄었다');
if(!/여섯 갈래/.test(c)) throw new Error('CLAUDE.md 한 줄 설명이 6축을 안 담는다');
console.log('가드레일 문서 무손상 OK');
"
node -e "
const routes=Object.keys(JSON.parse(require('fs').readFileSync('.next/prerender-manifest.json','utf8')).routes||{});
if(!routes.includes('/about')) throw new Error('/about 이 프리렌더되지 않는다');
console.log('about 정적 생성 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 사이트명·설명이 `src/lib/site.ts` 단일 출처인가? (하드코딩 금지)
   - **`docs/PRD.md` 의 "slug 은 고정" 문장이 그대로 있는가?**
   - **`CLAUDE.md` 의 CRITICAL 항목이 줄지 않았는가?**
   - 새로 쓴 문장이 「다른 AI 블로그에 붙여도 말이 되는」 일반론이 아닌가?
3. `phases/blog-8-six-axes/index.json` 의 step 4 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **새 `SITE_DESCRIPTION` 전문과 about 의 절 구성**을 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`CLAUDE.md` · `docs/*.md` 를 다시 쓰지 마라.** 이유: 이미 갱신돼 있고, 이 문서들은 매 step 에 주입되는 가드레일이다. 생성 도구의 산출물로 덮어쓰는 것은 CRITICAL 위반이다.
- **사이트 이름을 바꾸지 마라.** 이유: 6축으로 넓어지면서 「초록」이 오히려 더 맞는다 — 수백 건을 몇 건으로 줄이는 것이 抄錄이다.
- **`SITE_DESCRIPTION` 에 여섯 축을 나열하지 마라.** 이유: `.masthead-line` 에 그대로 실려 마스트헤드가 히어로가 된다.
- **about 의 원칙을 셋보다 늘리지 마라.** 이유: 코드 주석이 "원칙은 셋뿐이다"를 못 박고 있다.
- **`hf-blog` 주소와 이름의 어긋남을 감추지 마라.** 이유: 정정은 기록이다.
- **화면 구조를 바꾸지 마라.** 이 step 은 문구다. 배치는 step 3 에서 끝났다.
- **`design/` 을 수정하지 마라.**
- 기존 테스트를 깨뜨리지 마라.
