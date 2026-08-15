# Step 3: serialization

직렬화 산출물(OG·RSS·sitemap·검색 인덱스)과 관리자 에디터를 5칸에 맞춘다. **이 phase 의 마지막 step 이다.**

## 읽어야 할 파일

- `src/lib/feed.ts` — RSS
- `src/app/sitemap.ts`
- `src/app/(public)/[category]/[slug]/opengraph-image.tsx` — step 0 이 `ACCENT_COLOR` 를 채웠다
- `src/app/admin/editor/Editor.tsx` · `src/app/admin/editor/draft.ts` — 카테고리 select
- `src/app/api/publish/publish.ts` — 발행 경로
- `src/lib/categories.ts` — 정본

## 작업

### 1) RSS · sitemap · 검색 인덱스

`CATEGORIES` 를 순회하는 코드라면 **대부분 자동으로 5칸이 된다.** 확인하고, 하드코딩된 곳만 고쳐라.

- sitemap 에 카테고리 5경로가 모두 들어가는가
- RSS `<category>` 는 blog-8 이 **축 이름**을 싣도록 해 뒀다 — **바꾸지 마라**
- 검색 인덱스(`SearchDoc`)에 카테고리가 실린다면 새 slug 으로 나오는가

### 2) OG 이미지

색은 step 0 이 넣었다. 여기서는 **구워진 결과를 실측**한다.

- 카테고리 5칸의 카드가 각각 올바른 색으로 나오는가
- **먹 2칸이 바탕(#fafafa)과 충분히 대비되는가** — 4.5:1 이상
- 카드에 그리는 카테고리 **이름**이 새 이름(논문/릴리즈/소식/커뮤니티/기록)인가

빌드 산출물의 PNG 픽셀을 직접 읽어 확인하라 — 소스만 보고 판단하지 마라 (blog-8 이 그렇게 했다).

### 3) 관리자 에디터

- 카테고리 select 가 **5개**인가 (`CATEGORIES` 순회)
- `draft.ts` 의 기본 카테고리가 유효한 slug 인가
- **왕복 무손실을 반드시 확인하라**: 실제 글 파일을 `toDraftForm` → `toFrontmatterObject` 로 돌렸을 때
  `axis`·`lead`·`source.words`·`category` 가 하나도 사라지지 않는가.
  이유: blog-7 이 `lead`·`source.words` 를 조용히 지우는 결함을 냈고 blog-8 이 고쳤다. **재발 검사다.**

### 4) `publish.ts` 경로 화이트리스트

새 slug 3개(`releases`·`news`·`community`)로 발행이 가능한가.
`hf-blog` 가 화이트리스트에 남아 있으면 지워라.

## Acceptance Criteria

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

```bash
node -e "const fs=require('fs'); const files=['src/lib/feed.ts','src/app/sitemap.ts','src/app/api/publish/publish.ts','src/app/admin/editor/draft.ts','src/app/admin/editor/Editor.tsx']; for(const f of files){ const t=fs.readFileSync(f,'utf8'); if(t.includes('hf-blog')) throw new Error('hf-blog 잔존: '+f); } console.log('직렬화·관리자 코드 OK')"
```

```bash
node -e "const m=require('./.next/prerender-manifest.json'); const r=Object.keys(m.routes); const cats=['/papers','/releases','/news','/community','/notes']; for(const c of cats) if(!r.includes(c)) throw new Error('없음: '+c); const posts=r.filter(x=>x.split('/').length===3&&!x.startsWith('/topics')); console.log('프리렌더 '+r.length+'경로 · 카테고리 5 · 글 '+posts.length)"
```

```bash
node -e "const fs=require('fs'); const t=fs.readFileSync('.next/server/app/sitemap.xml.body','utf8'); for(const c of ['/papers','/releases','/news','/community','/notes']) if(!t.includes(c)) throw new Error('sitemap 누락: '+c); console.log('sitemap OK')"
```

> 위 sitemap 검사 경로가 이 Next 버전에서 다르면 **검사식을 고쳐서 통과를 확인**하고, 무엇을 어떻게 고쳤는지 `notes` 에 남겨라. 검사를 생략하지 마라.

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. **실측한다**:
   - 구워진 OG PNG 5장의 막대 색을 픽셀로 읽어 `ACCENT_COLOR` 값과 일치하는지 확인
   - `/rss.xml` 을 열어 9편이 모두 들어가고 링크가 새 주소인지 확인
   - 에디터 왕복 무손실 (위 3번)
3. 아키텍처 체크리스트:
   - 조회수·댓글 실패가 글 렌더를 막지 않는가
   - frontmatter 검증 실패는 반대로 빌드를 깨뜨리는가
   - 비밀값이 코드·커밋에 없는가
4. `phases/blog-9-recategorize/index.json` 의 step 3 을 `"status": "completed"` 로 갱신하고,
   **`summary` 에 이 step 의 산출물을 한 줄로 요약**하라 — 고친 파일, OG 5색 실측값, 프리렌더 경로 수,
   에디터 왕복 무손실 확인 결과를 남긴다. 실패했다면 `"error"` + `error_message`,
   사람 개입이 필요하면 `"blocked"` + `blocked_reason` 을 기록하고 즉시 중단하라.

## 금지사항

- **RSS 의 `<category>` 를 카테고리 이름으로 바꾸지 마라.** 지금 축 이름이 들어간다 — blog-8 의 의도된 결정이다.
- **`categories.ts`·`globals.css`·콘텐츠·화면 배치를 고치지 마라.** step 0~2 의 산출물이다.
- **OG 색을 oklch 로 적지 마라.** satori 가 못 읽고 **경고 없이 검정**이 된다.
- **에디터에서 `axis`·`lead`·`source.words` 배선을 끊지 마라.** blog-8 이 고친 결함의 재발 지점이다.
- 기존 테스트를 깨뜨리지 마라.
