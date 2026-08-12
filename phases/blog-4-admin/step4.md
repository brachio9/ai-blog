# Step 4: publish

에디터가 쓴 글을 실제로 레포에 커밋한다. 이미지 업로드도 여기서 붙인다. 이 phase 의 마지막 step 이다.

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — 발행 흐름(`/admin 에디터 → /api/publish → services/github.ts → 커밋 → Vercel 재배포`), 실패 처리("발행 실패는 관리자에게 원인을 그대로 노출한다")
- `/docs/ADR.md` — ADR-001 (글은 git), **ADR-005 (이미지도 레포에 커밋 — R2 를 쓰지 않는다)**
- `/CLAUDE.md` — CRITICAL: 본문은 `content/**/*.mdx` 에만 · 비밀값은 환경변수로만 · 커밋 메시지는 Conventional Commits
- `/src/services/github.ts` — **step 1 이 만들었다.** `commitFile` · `commitBinaryFile` · `deleteFile` · `readFile` · `isPublishConfigured`
- `/src/lib/auth.ts` — **step 0 이 만들었다.** API 라우트용 세션 조회 헬퍼 `getAdminLogin(): Promise<string | null>` (페이지용 `requireAdmin()` 은 `notFound()` 를 던지므로 라우트에서는 쓰지 않는다)
- `/src/app/admin/editor/Editor.tsx` · `page.tsx` — **step 3 이 만들었다.** 저장 버튼 자리가 비활성으로 있다
- `/src/app/api/views/route.ts` — 기존 API 라우트. 입력 검증·에러 응답 형태를 여기에 맞춘다
- `/src/proxy.ts` — `/api/publish` · `/api/upload` 가 matcher 에 이미 들어 있다 (step 0)

## 이미 확인된 사실 (실제 레포에 요청을 보내 확인했다)

1. 없는 디렉토리에 바로 파일 생성 가능 → `public/uploads/2026/08/` 을 미리 만들 필요가 없다.
2. 덮어쓰기에는 기존 `sha` 필수 (없으면 `422`). 신규/수정 분기는 `readFile()` 의 `null` 여부로 판단한다.
3. 바이너리는 base64 로 같은 엔드포인트에 올린다.

## 작업

### 1) `/api/publish` — `src/app/api/publish/route.ts`

`POST`: 글 저장 (신규·수정 공통), `DELETE`: 글 삭제.

- **첫 줄에서 `getAdminLogin()` 으로 세션·화이트리스트를 확인한다.** proxy 가 matcher 로 덮고 있어도 라우트에서 다시 본다 (CLAUDE.md CRITICAL — 이중 확인). `null` 이면 **404** 로 응답한다. 401/403 은 "여기 뭔가 있다" 를 알려 준다.
- 입력: `{ path, content, message?, sha? }` — `content` 는 frontmatter 를 포함한 **완성된 MDX 문자열**이다.
- **경로 검증이 이 step 의 핵심 안전장치다.** 허용하는 것은 오직:
  - 글: `content/{category}/YYYY-MM-DD-{slug}.mdx` — `{category}` 는 `CATEGORIES` 의 slug, `{slug}` 는 `^[a-z0-9]+(-[a-z0-9]+)*$`
  - 그 외 전부 거부(400). 특히 `..` · 절대경로 · 백슬래시 · 퍼센트 인코딩(`%2e`)을 막아라. 검증은 **문자열 조립이 아니라 정규식 화이트리스트**로 하라.
  - 이유: 이 라우트는 인증된 사람이 레포에 파일을 쓰는 통로다. 경로를 검증하지 않으면 `.github/workflows/*` 나 `src/*` 를 덮어쓸 수 있다.
- 저장 전에 **frontmatter 를 zod 스키마로 다시 검증**한다 (`src/lib/content/schema.ts`). 클라이언트 검증만 믿지 마라. 깨진 frontmatter 가 커밋되면 **다음 빌드가 통째로 실패**한다.
- 커밋 메시지 (Conventional Commits):
  - 신규: `feat(content): {category}/{slug}`
  - 수정: `fix(content): {category}/{slug}` 또는 `docs(content): ...`
  - 삭제: `chore(content): remove {category}/{slug}`
  - 사용자가 메시지를 직접 넣을 수 있게 하되 기본값을 위 형태로 채워라.
- 응답에 **커밋 URL** 을 담아 돌려준다. 사용자가 결과를 직접 확인할 수 있어야 한다.
- 실패 시 GitHub 이 준 상태코드·메시지를 그대로 전달한다. 단 **토큰은 절대 응답에 넣지 마라.**
- `422`(sha 불일치)는 "다른 곳에서 이미 수정됨" 으로 번역해 보여줘라. 사용자가 덮어쓸지 판단할 수 있어야 한다.

### 2) `/api/upload` — `src/app/api/upload/route.ts`

이미지를 `public/uploads/{YYYY}/{MM}/{파일명}` 으로 커밋한다 (ADR-005 — R2 를 쓰지 마라).

- 세션 확인 · 404 응답 규칙은 위와 같다.
- 허용 확장자: `png` · `jpg` · `jpeg` · `webp` · `gif` · `svg`. 그 외 거부.
- 파일명은 **서버가 정한다.** 업로드된 이름을 그대로 쓰지 말고 `^[a-z0-9-]+$` 로 정규화하거나 새로 만들어라 (경로 주입 차단).
- **크기 상한을 두어라 (4MB 권장).** 이유: Vercel 서버리스 요청 본문 한도(약 4.5MB)를 넘으면 라우트에 도달하기도 전에 실패해 원인을 알 수 없는 에러가 난다. 초과 시 명확한 메시지로 거부하라.
- 응답으로 `/uploads/{YYYY}/{MM}/{파일명}` 경로를 돌려주고, 에디터가 본문에 `![설명](경로)` 를 삽입한다.
- SVG 는 `next.config.ts` 가 이미 CSP 로 묶어 허용하고 있다. 설정을 바꾸지 마라.
- **업로드는 글 저장과 별개의 커밋이다.** ADR-005 의 "글과 같은 방식으로 커밋" 은 같은 레포·같은 API 를 쓴다는 뜻이지 한 커밋에 묶으라는 뜻이 아니다. Git Trees API 로 원자 커밋을 만들려 하지 마라 — 복잡도만 늘고 이득이 없다.
- 그 대가로 **글을 저장하지 않고 떠나면 이미지만 레포에 남는다.** 이걸 숨기지 마라: 업로드 직후 사용자에게 "이미지가 레포에 커밋되었다" 는 사실을 알려라.
- **방금 올린 이미지는 재배포 전까지 프리뷰에서 깨져 보인다** (`/uploads/...` 가 아직 배포본에 없다). 이건 버그가 아니다. 에디터가 그렇게 안내하라. 프리뷰에서만 다른 URL 로 바꿔치기하지 마라 — 프리뷰와 실제가 갈라진다.

### 3) 에디터 연결

step 3 이 만든 저장 버튼을 살린다.

- 저장 → `/api/publish` 호출 → 성공하면 커밋 URL 과 함께 **"반영까지 재배포 ~90초"** 를 알려 준다. 이게 없으면 사용자는 사이트를 새로고침하며 버그라고 생각한다.
- 삭제 버튼 (기존 글일 때만). **되돌릴 수 없다는 확인 절차**를 두어라.
- 이미지 삽입 버튼 → 파일 선택 → `/api/upload` → 본문 커서 위치에 마크다운 삽입.
- 저장 중 중복 클릭을 막아라 (같은 글이 두 번 커밋되면 두 번째는 `422` 로 실패한다).
- 실패 메시지는 **원인을 그대로** 보여준다 (ARCHITECTURE).

### 4) 테스트

`src/app/api/publish/*.test.ts` 등에 순수 검증 로직을 둔다. `fetch` 는 모킹한다:

- **경로 화이트리스트**: `content/papers/2026-08-05-foo.mdx` 통과 / `../../.github/workflows/x.yml` · `/etc/passwd` · `content/papers/../../src/a.ts` · `content%2f..` · 알 수 없는 카테고리 · 한글 slug · `.txt` 확장자 → 전부 거부
- 업로드 확장자·크기 검증
- 업로드 파일명 정규화 (`../evil.png` → 거부 또는 안전한 이름)
- frontmatter 검증 실패 시 커밋하지 않고 400
- 인증 없는 요청 → 404 (그리고 **GitHub 에 요청이 나가지 않았는지** 확인)
- 커밋 메시지 기본값이 Conventional Commits 형태인가

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/app/api/publish/route.ts','src/app/api/upload/route.ts']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
const p=fs.readFileSync('src/app/api/publish/route.ts','utf8');
const u=fs.readFileSync('src/app/api/upload/route.ts','utf8');
for (const [n,s] of [['publish',p],['upload',u]]) {
  if(!/auth|session|Admin/i.test(s)) throw new Error(n+' 라우트가 인증을 확인하지 않는다 (CLAUDE.md CRITICAL)');
  if(!/404/.test(s)) throw new Error(n+' 라우트가 미인증에 404 를 주지 않는다');
  if(/GITHUB_CONTENT_TOKEN/.test(s)) throw new Error(n+' 라우트가 토큰을 직접 만진다 — services/github.ts 를 경유하라');
}
if(!/content\\//.test(p)) throw new Error('publish 가 content/ 경로 화이트리스트를 갖지 않는다');
if(!/uploads/.test(u)) throw new Error('upload 가 public/uploads 경로를 쓰지 않는다');
if(/R2|r2\.|aws-sdk|presigned/i.test(u)) throw new Error('R2 를 쓰지 마라 (ADR-005 — 이미지도 레포에 커밋)');
console.log('발행/업로드 라우트 규약 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const files=[];
(function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const q=path.join(d,e.name); if(e.isDirectory()) walk(q); else if(/\.test\.tsx?\$/.test(e.name)) files.push(q);} })('src');
const joined=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
for (const k of ['..','workflows']) if(!joined.includes(k)) throw new Error('경로 순회 거부 테스트가 없다 (키워드: '+k+')');
console.log('경로 순회 테스트 OK');
"
node -e "
const { execSync } = require('child_process');
const out = execSync('npx next build', { encoding: 'utf8' });
if(!/Proxy \(Middleware\)/.test(out)) throw new Error('라우트 표에 Proxy 가 없다');
for (const r of ['/api/publish','/api/upload']) if(!out.includes(r)) throw new Error('라우트 표에 '+r+' 이 없다');
console.log('라우트 등록 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. `npm run dev` 후 로그인해 **실제로 한 바퀴 돌린다.** 이 step 은 실제 커밋이 나가는 유일한 step 이다:
   - 신규 글 작성 → 저장 → **GitHub 레포에 파일이 생겼는지 커밋 URL 로 확인**
   - 같은 글을 수정 → 저장 → 커밋이 하나 더 쌓이는지
   - 이미지 업로드 → 본문에 마크다운이 삽입되고 프리뷰에 보이는지
   - 삭제 → 파일이 사라지는지
   - **테스트로 만든 글은 마지막에 지워라.** 레포는 public 이다.
3. 인증 없이 API 를 때려 본다 (로그아웃 상태 또는 다른 브라우저):
   ```bash
   curl -s -o /dev/null -w "publish=%{http_code}\n" -X POST http://localhost:3000/api/publish \
     -H "content-type: application/json" -d '{"path":"content/notes/2026-01-01-x.mdx","content":"x"}'
   ```
   → **404** 여야 한다. 200 이면 누구나 레포에 커밋할 수 있다는 뜻이다.
4. 경로 순회를 실제로 막는지 로그인 상태에서 확인한다 (`../` 가 섞인 path → 400, 커밋이 나가지 않음).
5. 아키텍처 체크리스트:
   - 본문이 `content/**/*.mdx` 로만 가는가? DB 에 넣지 않았는가? (CLAUDE.md CRITICAL)
   - 이미지가 레포에 커밋되는가? R2 를 쓰지 않았는가? (ADR-005)
   - 외부 호출이 `src/services/github.ts` 를 경유하는가?
   - 커밋 메시지가 Conventional Commits 인가?
   - 공개 페이지가 그대로이고 글 상세가 여전히 SSG(`●`) 인가?
6. `phases/blog-4-admin/index.json` 의 step 4 를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **API 경로와 요청/응답 형태, 경로 화이트리스트 규칙, 업로드 제약(확장자·크기), 실제 커밋 검증 결과**를 한 줄로 기록.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **경로 검증 없이 커밋하지 마라.** 화이트리스트 정규식으로만 통과시킨다.
- **`content/` 와 `public/uploads/` 밖의 경로를 쓰지 마라.** 특히 `.github/` · `src/` · `docs/` · `CLAUDE.md` 는 절대 대상이 아니다.
- **Cloudflare R2 를 쓰지 마라** (ADR-005). `R2_*` 환경변수를 만들지 마라.
- **테스트가 실제 GitHub 에 커밋하게 하지 마라.** `fetch` 를 모킹한다.
- **`.env.local` 을 편집하거나 출력하지 마라. 토큰을 응답·로그에 넣지 마라.**
- **`git push --force` 계열을 쓰지 마라.** 이 기능은 Contents API 로만 쓴다.
- **공개 페이지·`src/lib/content/`·`src/components/post/` 를 수정하지 마라.**
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-4-admin/index.json` 의 step 4 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
