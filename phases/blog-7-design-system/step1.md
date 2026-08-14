# Step 1: frontmatter

시그니처 둘(**추린 비율**, **1면 편집**)이 요구하는 콘텐츠 규약을 만든다. 화면은 아직 건드리지 않는다 — 데이터만 준비한다.

## 읽어야 할 파일

- `design/brief.md` — 시그니처 절. 왜 이 두 필드가 필요한지
- `design/readme.md` — "시그니처가 앱에 요구하는 것" 표
- `src/lib/content/schema.ts` — frontmatter zod 스키마 (수정 대상)
- `src/lib/content/schema.test.ts` — 스키마 테스트
- `src/lib/content/posts.ts` — 글 로딩
- `src/types/content.ts` — `PostFrontmatter` 타입
- `content/**/*.mdx` — 샘플 글 8편
- step 0 에서 만든 `src/app/globals.css` 토큰

## 작업

### 1) 스키마에 두 필드 추가

**필드 이름은 확정됐다. 바꾸지 마라.** 이미 발행한 글을 전부 고쳐야 하기 때문이다.

| 필드 | 자리 | 타입 | 필수 |
|---|---|---|---|
| `words` | **`source` 객체 안** | 양의 정수 | 선택 |
| `lead` | 최상위 | boolean | 선택, 기본 `false` |

```yaml
source:
  url: https://arxiv.org/abs/2608.01337
  title: Two-Stage Router Warmup for Sparse Mixture-of-Experts
  words: 2410          # 원문 단어 수
lead: true             # 이 글을 1면 머리기사로
```

- `source.words` 는 **원문의 단어 수**다. 초록(한글) 쪽 길이는 본문에서 세면 되므로 적지 않는다.
- `source` 가 없는 글(주로 `notes`)은 `words` 도 없다. **그래도 유효해야 한다** — 비교 대상이 없으니 비율을 안 보여 주는 게 맞는 동작이다.
- `lead` 는 선택이다. 없으면 이후 step 이 "가장 최근 글"을 자동으로 머리기사로 삼는다.

`src/types/content.ts` 의 타입도 함께 갱신한다.

### 2) 초록 길이를 세는 헬퍼

`src/lib/content/` 안에 본문 글자 수를 세는 함수를 만든다. 시그니처가 다음 step 들에서 쓴다.

```ts
/** MDX 본문에서 사람이 읽는 글자 수를 센다. 코드블록·수식·JSX·frontmatter 는 제외한다. */
export function countBodyChars(mdxBody: string): number;

/**
 * 원문 대비 몇 분의 일로 줄였는지. 정수 비율로 반올림한다.
 * sourceWords 가 없으면 null — 호출부는 이때 비율을 그리지 않는다.
 */
export function compressionRatio(
  sourceWords: number | undefined,
  bodyChars: number,
): { ratio: number; bodyChars: number; sourceWords: number } | null;
```

비율 계산 규칙 — **여기서 정하고 이후 step 은 이 함수만 쓴다:**

- 영문 1 단어 ≈ 한글 2.5 자로 환산해 비교한다. 상수는 파일 상단에 이름 붙여 두고 주석으로 근거를 남겨라.
- `ratio` 는 `1/N` 의 `N` 이다. 2 미만이면 `null` 을 반환한다 — "1:1 로 추림"은 뜻이 없다.
- `sourceWords` 가 0 이하이거나 `bodyChars` 가 0 이면 `null`.

`countBodyChars` 는 순수 함수여야 한다. 파일을 읽지 마라 — 본문 문자열만 받는다.

### 3) 샘플 글 8편에 값 채우기

`content/**/*.mdx` 의 글들에 `source.words` 를 넣는다. **`source` 가 있는 글에만** 넣는다.
값은 원문을 실제로 세는 게 아니라 그럴듯한 추정치로 둔다 (원문 링크가 실제 arXiv 가 아닌 샘플 데이터다).
`hf-blog` 는 800–2,000, `papers` 는 2,000–6,000 범위가 자연스럽다.

`lead` 는 **정확히 한 글에만** `true` 로 둔다. 가장 최근 글이 아닌 것에 붙여라 —
그래야 "자동값(최신)"이 아니라 "수동 지정"이 동작하는지 이후 step 에서 확인된다.

### 4) 테스트

`src/lib/content/schema.test.ts` 에 추가:

- `source.words` 가 있는 frontmatter 가 통과한다
- `source.words` 없이도 통과한다 (선택 필드)
- `source.words` 가 0·음수·소수면 실패한다
- `lead` 가 없으면 `false` 로 채워진다

`compressionRatio` · `countBodyChars` 의 테스트 파일도 만든다 (`src/lib/**/*.test.ts` 규칙을 따른다).
경계값(비율 2 미만 → `null`, `sourceWords` 없음 → `null`)을 반드시 덮어라.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const s=fs.readFileSync('src/lib/content/schema.ts','utf8');
if(!/words/.test(s)) throw new Error('스키마에 words 필드가 없다');
if(/sourceWords/.test(s)) throw new Error('sourceWords 라는 이름을 쓰고 있다 — 확정된 이름은 source.words 다');
if(!/lead/.test(s)) throw new Error('스키마에 lead 필드가 없다');
console.log('스키마 필드 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('content').filter(f=>f.endsWith('.mdx'));
if(files.length<8) throw new Error('샘플 글이 '+files.length+'편뿐이다');
let withSource=0, withWords=0, leads=0;
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const fm=t.split('---')[1]||'';
  const hasSource=/^\s*source:/m.test(fm);
  if(hasSource) withSource++;
  if(/^\s+words:\s*\d+/m.test(fm)) withWords++;
  if(/^lead:\s*true/m.test(fm)) leads++;
}
if(withWords!==withSource) throw new Error('source 있는 글 '+withSource+'편 중 words 가 있는 글이 '+withWords+'편뿐이다 — 전부 채워야 한다');
if(leads!==1) throw new Error('lead: true 인 글이 '+leads+'편이다 — 정확히 1편이어야 한다 (지면당 머리기사는 하나)');
console.log('콘텐츠 데이터 OK (source '+withSource+'편, lead 1편)');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const src=walk('src/lib/content').concat(walk('src/lib').filter(f=>/ratio|compress/i.test(f)));
const all=[...new Set(src)].map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/countBodyChars/.test(all)) throw new Error('countBodyChars 가 없다');
if(!/compressionRatio/.test(all)) throw new Error('compressionRatio 가 없다');
console.log('헬퍼 시그니처 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const tests=walk('src').filter(f=>/\.test\.tsx?$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/compressionRatio/.test(tests)) throw new Error('compressionRatio 의 테스트가 없다');
if(!/countBodyChars/.test(tests)) throw new Error('countBodyChars 의 테스트가 없다');
console.log('테스트 존재 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - **글 본문은 `content/**/*.mdx` 에만 있는가?** (`CLAUDE.md` CRITICAL — 본문을 DB 에 넣지 마라)
   - frontmatter 검증 실패가 **빌드를 깨뜨리는가?** (조회수·댓글 실패와 반대다)
   - 모든 시각이 KST(+0900) ISO-8601 인가?
   - `hf-blog`·`papers` 전 글에 `source.url` 이 있는가? (출처 표기는 CRITICAL)
   - 테스트가 `src/**/*.test.{ts,tsx}` 에 있는가? (`vitest.config.ts` 의 include 범위)
3. `phases/blog-7-design-system/index.json` 의 step 1 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **`countBodyChars`·`compressionRatio` 의 정확한 시그니처와 파일 경로, 환산 상수, `lead: true` 인 글의 slug** 를 기록. 다음 step 들이 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **필드 이름을 바꾸지 마라** (`source.words` · `lead`). 이유: 발행한 글을 전부 고쳐야 바꿀 수 있어 사실상 되돌릴 수 없다.
- **`source.words` 를 필수로 만들지 마라.** 이유: `source` 가 없는 `notes` 글이 전부 빌드에서 터진다.
- **화면을 건드리지 마라.** 이 step 은 스키마·헬퍼·콘텐츠 데이터까지다. 비율을 그리는 것은 step 3·5 의 몫이다.
- **`design/` 아래 파일을 수정하지 마라.** 이유: 디자인이 정본이고 앱이 따라온다.
- **본문 글자 수를 DB 나 별도 캐시에 저장하지 마라.** 이유: 빌드 때 세면 되고, Turso 에는 조회수 같은 휘발성 수치만 넣는다 (CRITICAL).
- 기존 테스트를 깨뜨리지 마라.
