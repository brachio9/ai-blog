# Step 4: sample-content

앞의 step 들이 만든 표현 수단을 **전부 실제로 사용하는** 샘플 글을 쓴다. 이 글들이 곧 렌더링 파이프라인의 회귀 테스트가 되고, 다음 phase 의 목록·상세 페이지가 쓸 데이터가 된다.

## 읽어야 할 파일

- `/docs/PRD.md` — 카테고리 3종의 성격
- `/CLAUDE.md` — CRITICAL: 출처 표기 필수, KST 고정
- `/src/lib/content/schema.ts` · `/src/types/content.ts` — **frontmatter 스키마가 여기 정의되어 있다.** 필수 필드와 형식을 그대로 지켜야 빌드가 통과한다.
- `/src/lib/content/posts.ts` — 파일명 규약 (`content/{category}/YYYY-MM-DD-{slug}.mdx`)
- `/src/components/mdx/index.ts` — MDX 에서 쓸 수 있는 컴포넌트 목록
- `/src/components/mdx/Chart.tsx` — `<Chart>` props 시그니처
- `/src/components/mdx/Diagram.tsx` — 다이어그램 사용 문법
- `/src/app/mdx-preview/page.tsx` — 앞 step 들이 각 표현을 실제로 어떻게 썼는지 보여주는 예시

## 작업

### 1) 샘플 글 작성 — 카테고리별 3건씩, 총 9건

`content/{category}/YYYY-MM-DD-{slug}.mdx` 규약을 지킨다. `publishedAt` 은 서로 다른 날짜로 흩어 놓아 정렬을 확인할 수 있게 한다.

**표현 수단이 전부 최소 한 번은 쓰여야 한다.** 배치 계획:

| 카테고리 | 글 | 반드시 포함할 것 |
|---|---|---|
| `papers` | 논문 리뷰 A | **인라인 수식 + 별행 수식** (손실 함수, 어텐션 등), 인용, 각주 |
| `papers` | 논문 리뷰 B | **긴 비교 표** (열 6개 이상 — 모바일 가로 스크롤 확인용), 수식 |
| `papers` | 논문 리뷰 C | **Mermaid 다이어그램** (모델 아키텍처 또는 학습 파이프라인) |
| `hf-blog` | 소식 A | **`<Chart>` 막대 그래프** (벤치마크 비교, series 2개 이상) |
| `hf-blog` | 소식 B | **코드블록** (여러 언어 — ts·python·bash), 콜아웃 |
| `hf-blog` | 소식 C | **이미지** (캡션 포함), 외부/내부 링크 |
| `notes` | 메모 A | **`<Chart>` 선 그래프** (추세) |
| `notes` | 메모 B | **중첩 목록 + 인용 + 콜아웃 4종** (success/warning/danger/info) |
| `notes` | 메모 C | **`draft: true`** — 초안이 프로덕션 목록에서 빠지는지 확인용 |

추가 규칙:

- **`hf-blog` 와 `papers` 글에는 `source` 를 반드시 채운다** (CLAUDE.md CRITICAL — 출처 표기 필수). `papers` 는 `paper.arxivId` 와 `authors` 도 필수다.
- `source.url` 은 **실재하는 URL 형식**을 쓰되, 내용은 창작해도 된다. 실제 논문/글을 그대로 번역해 옮기지 마라 — 저작권 문제이고 이 step 의 목적도 아니다.
- 본문은 한글로 쓴다. 각 글은 **최소 400자 이상** — 너무 짧으면 타이포그래피·단폭·읽기 시간을 검증할 수 없다.
- `tags` 를 서로 겹치게 배치하라 (예: `LLM`, `벤치마크`, `추론`). 다음 phase 의 태그 필터가 쓸 데이터다.
- 이미지는 `public/` 아래에 둔다. 외부 URL 을 참조하지 마라 (아직 R2 가 없다).

### 2) 이미지 자산

`public/sample/` 에 샘플 이미지를 1~2개 둔다. 사진을 구하지 말고 **SVG 로 직접 그려라** (예: 간단한 도식). 이유: 외부 자산을 받아올 필요가 없고 용량도 작다.

### 3) 로더 회귀 테스트 — `src/lib/content/posts.test.ts`

실제 `content/` 를 읽어 검증한다:

- 9건 중 `draft: true` 1건을 제외한 8건이 프로덕션 기준으로 반환되는가
- `publishedAt` 내림차순 정렬이 맞는가
- `getPostsByCategory("papers")` 가 3건을 주는가
- `getPost(category, slug)` 가 정확히 찾고, 없는 slug 에 `undefined` 를 주는가
- `getAllTags()` 가 태그별 개수를 맞게 세는가
- 모든 `hf-blog`·`papers` 글에 `source.url` 이 있는가 (CRITICAL 규칙의 자동 검증)

### 4) 검증용 라우트 정리

`src/app/mdx-preview/page.tsx` 를 **실제 샘플 글을 렌더하도록** 바꾼다. 인라인 MDX 문자열 대신 `getAllPosts()` 로 읽은 글을 `renderMdx` 로 렌더하라. 이유: 앞 step 들이 인라인 문자열로 검증했는데, 진짜 파일 경로를 통과하는지도 확인해야 한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs'), path=require('path');
const cats={'hf-blog':3,'papers':3,'notes':3};
for (const [c,n] of Object.entries(cats)) {
  const files=fs.readdirSync('content/'+c).filter(f=>f.endsWith('.mdx'));
  if(files.length!==n) throw new Error(c+' 글 개수 '+files.length+' (기대 '+n+')');
  for (const f of files) {
    if(!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.mdx$/.test(f)) throw new Error('파일명 규약 위반: '+c+'/'+f);
  }
}
console.log('샘플 글 9건 · 파일명 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const all=['hf-blog','papers','notes'].flatMap(c=>fs.readdirSync('content/'+c).map(f=>['content',c,f].join('/')));
const txt=all.map(f=>fs.readFileSync(f,'utf8'));
const joined=txt.join('\n');
const need={'별행 수식':/\\\$\\\$/, '인라인 수식':/\\\$[^\\\$\n]+\\\$/, '표':/^\|.*\|/m, '코드블록':/\`\`\`/, 'Chart':/<Chart/, 'draft 초안':/draft:\s*true/};
for (const [k,re] of Object.entries(need)) if(!re.test(joined)) throw new Error('샘플 글에 '+k+' 가 없다');
if(!/mermaid|<Diagram/i.test(joined)) throw new Error('샘플 글에 다이어그램이 없다');
// 출처 표기 CRITICAL 검증
for (const c of ['hf-blog','papers']) {
  for (const f of fs.readdirSync('content/'+c)) {
    const s=fs.readFileSync('content/'+c+'/'+f,'utf8');
    if(!/^\s+url:\s*http/m.test(s)) throw new Error('출처 url 누락 (CLAUDE.md CRITICAL): '+c+'/'+f);
    if(!/publishedAt:.*\+0900/.test(s)) throw new Error('publishedAt 이 KST(+0900) 가 아니다: '+c+'/'+f);
  }
}
console.log('표현 수단 전량 사용 · 출처/KST 규칙 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 `/mdx-preview` 에서 **눈으로 전부 확인한다**. 이 step 의 본질은 "빌드가 통과한다"가 아니라 "실제로 잘 보인다" 이다:
   - 수식이 조판되는가? 별행 수식이 좁은 화면에서 페이지를 밀어내지 않는가?
   - **차트가 검정이 아닌가?** series 색이 구분되는가?
   - 다이어그램이 라이트/다크 양쪽에서 읽히는가?
   - 6열 표가 375px 에서 표만 가로 스크롤되는가?
   - 코드블록 색이 테마 전환에 따라 바뀌는가?
   - 이미지 캡션과 확대가 동작하는가?
   - 본문 세리프·단폭·행간이 UI_GUIDE 대로인가?
3. 아키텍처 체크리스트:
   - 모든 `hf-blog`·`papers` 글에 출처가 있는가? (CLAUDE.md CRITICAL)
   - `publishedAt` 이 전부 `+0900` 인가?
   - MVP 제외 사항(수집 자동화)을 건드리지 않았는가?
4. `phases/blog-1-content-pipeline/index.json` 의 step 4 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **샘플 글 경로 목록과 각 글이 검증하는 표현 수단**을 한 줄로 기록. 다음 phase 의 목록·상세 페이지가 이 데이터를 쓴다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **실제 HuggingFace 글이나 arXiv 논문을 번역해 옮기지 마라.** 이유: 저작권 문제이고, 이 step 의 목적은 렌더링 검증이다. 내용은 창작하라.
- **글 목록·글 상세·카테고리 페이지를 만들지 마라.** 이유: 다음 phase(`blog-2-public-site`)의 범위다. 여기서는 `/mdx-preview` 라우트로만 확인한다. 이 라우트는 검증 전용이며 다음 phase 에서 삭제되므로 내비게이션에 링크를 걸지 마라.
- **외부 이미지 URL 을 참조하지 마라.** 이유: R2 는 아직 없고, 외부 의존은 빌드를 불안정하게 만든다.
- **앞 step 들의 컴포넌트를 수정하지 마라.** 샘플 글이 안 되면 그건 컴포넌트 버그이니 `error` 로 보고하라. 여기서 고치면 어느 step 의 책임인지 흐려진다. 단, 명백한 오타 수준의 버그는 고치고 summary 에 반드시 기록하라.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-1-content-pipeline/index.json` 의 step 4 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
