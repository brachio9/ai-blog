# Step 0: auth

관리자 인증을 세운다. Auth.js v5 GitHub OAuth + 허용 계정 화이트리스트 + `src/proxy.ts` 보호.
UI 기능(목록·에디터·발행)은 다음 step 들 소관이므로 여기서는 **로그인/차단 골격만** 만든다.

## 읽어야 할 파일

- `/CLAUDE.md` — CRITICAL: `/admin/*` 은 `proxy.ts` 로 전부 보호하고 **각 페이지/라우트에서 화이트리스트로 다시 확인**한다. `middleware.ts` 를 만들지 마라. 비밀값은 환경변수로만.
- `/docs/ARCHITECTURE.md` — `src/proxy.ts` · `src/app/admin/` 계약, "proxy + 페이지 레벨 세션 확인 이중 보호"
- `/docs/ADR.md` — ADR-006 (Auth.js v5 GitHub OAuth + 화이트리스트)
- `/docs/UI_GUIDE.md` — 관리자 화면도 같은 토큰을 쓴다. AI 슬롭 안티패턴 표를 지켜라.
- `/src/app/layout.tsx` — **루트 레이아웃. 이미 존재한다.** 여기에 헤더/푸터가 없고 `(public)/layout.tsx` 가 공개용 껍데기를 담당한다. `/admin` 은 `(public)` 밖이므로 공개 헤더·푸터를 상속하지 않는다 — 이 구조를 그대로 이용하라.
- `/src/app/(public)/layout.tsx` — 공개 껍데기 (수정 금지, 참고용)
- `/src/lib/theme.ts` — 테마 상수. 관리자 화면도 다크모드가 깨지면 안 된다.

## 이미 확인된 사실 (그대로 믿고 써라 — 재조사하지 마라)

이 phase 설계 전에 Next 16.3.0 + React 19.2.8 환경에서 **실측한 결과**다.

1. `npm i next-auth@beta` → **5.0.0-beta.32**. Next 16 · React 19 에서 빌드·런타임 모두 정상.
2. **`src/proxy.ts` 는 Next 16 이 실제로 인식한다.** 빌드 라우트 표 마지막에 `ƒ Proxy (Middleware)` 가 찍히고, `config.matcher` 와 `NextResponse.redirect` 가 그대로 동작한다.
3. **`proxy.ts` 안에서 `auth()` 를 직접 호출해도 된다.** Auth.js 문서가 권하는 edge/node 분리 설정(`auth.config.ts` 를 따로 두는 구조)은 **필요 없다.** 빌드·런타임 모두 에러 0. 단 이는 DB 어댑터 없이 **JWT 세션**을 쓸 때의 이야기다 — 어댑터를 붙이지 마라 (CLAUDE.md CRITICAL: Turso 에는 조회수만).
4. **`trustHost` 함정.** `trustHost` 없이 `next start` 하면 `/api/auth/*` 전부가 500 `UntrustedHost` 를 낸다. `next dev` 는 자동으로 신뢰하므로 **개발에서는 멀쩡하고 프로덕션에서만 깨진다.** 실측: 아무 설정 없음 → 500 / `AUTH_TRUST_HOST=true` → 200 / `VERCEL=1` → 200 / `AUTH_URL` 지정 → 200.
   → **NextAuth 설정에 `trustHost: true` 를 명시하라.** 새 환경변수를 만들지 마라 (CLAUDE.md 환경변수 표는 고정이다).
5. `auth()` 를 호출한 페이지는 라우트 표에서 `ƒ`(동적)이 된다. 관리자 페이지는 동적이 정상이다.
6. AUTH 환경변수가 **하나도 없어도 `npm run build` 는 통과**한다. Stop 훅이 깨지지 않는다.

## 작업

### 1) 의존성

```bash
npm install next-auth@beta --no-audit --no-fund
```

**`next-auth@latest` 를 설치하지 마라.** v4 가 깔리고 API 가 전혀 다르다 (CLAUDE.md).

### 2) 인증 설정 — `src/lib/auth.ts`

`NextAuth()` 를 구성해 `{ handlers, auth, signIn, signOut }` 을 노출한다.

요구 사항:

- Provider 는 GitHub 하나. `AUTH_GITHUB_ID` · `AUTH_GITHUB_SECRET` 사용.
- `trustHost: true` (위 4번).
- **세션 전략은 JWT.** DB 어댑터를 쓰지 마라.
- **화이트리스트**: `ADMIN_GITHUB_LOGINS` 를 콤마로 나눠 소문자 비교. `signIn` 콜백에서 GitHub `login` 이 목록에 없으면 `false` 를 반환해 로그인 자체를 거부한다.
- `ADMIN_GITHUB_LOGINS` 가 **비어 있으면 아무도 통과시키지 마라.** 빈 목록을 "전부 허용" 으로 해석하면 관리자 화면이 통째로 열린다.
- `jwt` / `session` 콜백으로 GitHub `login` 을 세션에 실어 페이지에서 다시 대조할 수 있게 한다.
- 화이트리스트 판정 로직은 **순수 함수로 분리해 export** 하라 (예: `isAllowedLogin(login, rawList)`). 테스트가 NextAuth 를 띄우지 않고 이것만 검증할 수 있어야 한다.

### 3) 라우트 핸들러 — `src/app/api/auth/[...nextauth]/route.ts`

`handlers` 를 그대로 `GET` · `POST` 로 내보낸다.

### 4) 이중 확인 헬퍼 — `src/lib/auth.ts` 에 함께

```ts
/** 로그인 + 화이트리스트를 통과한 계정을 반환한다. 아니면 notFound(). 페이지용. */
export async function requireAdmin(): Promise<{ login: string }>;

/** 같은 판정을 하되 던지지 않고 null 을 반환한다. API 라우트용. */
export async function getAdminLogin(): Promise<string | null>;
```

- `requireAdmin()` 은 세션이 없거나 `login` 이 화이트리스트에 없으면 **`notFound()`** 를 호출한다 (리다이렉트 말고 404). 이유: 관리자 화면의 존재 자체를 노출하지 않는다.
- `getAdminLogin()` 이 따로 필요한 이유: 다음 step 들이 만들 `/api/publish` · `/api/upload` 는 라우트 핸들러라 `notFound()` 의미가 페이지와 다르다. 라우트는 이 함수로 판정하고 **직접 404 응답**을 만든다. 401/403 은 "여기 뭔가 있다" 를 알려 준다.
- 모든 관리자 페이지·API 라우트가 이 둘 중 하나를 **첫 줄에서** 호출한다 (CLAUDE.md CRITICAL — proxy 만으로 막지 마라).
- 이중 확인이 형식적인 게 아닌 이유: 세션은 JWT 라 **발급 후 화이트리스트가 바뀌어도 기존 토큰은 유효**하다. 페이지·라우트에서 현재 목록과 다시 대조해야 계정을 뺐을 때 실제로 막힌다.

### 5) `src/proxy.ts`

- `config.matcher` 로 **`/admin/:path*` 전체**를 덮는다.
- 세션이 없으면 `/admin/login` 으로 리다이렉트한다. 단 `/admin/login` 자신은 리다이렉트 루프에 빠지면 안 된다.
- **`middleware.ts` 를 만들지 마라** (Next 16 에서 `proxy.ts` 로 이름이 바뀌었다).
- 다음 step 들이 만들 `/api/publish` · `/api/upload` 는 `/admin/*` 밖이라 matcher 에 걸리지 않는다. **지금 그 경로를 matcher 에 넣어 두어라** — 라우트가 아직 없어도 matcher 는 무해하고, 나중에 빠뜨리면 인증 없는 발행 API 가 열린다.
- **`/api/*` 경로에는 리다이렉트를 주지 마라.** `fetch` 가 307 을 따라가 로그인 HTML 을 받아 오면 클라이언트는 원인을 알 수 없다. API 경로는 **404 응답**으로 끊어라 (페이지는 리다이렉트, API 는 404).
- `/api/auth/*` 를 matcher 에 넣지 마라. 로그인 자체가 막힌다.

### 6) 관리자 껍데기

- `src/app/admin/layout.tsx` — 관리자 전용 껍데기. 공개 헤더/푸터를 재사용하지 마라 (`(public)` 밖이라 자동으로 상속되지 않는다). 최소한의 상단 바(사이트로 돌아가기 · 로그인한 계정 · 로그아웃)만 둔다.
- `src/app/admin/page.tsx` — 지금은 자리표시. 첫 줄에서 `requireAdmin()` 을 호출하고 로그인한 계정을 보여준다. 실제 대시보드는 step 2 에서 만든다.
- `src/app/admin/login/page.tsx` — GitHub 로그인 버튼. `signIn("github")` 을 호출한다. **로그인하지 않은 사람도 볼 수 있어야 한다** (여기서 `requireAdmin()` 을 부르면 아무도 로그인할 수 없다).
- 로그인 거부(화이트리스트 탈락) 시 사용자에게 **왜 거부됐는지** 보여줘라. Auth.js 는 `?error=AccessDenied` 로 돌려보낸다.

환경변수가 비어 있으면 로그인 버튼 대신 "인증이 설정되지 않았다" 는 안내를 보여준다. 빈 값으로 OAuth 를 시도해 500 을 내지 마라.

### 7) 테스트 — `src/lib/auth.test.ts`

`isAllowedLogin` 순수 함수를 검증한다:

- 목록에 있는 계정 → 허용
- 대소문자가 달라도 허용 (`Brachio9` vs `brachio9`)
- 목록에 없는 계정 → 거부
- **빈 목록 → 거부** (전부 허용으로 새지 않는지)
- 공백이 섞인 목록(`" a , b "`) 파싱
- `undefined` / 빈 문자열 login → 거부

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
for (const f of ['src/lib/auth.ts','src/proxy.ts','src/app/api/auth/[...nextauth]/route.ts','src/app/admin/layout.tsx','src/app/admin/page.tsx','src/app/admin/login/page.tsx','src/lib/auth.test.ts']) {
  if(!fs.existsSync(f)) throw new Error('없음: '+f);
}
if(fs.existsSync('src/middleware.ts')||fs.existsSync('middleware.ts')) throw new Error('middleware.ts 를 만들지 마라 — Next 16 은 proxy.ts 다');
const p=fs.readFileSync('src/proxy.ts','utf8');
if(!/matcher/.test(p)) throw new Error('proxy.ts 에 config.matcher 가 없다');
if(!/\/admin/.test(p)) throw new Error('proxy.ts matcher 가 /admin 을 덮지 않는다');
if(!/api\/publish/.test(p)||!/api\/upload/.test(p)) throw new Error('proxy.ts matcher 에 /api/publish · /api/upload 가 없다');
const a=fs.readFileSync('src/lib/auth.ts','utf8');
if(!/trustHost/.test(a)) throw new Error('trustHost 가 없다 — next start 에서 auth 전 엔드포인트가 500 이 된다');
if(!/ADMIN_GITHUB_LOGINS/.test(a)) throw new Error('화이트리스트 환경변수를 읽지 않는다');
if(/Adapter|adapter:/.test(a)) throw new Error('DB 어댑터를 붙이지 마라 — JWT 세션이다');
console.log('인증 파일/설정 OK');
"
node -e "
const v=require('./node_modules/next-auth/package.json').version;
if(!v.startsWith('5.')) throw new Error('next-auth v5 가 아니다: '+v+' (npm i next-auth@beta 로 설치해야 한다)');
console.log('next-auth '+v+' OK');
"
node -e "
const fs=require('fs');
const t=fs.readFileSync('src/lib/auth.test.ts','utf8');
for (const k of ['빈','대소문자']) if(!t.includes(k)) throw new Error('테스트에 '+k+' 케이스 설명이 없다');
console.log('화이트리스트 테스트 케이스 OK');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. **`next build` 라우트 표에 `ƒ Proxy (Middleware)` 가 찍히는지 눈으로 확인한다.** 없으면 `proxy.ts` 가 인식되지 않은 것이고, 관리자 화면이 통째로 무방비다.
3. **프로덕션 모드로 확인한다** (`npm run build && npm start`). `next dev` 만으로는 위 4번 `trustHost` 함정이 드러나지 않는다:
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/providers` → **200** (500 이면 `trustHost` 누락)
   - 로그인하지 않은 상태로 `/admin` → `/admin/login` 으로 리다이렉트되는가
   - `/admin` 응답 본문에 관리자 페이지 내용이 새지 않는가
4. `npm run dev` 로 실제 GitHub 로그인을 한 바퀴 돌린다. `.env.local` 에 실제 OAuth 자격증명이 준비되어 있다:
   - 로그인 → `/admin` 진입 → 계정명 표시 → 로그아웃
   - 라이트/다크 양쪽에서 관리자 화면이 읽히는가
5. 아키텍처 체크리스트:
   - proxy 와 페이지 양쪽에서 **이중으로** 확인하는가? (CLAUDE.md CRITICAL)
   - 화이트리스트가 빈 값일 때 전부 거부하는가?
   - `(public)` 레이아웃을 건드리지 않았는가? 공개 페이지가 그대로인가?
   - 토큰·시크릿을 코드에 박지 않았는가?
6. `phases/blog-4-admin/index.json` 의 step 0 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **노출한 함수 시그니처(`requireAdmin` · `isAllowedLogin` 등)와 파일 경로, proxy matcher 목록, 관리자 레이아웃 구조**를 한 줄로 기록. 다음 step 들이 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`.env.local` 을 편집하거나 출력하지 마라.** 사용자의 실제 자격증명이 들어 있다. 환경변수가 없는 상황을 시험해야 하면 셸에서 덮어써라 (`ADMIN_GITHUB_LOGINS= npm run build`).
- **`middleware.ts` 를 만들지 마라.** Next 16 은 `proxy.ts` 다.
- **`next-auth@latest` 를 설치하지 마라.** v4 는 API 가 전혀 다르다.
- **DB 어댑터를 붙이지 마라.** JWT 세션이다 (CLAUDE.md CRITICAL: Turso 에는 조회수만).
- **클라이언트 체크만으로 막지 마라.** 서버에서 세션과 화이트리스트를 확인한다.
- **글 목록·에디터·발행 기능을 만들지 마라.** step 1~4 의 범위다.
- **공개 페이지(`src/app/(public)/`)·`src/components/post/`·`src/lib/content/` 를 수정하지 마라.** 이 step 은 인증만 얹는다.
- **`docs/` · `.claude/` · `scripts/` 를 수정하지 마라.** `phases/` 에서는 오직 `phases/blog-4-admin/index.json` 의 step 0 상태만 업데이트한다.
- 기존 테스트를 깨뜨리지 마라 (133개).
