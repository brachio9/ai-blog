# Step 5: article

글 상세를 **기사면**으로 만든다. 긴장 축에서 가장 오른쪽 — 홈(1면)과 전혀 다른 물건처럼 보여야 정상이다.

## 읽어야 할 파일

- `design/brief.md` — 긴장 축 절, 실패 신호(원문 링크를 못 찾으면 실패)
- `design/components/article.html` — **이 step 의 시각적 정본**
- `design/styles.css` — `.dateline` · `.headline` · `.deck` · `.lede` · `.ratio` · `.ratio-scale`
- `src/app/(public)/[category]/[slug]/page.tsx` — 글 상세
- `src/components/post/PostHeader.tsx`
- `src/components/post/SourceNote.tsx`
- `src/components/post/TableOfContents.tsx`
- `src/components/post/PostNav.tsx`
- `src/components/post/Comments.tsx`
- `src/components/mdx/` — 본문 요소
- `src/lib/mdx.ts` — **MDX 컴파일 진입점은 이것 하나다**
- step 1 의 `countBodyChars` · `compressionRatio`, step 3 의 항목 컴포넌트 (summary 참조)

## 작업

### 1) 확장형 비율 클래스를 가져온다

`design/styles.css` 에서 `.ratio-scale` · `.ratio-row` · `.ratio-key` · `.ratio-track` · `.ratio-fill` 을 옮긴다.

### 2) 기사면 머리

`design/components/article.html` 을 따른다.

1. **데이트라인** — 카테고리 · 날짜 · 식별자 · 읽기 시간 · 조회수 · `.ratio` 한 조각. 전부 mono
2. **표제** (`.headline`, `--text-h1`)
3. **부제** (`.deck`) — `summary` 를 쓴다
4. **리드** (`.lede`) — 본문 첫 문단이 아니라 별도 요약이 있으면 그것을. 없으면 생략한다
5. `.rule-pair` 하나로 머리와 본문을 가른다

### 3) 원문 출처 + 추린 비율 확장형

`SourceNote` 안에 `.ratio-scale` 을 넣는다 — **한 화면에 한 번만.**

- 위 막대 = 원문(`source.words`), 아래 막대 = 초록(`countBodyChars`)
- 채움 폭은 두 값의 비로 정한다. 원문이 100%, 초록이 그 비율
- `compressionRatio` 가 `null` 이면 **막대 전체를 그리지 않는다.** 출처 표기 자체는 그대로 남는다

⚠ **원문 링크를 못 찾으면 실패다** (`design/brief.md` 실패 신호이자 `CLAUDE.md` 의 CRITICAL 규칙).
비율 장치를 넣다가 `source.url` 링크가 덜 보이게 되면 안 된다.

### 4) 본문과 곁줄

- 본문 폭은 `--measure`(68ch) 를 넘지 않는다. 표·차트·코드블록은 넘어도 된다
- 목차는 훑는 사람의 도구다. 본문 폭을 침범하지 않게 오른쪽에 둔다
- 태그·출처는 곁줄에 유지한다

### 5) 정정 표기 — 빈칸을 채운다

`design/brief.md` 와 `design/components/article.html` 에 "고쳐 실은 글을 어떻게 표시하는가"가 **빈칸으로** 남아 있다.
`updatedAt` 이 이미 frontmatter 에 있으니 형태만 정하면 된다.

신문 계보를 택했으므로 **정정을 적는다.** 형태는 재량이되 아래를 지켜라:

- `updatedAt` 이 `publishedAt` 과 다를 때만 나타난다
- 발행일을 숨기지 않는다 — 둘 다 보여야 한다
- 안료를 쓰지 않는다. 정정은 경고가 아니라 기록이다

**여기는 발명해도 되는 자리다.** 위 세 조건만 지키면 형태는 자유다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
for(const c of ['.ratio-scale','.ratio-row','.ratio-track','.ratio-fill'])
  if(!css.includes(c)) throw new Error(c+' 클래스가 없다');
console.log('확장형 비율 클래스 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('src/app/(public)').concat(walk('src/components/post')).filter(f=>/\.tsx$/.test(f)&&!/\.test\./.test(f));
let n=0;
for(const f of files){ n+=(fs.readFileSync(f,'utf8').match(/ratio-scale/g)||[]).length; }
if(n===0) throw new Error('.ratio-scale 을 아무 데서도 쓰지 않는다 — 시그니처가 빠졌다');
if(n>2) throw new Error('.ratio-scale 이 '+n+'곳에 있다 — 한 화면에 한 번이라야 뜻이 산다');
console.log('추린 비율 확장형 OK ('+n+'곳)');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const src=walk('src').filter(f=>/\.tsx?$/.test(f)&&!/\.test\./.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/compressionRatio/.test(src)) throw new Error('compressionRatio 를 쓰지 않는다 — 비율을 다시 계산하고 있을 가능성');
if(!/updatedAt/.test(src)) throw new Error('updatedAt 을 아무 데서도 쓰지 않는다 — 정정 표기가 없다');
console.log('비율 단일 출처·정정 표기 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const mdxEntry=walk('src').filter(f=>/\.tsx?$/.test(f)&&!/\.test\./.test(f)).filter(f=>/compileMDX|next-mdx-remote/.test(fs.readFileSync(f,'utf8')));
const allowed=mdxEntry.filter(f=>!/src\/lib\/mdx\.ts$/.test(f)&&!/admin/.test(f));
if(allowed.length) throw new Error('MDX 컴파일 진입점이 늘었다: '+allowed.join(', ')+' — src/lib/mdx.ts 하나여야 한다 (ADR-003)');
console.log('MDX 파이프라인 무결 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('content').filter(f=>f.endsWith('.mdx'));
const need=files.filter(f=>/\/(hf-blog|papers)\//.test(f));
for(const f of need){ if(!/^\s*url:/m.test(fs.readFileSync(f,'utf8'))) throw new Error(f+' 에 source.url 이 없다 — 출처 없는 게시는 금지다'); }
console.log('출처 표기 OK ('+need.length+'편)');
"
node -e "
const out=require('child_process').execSync('cat .next/prerender-manifest.json',{encoding:'utf8'});
const routes=Object.keys(JSON.parse(out).routes||{});
const posts=routes.filter(r=>/^\/(hf-blog|papers|notes)\/[^/]+$/.test(r));
if(posts.length<8) throw new Error('글 상세 프리렌더가 '+posts.length+'개뿐이다 — SSG 가 깨졌다');
console.log('글 상세 SSG 유지 OK ('+posts.length+'편)');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - **`source.url` 링크가 여전히 눈에 잘 띄는가?** (CRITICAL — 출처 없는 번역 게시 금지)
   - MDX 컴파일 진입점이 `src/lib/mdx.ts` 하나인가? (ADR-003, 프리뷰용 별도 파이프라인 금지)
   - 글 상세가 정적 생성을 유지하는가?
   - 조회수·댓글 실패가 글 렌더를 막지 않는가?
   - 홈과 글 상세가 **서로 다른 물건처럼 보이는가?** (긴장 축의 양 끝)
3. `phases/blog-7-design-system/index.json` 의 step 5 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **기사면 구성 요소와 정정 표기의 형태**를 기록
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`.ratio-scale` 을 두 곳 이상에서 쓰지 마라.** 이유: 한 화면에 한 번이라야 뜻이 산다.
- **비율 계산을 다시 구현하지 마라.** step 1 의 `compressionRatio` 만 쓴다.
- **출처 링크를 약하게 만들지 마라.** 이유: 출처 표기는 `CLAUDE.md` 의 CRITICAL 규칙이고, 원문 링크를 못 찾으면 실패다.
- **MDX 컴파일 진입점을 늘리지 마라.** 이유: 프리뷰와 실제 렌더가 갈라지면 "프리뷰는 되는데 발행하면 깨진다"가 반드시 생긴다 (ADR-003).
- **정정 표기에 안료를 쓰지 마라.** 이유: 정정은 경고가 아니라 기록이다.
- **`design/` 아래 파일을 수정하지 마라.**
- 기존 테스트를 깨뜨리지 마라.
