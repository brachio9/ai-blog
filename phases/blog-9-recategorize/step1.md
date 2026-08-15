# Step 1: content-migration

글 9편을 새 카테고리로 옮긴다. **디렉토리 이동 + frontmatter 수정**이 전부다 — 화면은 건드리지 않는다.

## 읽어야 할 파일

- `src/lib/categories.ts` — step 0 이 만든 5칸 (정본)
- `src/lib/content/posts.ts` — `readCategory` 가 디렉토리를 어떻게 읽는지
- `src/lib/content/schema.ts` — frontmatter 검증 규칙
- `content/hf-blog/*.mdx` 3편 — 옮길 대상
- `src/app/admin/editor/draft.ts` · `src/app/api/publish/publish.ts` — 카테고리 slug 을 경로로 쓰는 곳

## 작업

### 1) 디렉토리 재배치

```
content/hf-blog/  →  content/news/     (3편 전부)
content/papers/                         (그대로)
content/notes/                          (그대로)
content/releases/.gitkeep               (신규 — 빈 칸)
content/community/.gitkeep              (신규 — 빈 칸)
```

**`hf-blog` 3편이 전부 `news` 로 가는 근거**: 셋 다 원문이 `huggingface.co/blog/…` 즉 **기업 블로그**다.
`releases` 는 GitHub 릴리즈 노트(`releases.atom`)가 오는 자리라 지금은 해당 글이 없다.

**`releases`·`community` 가 0편으로 시작하는 것은 정상이다.** 감추지 마라 —
blog-8 이 0편 축을 그대로 보여주기로 이미 정했고, 그것이 「무엇을 더 모아야 하는가」의 정보다.
`.gitkeep` 을 두는 이유: git 은 빈 디렉토리를 추적하지 않는데, `posts.ts` 의 `readCategory` 는
`existsSync` 로 없는 디렉토리를 이미 안전하게 넘긴다(빈 배열). dotfile 은 `readdirSync` 필터가 거른다.

**파일 이름(`YYYY-MM-DD-slug.mdx`)은 바꾸지 마라.** 디렉토리만 옮긴다.
`git mv` 를 써서 이력이 이어지게 하라.

### 2) frontmatter `category` 수정

옮긴 3편의 `category: hf-blog` → `category: news`.
`papers`·`notes` 6편은 slug 이 그대로라 **수정할 것이 없다** — 손대지 마라.

**다른 필드는 한 글자도 건드리지 마라.** 특히 `axis`·`lead`·`source.words` 는
blog-8 이 유실 결함을 고쳐 넣은 값이다. 왕복하며 지우지 않도록 주의하라.

### 3) 경로를 쓰는 코드 확인

`publish.ts` 의 경로 화이트리스트나 `draft.ts` 의 기본 카테고리처럼
**slug 문자열이 하드코딩된 곳**이 있는지 grep 하고, 있으면 새 slug 으로 맞춰라.
`hf-blog` 라는 문자열이 코드·테스트·픽스처 어디에도 남으면 안 된다.

## Acceptance Criteria

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

```bash
node -e "const fs=require('fs'); if(fs.existsSync('content/hf-blog')) throw new Error('content/hf-blog 가 남아 있다'); for(const d of ['papers','releases','news','community','notes']) if(!fs.existsSync('content/'+d)) throw new Error('없음: content/'+d); const n=fs.readdirSync('content/news').filter(f=>f.endsWith('.mdx')); if(n.length!==3) throw new Error('news 는 3편이어야 한다: '+n.length); console.log('디렉토리 OK')"
```

```bash
node -e "const fs=require('fs'); let total=0; for(const d of ['papers','releases','news','community','notes']){ for(const f of fs.readdirSync('content/'+d).filter(x=>x.endsWith('.mdx'))){ total++; const t=fs.readFileSync('content/'+d+'/'+f,'utf8'); const m=t.match(/^category:\s*(\S+)/m); if(!m) throw new Error('category 없음: '+f); if(m[1].replace(/[\"']/g,'')!==d) throw new Error('category 불일치: '+f+' -> '+m[1]); } } if(total!==9) throw new Error('글이 9편이 아니다: '+total); console.log('frontmatter OK, 9편')"
```

```bash
grep -rn "hf-blog" src/ content/ docs/ || echo "hf-blog 잔존 없음 (grep 결과 없음이 정상)"
```

```bash
node -e "const fs=require('fs'); const t=fs.readFileSync('content/papers/2026-08-05-moe-routing-pipeline.mdx','utf8'); for(const k of ['axis:','source:','words:']) if(!t.includes(k)) throw new Error('blog-8 이 넣은 필드가 사라졌다: '+k); console.log('기존 필드 보존 OK')"
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. 아키텍처 체크리스트:
   - **본문은 `content/**/*.mdx` 파일에만** 있는가 (CLAUDE.md CRITICAL — DB 에 넣지 마라)
   - frontmatter 검증 실패가 **빌드를 깨뜨리는가** — `news` 글 하나의 `category` 를 잠시 `hf-blog` 로 바꿔 `npm run build` 가 실패하는지 확인하고 **반드시 원상복구**하라 (`git diff` 가 비어야 한다)
   - 프리렌더 경로 수를 `.next/prerender-manifest.json` 의 `routes` 로 센다. **빌드 로그로 세지 마라** — Next 는 그룹당 3경로만 찍고 나머지를 `[+N more paths]` 로 접는다
3. `phases/blog-9-recategorize/index.json` 의 step 1 을 갱신한다.
   `summary` 에 **카테고리별 편수**와 **프리렌더 경로 수 변화**를 남겨라.

## 금지사항

- **`categories.ts` 나 `globals.css` 를 고치지 마라.** 이유: step 0 이 이미 정본을 만들었다. 여기서 또 고치면 두 곳이 갈린다.
- **화면·문구를 바꾸지 마라** (헤더·홈·about). 이유: step 2 의 범위다.
- **글 본문(MDX 내용)을 고치지 마라.** `category` 한 줄만 바꾼다.
- **`axis`·`lead`·`source.words` 를 건드리지 마라.** 이유: blog-8 이 에디터 유실 결함을 고쳐 넣은 값이고, 사라져도 zod 가 못 잡는다(default/optional).
- **빈 카테고리를 없애거나 감추지 마라.** `releases`·`community` 는 0편으로 시작하는 것이 정상이다.
- 기존 테스트를 깨뜨리지 마라. 픽스처에 `hf-blog` 가 있으면 새 slug 으로 갱신하라.
