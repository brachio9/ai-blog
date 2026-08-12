# Step 1: github-service

GitHub Contents API 래퍼를 만든다. 관리자 화면이 글을 **읽고 쓰는 유일한 통로**다.
UI 는 다음 step 들 소관이므로 여기서는 **서비스 계층과 테스트만** 만든다.

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — `src/services/` 계약("외부 API 호출은 반드시 래퍼를 경유한다"), 발행 흐름, 실패 처리 원칙("발행 실패는 관리자에게 원인을 그대로 노출한다")
- `/docs/ADR.md` — ADR-001 (글 본문은 git), ADR-005 (이미지도 레포에 커밋)
- `/CLAUDE.md` — CRITICAL: 본문은 `content/**/*.mdx` 에만 · 비밀값은 환경변수로만 · 환경변수 이름 표 고정
- `/src/services/turso.ts` — **이미 존재하는 서비스 래퍼.** 환경변수가 없을 때 예외 대신 조용히 비활성화하는 패턴을 여기서 따온다.
- `/src/lib/content/schema.ts` — `parseFrontmatter(raw, filePath)`. 원격 파일의 frontmatter 검증에 **그대로 재사용**한다. 스키마를 다시 정의하지 마라.
- `/src/lib/content/posts.ts` — 파일명 규약 `content/{category}/YYYY-MM-DD-{slug}.mdx`
- `/src/lib/categories.ts` — `CATEGORIES` · `CategorySlug`

사용할 환경변수 (CLAUDE.md 표에 이미 있다 — 새로 만들지 마라):
`GITHUB_CONTENT_REPO` (`owner/repo`) · `GITHUB_CONTENT_BRANCH` · `GITHUB_CONTENT_TOKEN`

## 이미 확인된 사실 (실제 레포에 요청을 보내 확인했다 — 재조사하지 마라)

1. **없는 디렉토리에 바로 파일을 만들 수 있다.** `PUT /repos/{repo}/contents/a/b/c/d.md` 로 3단계 중첩 경로를 한 번에 생성 → `201`. 디렉토리를 미리 만들 필요가 없다.
2. **덮어쓰려면 기존 `sha` 가 필요하다.** sha 없이 같은 경로에 `PUT` → `422 "sha" wasn't supplied.` sha 를 주면 `200`. → 신규/수정 분기는 **먼저 `GET` 해서 404 면 신규, 200 이면 그 `sha` 로 수정**이다.
3. **바이너리도 같은 엔드포인트로 올라간다.** 1x1 PNG 를 base64 로 실어 `PUT` → `201`. 별도 업로드 API 가 필요 없다.
4. **없는 경로 `GET` 은 404** 다. 예외가 아니라 분기 신호로 쓸 수 있다.
5. 준비된 fine-grained PAT 은 이 레포에 대해 Contents 읽기·쓰기가 **실제로 동작**한다 (파일 생성·수정·삭제·브랜치 생성/삭제까지 확인).

## 작업

### `src/services/github.ts`

노출할 것 (시그니처는 재량이되 역할은 이대로):

```ts
export function isPublishConfigured(): boolean;   // 3개 환경변수가 전부 있는가

export interface RemoteFile { path: string; sha: string; content: string; }
export interface RemotePostSummary {
  path: string;                 // content/papers/2026-08-05-foo.mdx
  category: CategorySlug;
  slug: string;
  sha: string;
  frontmatter: PostFrontmatter;
}

export async function listPosts(): Promise<RemotePostSummary[]>;
export async function readFile(path: string): Promise<RemoteFile | null>;   // 없으면 null
export async function commitFile(input: {
  path: string; content: string; message: string; sha?: string;
}): Promise<{ sha: string; commitUrl: string }>;
export async function commitBinaryFile(input: {
  path: string; base64: string; message: string;
}): Promise<{ sha: string; commitUrl: string }>;
export async function deleteFile(input: {
  path: string; sha: string; message: string;
}): Promise<void>;
```

핵심 불변식:

- **`GITHUB_CONTENT_TOKEN` 이 에러 메시지·로그·반환값에 절대 섞이지 않는다.** (CLAUDE.md CRITICAL) 에러를 감싸 던질 때 요청 헤더를 통째로 찍지 마라.
- 환경변수가 없으면 `isPublishConfigured()` 가 `false` 를 반환하고, 쓰기 함수는 **명확한 에러를 던진다.** 조용히 성공한 척하지 마라 — 글이 사라진다.
- **한글 본문은 `Buffer.from(text, "utf8").toString("base64")` 로 인코딩한다.** `btoa` 계열을 쓰면 한글이 깨진다. 디코딩도 대칭으로.
- API 실패는 **GitHub 이 준 상태코드와 메시지를 담아** 던진다 (ARCHITECTURE: 원인을 그대로 노출). `422` 는 sha 충돌, `409` 는 브랜치 충돌임을 구분할 수 있게 하라.
- `listPosts()` 는 카테고리 디렉토리를 훑어 파일 목록을 얻고 각 파일의 frontmatter 를 읽는다. 파일 수만큼 요청이 나가므로(N+1) **동시 요청 수를 제한**하라(예: 5). 개인 블로그 규모(수십 건)에서 감당 가능한 비용이며, PAT rate limit 은 시간당 5000 이다.
- `listPosts()` 에서 **한 글의 frontmatter 가 깨져도 목록 전체가 죽으면 안 된다.** 그 글만 오류 표시로 남기고 나머지를 반환하라. 이유: 관리자 화면은 깨진 글을 **고치러** 들어오는 곳이다. 여기서 예외를 던지면 고칠 방법이 사라진다. (빌드 타임 로더의 "검증 실패 = 빌드 실패" 원칙은 그대로다 — 반대 방향의 규칙이 아니라 다른 국면이다.)
- 브랜치는 `GITHUB_CONTENT_BRANCH` 를 쓴다. 기본값은 `main`.
- `fetch` 에 `cache: "no-store"` 를 준다. 관리자 목록이 캐시된 옛 상태를 보여주면 안 된다.

### 테스트 — `src/services/github.test.ts`

**실제 GitHub 에 요청을 보내지 마라.** `fetch` 를 모킹해 검증한다:

- `isPublishConfigured()` — 환경변수 하나라도 빠지면 `false`
- `readFile()` — 404 응답에 `null` 반환 (예외 아님)
- `readFile()` — base64 한글 본문이 원문 그대로 복원되는가 (**왕복 검증**)
- `commitFile()` — 한글 본문이 올바른 base64 로 실려 나가는가
- `commitFile()` — `sha` 를 주면 요청 body 에 포함, 안 주면 빠지는가
- 실패 응답(401/422)에서 던지는 에러 메시지에 **상태코드가 담기고 토큰 문자열은 담기지 않는가**
- `listPosts()` — frontmatter 가 깨진 파일이 섞여도 나머지가 반환되는가
- `deleteFile()` — `sha` 와 `branch` 가 body 에 실리는가

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/services/github.ts','src/services/github.test.ts']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
const s=fs.readFileSync('src/services/github.ts','utf8');
for (const k of ['GITHUB_CONTENT_REPO','GITHUB_CONTENT_BRANCH','GITHUB_CONTENT_TOKEN']) {
  if(!s.includes(k)) throw new Error('환경변수 '+k+' 를 쓰지 않는다 (CLAUDE.md 표 고정)');
}
if(!/Buffer\.from/.test(s)) throw new Error('Buffer 로 base64 인코딩하지 않는다 — 한글이 깨진다');
if(/\bbtoa\s*\(/.test(s)) throw new Error('btoa 를 쓰지 마라 — 한글 본문이 깨진다');
if(!/no-store/.test(s)) throw new Error('fetch 에 cache: no-store 가 없다 — 관리자 목록이 옛 상태를 보여준다');
if(!/schema|parseFrontmatter/.test(s)) throw new Error('frontmatter 검증을 재사용하지 않는다 — 스키마를 이중 정의했을 가능성');
console.log('github 서비스 파일/규약 OK');
"
node -e "
const fs=require('fs');
const t=fs.readFileSync('src/services/github.test.ts','utf8');
if(!/vi\.(fn|spyOn|stubGlobal)|mock/.test(t)) throw new Error('fetch 를 모킹하지 않는다 — 테스트가 실제 GitHub 를 부르면 안 된다');
if(!/한글|utf|base64/i.test(t)) throw new Error('base64 한글 왕복 테스트가 없다');
console.log('github 서비스 테스트 OK');
"
node -e "
const fs=require('fs');
const files=[];
(function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=d+'/'+e.name; if(e.isDirectory()) walk(p); else if(/\.(ts|tsx)\$/.test(e.name)) files.push(p);} })('src');
const offenders=files.filter(f=>!f.includes('/services/')).filter(f=>/api\.github\.com/.test(fs.readFileSync(f,'utf8')));
if(offenders.length) throw new Error('services 밖에서 GitHub API 를 직접 부른다: '+offenders.join(', '));
console.log('외부 호출 경계 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. 실제 API 왕복은 **하지 마라.** 이 step 은 모킹 테스트까지다. 실제 커밋은 step 4 에서 사람이 확인한다.
3. 아키텍처 체크리스트:
   - 외부 호출이 `src/services/` 안에만 있는가? (ARCHITECTURE 계약)
   - frontmatter 스키마를 재사용했는가, 다시 정의하지 않았는가?
   - 토큰이 에러 메시지·로그로 새지 않는가? (CLAUDE.md CRITICAL)
   - 환경변수 이름이 CLAUDE.md 표와 정확히 같은가?
4. `phases/blog-4-admin/index.json` 의 step 1 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **노출한 함수 시그니처와 반환 타입, 에러 처리 방식(404→null, 422 의미), 동시성 제한값**을 한 줄로 기록. step 2·4 가 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **테스트에서 실제 GitHub API 를 호출하지 마라.** 네트워크 없이 돌아야 하고, 남의 레포에 쓰레기 커밋을 남기면 안 된다.
- **`.env.local` 을 편집하거나 출력하지 마라.**
- **토큰을 로그·에러·주석에 넣지 마라.**
- **UI 를 만들지 마라.** step 2~4 의 범위다.
- **frontmatter 스키마를 다시 정의하지 마라.** `src/lib/content/schema.ts` 를 재사용한다.
- **`src/lib/content/posts.ts` 를 수정하지 마라.** 그건 빌드 타임 로더이고 이 서비스는 런타임 원격 조회다. 둘은 별개다.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-4-admin/index.json` 의 step 1 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라.
