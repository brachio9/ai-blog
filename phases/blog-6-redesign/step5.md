# Step 5: article-polish

글 상세를 새 방향으로 마무리한다. 이 phase 의 마지막 step이고, **읽는 화면**이라 밀도 기준이 목록과 반대다.

## 읽어야 할 파일

- `/docs/UI_GUIDE.md` — 타이포그래피 스케일, 본문 단폭(`max-w-[68ch]`), 본문 요소 규격, 한글 조판
- `/docs/PRD.md` — 핵심 기능 3 (TOC, 출처·라이선스, 읽기 시간, 이전/다음)
- `/CLAUDE.md` — CRITICAL: 외부 원문 요약·인용 시 출처 표기 필수
- `/src/app/(public)/[category]/[slug]/page.tsx` — 글 상세
- `/src/components/post/SourceNote.tsx` — 출처 블록
- `/src/components/post/TableOfContents.tsx` — 목차 (스크롤 추적)
- `/src/components/post/PostNav.tsx` — 이전/다음
- `/src/components/post/ViewCount.tsx` — 단건 조회수 (증가 포함). **동작을 바꾸지 마라**
- `/src/components/post/Comments.tsx` — Giscus
- `/src/components/mdx/MdxBody.tsx` — 본문 래퍼 (타이포 컨테이너)
- `/src/lib/categories.ts` — `accent` · `shortName`

## 지금 상태 (1440px 에서 측정)

- 컨테이너 1088px 안에서 본문 686px + 목차 224px. **폭 자체는 문제없다.**
- 목차가 3개뿐이라 우측 레일이 길게 비어 보인다.
- 메타 줄(날짜·읽기시간·조회수)과 태그가 제목 아래 평평하게 놓여 위계가 약하다.

## 작업

### 1) 글 머리

- 카테고리를 `accent` 색 표식과 함께 보인다 (색만으로 알리지 마라 — 라벨 병기).
- 제목은 세리프, UI_GUIDE 스케일(`text-2xl md:text-3xl`)을 따른다. **`text-4xl` 이상으로 키우지 마라.**
- 메타(발행일·수정일·읽기 시간·조회수)는 한 줄로 묶고 `muted` + `tabular-nums`.
- `papers` 는 **arXiv ID 와 저자를 머리에서 바로 보인다.** 논문 리뷰에서 그게 첫 번째 식별 정보다.
- 한글 제목이 단어 중간에서 끊기지 않는지 확인한다 (step 1 의 `keep-all` 이 전역이지만 제목에서 눈으로 확인).

### 2) 출처 블록 — `SourceNote.tsx`

**이 사이트의 신뢰도가 걸린 자리다.** CLAUDE.md CRITICAL 이 요구하는 표기를 그대로 유지하되 새 토큰에 맞춘다.

- "번역이 아니라 요약" 이라는 문장을 유지한다. 지우지 마라.
- 원문 제목·저자·라이선스·원문 발행일을 계속 보인다.
- 외부 링크에는 `icons.tsx` 의 외부링크 아이콘을 쓰고 `rel="noopener"` 를 유지한다.
- 강조 블록이므로 테두리를 써도 된다 (UI_GUIDE: 목록은 선, 강조 블록은 테두리).

### 3) 목차 — `TableOfContents.tsx`

- 스크롤 추적 동작을 **그대로 유지**한다. 다시 만들지 마라.
- 제목이 적을 때 우측이 비어 보이는 문제를 다룬다. 목차 아래에 **글 정보(카테고리·태그·출처 도메인)를 함께 두는 식**으로 레일을 채우거나, 목차가 2개 이하면 레일을 접고 본문을 넓힌다. 둘 중 하나를 고른다.
- 앵커 링크가 한글 제목에서 깨지지 않는지 확인한다 (`rehype-slug` 와 `github-slugger` 가 같은 규칙을 써야 한다 — 기존 구현을 유지하면 된다).

### 4) 이전/다음 — `PostNav.tsx`

- 지금은 최신 글에서 "이전 글" 하나만 나온다. 그건 맞다.
- 같은 카테고리 안에서 이어지는지, 전체에서 이어지는지 **규칙을 분명히** 하고 화면에도 드러내라 (예: "최신 논문에서 이전 글").

### 5) 본문 타이포 — `MdxBody.tsx`

- 새 폰트·색 토큰에 맞춰 본문 컨테이너를 조정한다. `max-w-[68ch]` 는 유지.
- **`src/lib/mdx.ts` 와 `src/components/mdx/*` 의 렌더 로직은 건드리지 마라** (ADR-003). 바꿀 수 있는 것은 **감싸는 컨테이너의 타이포·간격**뿐이다.
- 본문 링크는 UI_GUIDE 대로 무채 + 밑줄.

### 6) 댓글

- Giscus 테마 동기화(`postMessage`) 동작을 **그대로 유지**한다. 새 팔레트에서 iframe 이 튀지 않는지 확인만 한다.
- 댓글 구역 제목·간격만 새 방향에 맞춘다.

### 7) 테스트

- 기존 `SourceNote.test.tsx` 를 유지·갱신한다. **출처 표기가 사라지지 않았음을 단정하는 테스트는 반드시 남겨라** — CRITICAL 규칙의 자동 방어선이다.
- `papers` 글에서 arXiv ID 가 머리에 렌더되는지 테스트를 더한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const p=fs.readFileSync('src/app/(public)/[category]/[slug]/page.tsx','utf8');
if(!/SourceNote/.test(p)) throw new Error('출처 블록이 사라졌다 (CLAUDE.md CRITICAL)');
if(!/TableOfContents/.test(p)) throw new Error('목차가 사라졌다');
if(!/PostNav/.test(p)) throw new Error('이전/다음이 사라졌다');
if(!/ViewCount/.test(p)) throw new Error('조회수가 사라졌다');
if(/text-4xl|text-5xl/.test(p)) throw new Error('글 제목이 UI_GUIDE 스케일을 넘는다');
console.log('글 상세 구성 요소 OK');
"
node -e "
const fs=require('fs');
const s=fs.readFileSync('src/components/post/SourceNote.tsx','utf8');
for (const k of ['요약','원문']) if(!s.includes(k)) throw new Error('출처 블록에서 '+k+' 관련 문구가 사라졌다');
if(!/noopener/.test(s)) throw new Error('외부 링크에 rel=noopener 가 없다');
console.log('출처 표기 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const MDX=path.join('src','lib','mdx.ts');
const compilers=walk('src').filter(f=>/\.tsx?\$/.test(f)&&f!==MDX&&/from [\"']next-mdx-remote/.test(fs.readFileSync(f,'utf8')));
if(compilers.length) throw new Error('MDX 컴파일 진입점이 갈라졌다 (ADR-003): '+compilers.join(', '));
const m=fs.readFileSync(MDX,'utf8');
if((m.match(/remarkPlugins\s*:/g)||[]).length!==1) throw new Error('remark 설정이 하나가 아니다 (ADR-003)');
console.log('MDX 파이프라인 무결 OK');
"
node -e "
const { execSync } = require('child_process');
const out = execSync('npx next build', { encoding: 'utf8' });
const posts=(out.match(/● \/(hf-blog|papers|notes)\//g)||[]).length;
if(posts < 3) throw new Error('글 상세 정적 생성이 '+posts+'건뿐이다');
const dyn=(out.match(/^ƒ \//gm)||[]).filter(d=>!/\/(api|admin)/.test(d));
if(dyn.length) throw new Error('공개 페이지가 동적이 됐다: '+dyn.join(', '));
console.log('글 상세 SSG 유지 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 **글을 실제로 읽어 본다.** 이 step 은 "빌드가 통과한다" 가 아니라 "읽기 좋다" 로 판정한다:
   - 한글 본문이 세리프로, 한 문장 안에서 서체가 갈리지 않는가
   - 수식·표·코드블록·차트·다이어그램이 전부 그대로 나오는가. **차트가 검정이 아닌가**
   - 출처 블록이 눈에 띄되 본문을 가리지 않는가
   - 목차가 스크롤을 따라오는가. 목차가 짧을 때 우측이 허전하지 않은가
   - `papers` 글에서 arXiv ID·저자가 머리에 보이는가
   - 이전/다음이 어느 범위에서 이어지는지 화면만 보고 알 수 있는가
   - 라이트/다크 전환 시 댓글 iframe 까지 함께 바뀌는가
   - 375px 에서 페이지가 가로로 밀리지 않는가 (표는 표만 스크롤)
3. 아키텍처 체크리스트:
   - MDX 컴파일이 `src/lib/mdx.ts` 하나를 지나는가? (ADR-003)
   - 출처 표기가 유지되는가? (CLAUDE.md CRITICAL)
   - 글 상세가 여전히 SSG(`●`) 인가?
4. `phases/blog-6-redesign/index.json` 의 step 5 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **글 머리 구성, 목차 레일 처리 방식, 이전/다음 범위 규칙**을 한 줄로 기록.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`src/lib/mdx.ts` 와 `src/components/mdx/*` 의 렌더 로직을 바꾸지 마라** (ADR-003). 컨테이너의 타이포·간격만 조정한다.
- **출처 블록을 없애거나 축약하지 마라.** CLAUDE.md CRITICAL 이다.
- **`ViewCount.tsx` 의 증가 로직을 바꾸지 마라.** 세션당 1회 규약이 이미 검증돼 있다.
- **목차 스크롤 추적을 다시 구현하지 마라.**
- **Giscus 테마 동기화 로직을 건드리지 마라.** `postMessage` 방식이 아니면 동작하지 않는다는 것이 이미 확인됐다.
- **글 제목을 UI_GUIDE 스케일보다 키우지 마라.**
- **`content/` 의 글을 수정하지 마라.**
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-6-redesign/index.json` 의 step 5 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
