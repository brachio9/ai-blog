# 배포 (Vercel)

Vercel 에 배포한다. 팀 `brachio9s-projects` 는 **Pro 요금제**다.

## 현재 배포 상태

| 항목 | 값 |
|---|---|
| Vercel 프로젝트 | `ai-blog` (팀 `brachio9s-projects`) |
| 프로덕션 도메인 | <https://blog.krunkit.me> |
| Git 연결 | `brachio9/ai-blog` — `main` push 시 자동 재배포 |
| 환경변수 | 14개, **production 스코프에만** 등록 |

프리뷰 환경에는 일부러 환경변수를 넣지 않았다. 프리뷰에 `GITHUB_CONTENT_TOKEN` 이 있으면
**프리뷰 배포에서도 실제 레포에 커밋**할 수 있게 된다. 환경변수가 없어도 빌드는 통과하고
조회수·댓글·관리자만 조용히 꺼진다.

## 빌드는 비용이다

`main` 에 push 하면 자동으로 프로덕션 빌드가 돈다. Pro 는 사용량 과금이므로 **push 를 모아서 한 번에**
한다. 로컬 커밋은 빌드를 트리거하지 않으니 자유롭게 쌓아도 된다 — 아끼는 것은 push 다.

문서·`phases/` 만 바뀐 커밋이 잦다면 Vercel 의 **Ignored Build Step** 으로 빌드를 건너뛸 수 있다.
단 `content/**/*.mdx` 는 반드시 빌드해야 한다 — 글 발행이 그 경로를 탄다.

## 순서가 중요하다

도메인이 정해져야 채울 수 있는 값이 있어서 **한 번에 끝나지 않는다.** 아래 순서를 지켜라.

```
1. 첫 배포          → 도메인 확보 (xxx.vercel.app)
2. 프로덕션 OAuth App 등록  → 콜백에 그 도메인이 필요
3. 환경변수 등록     → NEXT_PUBLIC_SITE_URL 에 그 도메인이 필요
4. 재배포           → OG·RSS·sitemap 의 절대 URL 이 이때 확정된다
5. 스모크 체크
```

**3번을 건너뛰고 1번 결과를 그대로 쓰면 안 된다.** `NEXT_PUBLIC_SITE_URL` 은 빌드 타임에 번들로 구워지므로, 값을 바꾼 뒤에는 **반드시 재배포**해야 OG 이미지·RSS·sitemap 의 절대 URL 이 맞는다. 값이 없으면 `http://localhost:3000` 으로 남는다 (`src/lib/site.ts`).

## 1) 첫 배포

```bash
npx vercel login                        # 최초 1회. 대화형이라 사람이 직접 실행한다
npx vercel link --yes --project ai-blog # .vercel/ 생성 (git 제외 대상)
npx vercel --prod --yes                 # 첫 배포
```

빌드 명령·출력 디렉토리는 Next.js 로 자동 감지된다. 따로 설정하지 마라.

### 여기서 실제로 걸린 것 세 가지

**(1) 새 프로젝트는 배포 보호가 켜져 있다.** `ssoProtection: all_except_custom_domains` 가 기본값이라
`*.vercel.app` 주소가 **익명 접근에 302** 를 내며 Vercel 로그인으로 튕긴다. 공개 블로그는 읽을 수 없다.

```bash
npx vercel project protection            # 현재 설정 확인
npx vercel project protection disable ai-blog --sso
```

이건 사이트를 **읽을 수 있게** 하는 것이지 관리자 화면을 여는 게 아니다. `/admin` 은 `src/proxy.ts` +
화이트리스트가 따로 막는다.

**(2) `vercel link` 로는 GitHub 레포가 연결되지 않는다.** `Failed to connect ... to project` 가 뜬다.
Vercel GitHub App 에 그 레포 권한이 없어서이며, **브라우저에서만** 해결된다:
Vercel → 프로젝트 → Settings → Git → `Configure GitHub App` → Repository access 에 해당 레포 추가.
(`Only select repositories` 를 골라 이 레포만 주는 편이 낫다 — PAT 을 이 레포에만 준 것과 같은 이유.)

연결하지 않으면 **관리자 화면에서 글을 발행해도 사이트에 반영되지 않는다.** 커밋 → 자동 재배포가
발행 파이프라인의 전제다.

**(3) `vercel link` 는 실행할 때마다 `.gitignore` 에 `.env*` 를 덧붙인다.** 이 줄이 앞의
`!.env.example` 예외를 무력화해 `.env.example` 이 무시 대상이 된다 (이미 추적 중이라 실제 피해는 없지만
새로 받는 사람이 파일을 못 만든다). `vercel link` 를 돌렸으면 `git diff .gitignore` 로 확인하고 되돌려라.

`.env.local` 에 `VERCEL_OIDC_TOKEN` 을 덧붙이기도 한다. 기존 값은 건드리지 않으니 그대로 두면 된다.

## 2) 프로덕션 OAuth App 등록

**GitHub OAuth App 은 콜백 URL 을 하나만 등록할 수 있다.** host 와 port 가 정확히 일치해야 하므로 (서브도메인만 예외), `localhost:3000` 과 프로덕션 도메인을 한 앱으로 겸할 수 없다.

따라서 **앱을 두 개 둔다**:

| 용도 | 콜백 URL | 자격증명을 두는 곳 |
|---|---|---|
| 로컬 개발 (기존 앱) | `http://localhost:3000/api/auth/callback/github` | `.env.local` |
| 프로덕션 (새로 등록) | `https://{도메인}/api/auth/callback/github` | Vercel 환경변수 |

새 앱 등록: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App

| 입력란 | 값 |
|---|---|
| Application name | `AI 동향 블로그 (프로덕션)` |
| Homepage URL | `https://{도메인}` |
| Authorization callback URL | `https://{도메인}/api/auth/callback/github` |

등록 후 **Client ID** 와 **Client Secret**(Generate a new client secret) 을 확보한다.

## 3) 환경변수 등록

Vercel 대시보드 → Project → Settings → Environment Variables, 또는:

```bash
npx vercel env add <이름> production
```

이름은 **`CLAUDE.md` 의 환경변수 표가 정본**이다. 임의로 바꾸지 마라.

| 변수 | 값의 출처 | 없으면 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | 1번에서 확보한 도메인 (`https://...`, 뒤 슬래시 없이) | OG·RSS·sitemap 이 localhost 를 가리킨다 |
| `TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN` | `turso db show` · `turso db tokens create` | 조회수만 조용히 꺼진다 |
| `NEXT_PUBLIC_GISCUS_REPO` · `_REPO_ID` · `_CATEGORY` · `_CATEGORY_ID` | <https://giscus.app> 설정 마법사 | 댓글 섹션이 렌더되지 않는다 |
| `AUTH_SECRET` | `openssl rand -base64 32` (**로컬과 다른 값**을 쓴다) | 로그인 500 |
| `AUTH_GITHUB_ID` · `AUTH_GITHUB_SECRET` | 2번에서 만든 **프로덕션** OAuth App | 로그인 불가 |
| `ADMIN_GITHUB_LOGINS` | 허용할 GitHub 계정 (콤마 구분) | **아무도 로그인할 수 없다** (빈 값 = 전부 거부) |
| `GITHUB_CONTENT_REPO` · `GITHUB_CONTENT_BRANCH` · `GITHUB_CONTENT_TOKEN` | 발행 대상 레포 · 브랜치 · fine-grained PAT | 관리자 화면이 글 목록을 못 읽고 발행이 막힌다 |

주의:

- **`NEXT_PUBLIC_` 접두사는 브라우저에 노출된다.** 토큰·시크릿에 붙이지 마라.
- **`GITHUB_CONTENT_TOKEN` 은 만료된다.** fine-grained PAT 의 만료일을 달력에 적어 두어라. 만료되면 관리자 글 목록이 에러를 띄운다 (사이트 자체는 멀쩡하다).
- 로컬과 프로덕션의 `AUTH_SECRET` 을 같게 두지 마라. 로컬에서 만든 세션이 프로덕션에서도 유효해진다.

## 4) 재배포

```bash
npx vercel --prod
```

환경변수를 바꾼 뒤에는 반드시 다시 배포한다. Vercel 은 변수 변경만으로 재빌드하지 않는다.

## 5) 스모크 체크

```bash
BASE=https://blog.krunkit.me

# 공개 페이지
for p in / /papers /releases /news /community /notes /search /rss.xml /sitemap.xml /robots.txt; do
  printf "%-16s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' $BASE$p)"
done

# 절대 URL 이 프로덕션 도메인인가 (localhost 가 남아 있으면 3번을 빠뜨린 것)
curl -s $BASE/rss.xml | grep -o 'https\?://[^<]*' | head -3
curl -s $BASE/sitemap.xml | grep -o 'https\?://[^<]*' | head -3

# 인증 — 로그인 없이 404 여야 한다 (200 이면 누구나 레포에 커밋할 수 있다)
curl -s -o /dev/null -w "publish=%{http_code}\n" -X POST $BASE/api/publish \
  -H 'content-type: application/json' -d '{"path":"content/notes/2026-01-01-x.mdx","content":"x"}'
curl -s -o /dev/null -w "admin=%{http_code}\n" $BASE/admin        # 307 → /admin/login
curl -s -o /dev/null -w "auth=%{http_code}\n" $BASE/api/auth/providers  # 200
```

브라우저로 확인할 것:

- [ ] 홈 → 카테고리 → 글 상세 클릭 경로가 끊기지 않는가
- [ ] 수식·차트·다이어그램·표가 렌더되는가 (차트가 **검정이 아닌지**)
- [ ] 라이트/다크 전환이 되는가, 새로고침해도 유지되는가
- [ ] 댓글(Giscus) iframe 이 뜨는가, 테마가 함께 바뀌는가
- [ ] 조회수가 올라가는가
- [ ] `/admin` 로그인 → 글 목록 → 에디터 프리뷰 → 저장까지 한 바퀴
- [ ] 허용되지 않은 계정으로 로그인하면 거부되는가
- [ ] 375px 폭에서 페이지가 가로로 밀리지 않는가

## 발행 후 반영 시간

관리자 화면에서 글을 저장하면 GitHub 에 커밋되고, Vercel 이 그걸 감지해 재배포한다. **사이트에 보이기까지 약 90초**가 걸린다. 관리자 글 목록은 레포를 직접 읽으므로 그 전에도 바로 보인다.

## 되돌리기

Vercel 대시보드 → Deployments → 이전 배포 → **Promote to Production**. 빌드 없이 즉시 전환된다.

글 내용을 되돌리려면 레포에서 해당 커밋을 revert 하면 된다 — 글이 git 에 있기 때문에 배포 롤백과 콘텐츠 롤백이 분리되어 있다 (ADR-001).
