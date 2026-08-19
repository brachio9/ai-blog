# 프로젝트: 초록

영문 AI 원문을 **여섯 갈래로 좁혀** 한글로 **추려 적어** 공개하는 1인 운영 사이트.
사이트 이름 「초록」은 논문의 abstract 를 뜻한다 — 전문 번역이 아니라 요약이라는 성격이 이름에 들어 있다.
옮긴 글에는 원문 링크를, 직접 잰 글에는 측정 조건을 함께 단다.
이 파일은 `scripts/execute.py` 하네스가 매 step 프롬프트에 inline 주입한다. **간결 유지 — 상세는 `docs/*.md` 로 미룰 것.**

## 기술 스택

- Next.js 16 App Router (Turbopack 기본) · React 19 Server Components 기본
- TypeScript 5 strict · Tailwind CSS v4 (CSS-first `@theme` — `tailwind.config.js` 없음)
- 콘텐츠: MDX 파일 (`content/**/*.mdx`) + `gray-matter` + `zod` 검증
- MDX 컴파일: `next-mdx-remote/rsc` — `remark-gfm` · `remark-math`/`rehype-katex` · `rehype-pretty-code` · `rehype-slug`
- 시각화: Recharts(차트) · Mermaid(다이어그램) — 둘 다 lazy-load
- 저장소: GitHub(본문 **및 이미지**) · Turso/libSQL(조회수). Cloudflare R2 는 쓰지 않는다 (ADR-005)
- 인증: Auth.js v5 GitHub OAuth — **반드시 `npm i next-auth@beta`** (`latest` 는 API 가 전혀 다른 v4 다) · 댓글: Giscus
- 테스트: Vitest — 테스트 파일은 `src/**/*.test.{ts,tsx}` 에 둔다 (`vitest.config.ts` 의 include 범위)
- 배포: Vercel

## 아키텍처 규칙 (CRITICAL)

- **CRITICAL: 글 본문은 `content/**/*.mdx` 파일에만 저장한다.** 본문을 DB에 넣지 마라. 이유: git이 저장소이자 백업이며, 이게 무너지면 비용·복구 전략이 전부 무너진다.
- **CRITICAL: Turso에는 조회수 같은 휘발성 수치만 넣는다.** 본문·인증정보·댓글을 넣지 마라.
- **CRITICAL: `/admin/*` 은 `src/proxy.ts` 로 전부 보호하고, 각 페이지/라우트에서 허용 GitHub 계정 화이트리스트로 다시 확인한다.** 클라이언트 체크만으로 막지 마라. Next.js 16 에서 `middleware.ts` 는 `proxy.ts` 로 이름이 바뀌었다 (기능 동일) — `middleware.ts` 를 만들지 마라.
- **CRITICAL: 비밀값은 환경변수로만.** 코드·콘텐츠·커밋 메시지에 토큰·키를 하드코딩하지 마라.
- **CRITICAL: 외부 원문을 요약·인용하면 `source.url` 표기가 필수다.** 출처 없는 번역 게시 금지.
- **CRITICAL: 모든 시각은 KST(`+0900`) ISO-8601.**
- **CRITICAL: `CLAUDE.md` · `docs/*.md` · `.gitignore` 를 생성 도구의 산출물로 덮어쓰지 마라.** 이유: 이 5개 문서가 매 step 의 유일한 가드레일이다. 덮어쓰면 이후 모든 step 이 빈 지침으로 실행된다. `create-next-app` 등은 자기 `CLAUDE.md`/`AGENTS.md` 를 만들므로 복사 시 반드시 제외한다. 지침 정본은 `CLAUDE.md` 하나이며 `AGENTS.md` 를 만들지 마라.
- MDX 컴파일 진입점은 `src/lib/mdx.ts` **하나**. 프리뷰용 별도 파이프라인을 만들지 마라. 이유: 프리뷰와 실제 렌더가 갈라지면 "프리뷰는 되는데 발행하면 깨진다"가 반드시 생긴다.
- 외부 API 호출은 `src/services/` 래퍼를 경유한다. 컴포넌트에서 직접 외부로 `fetch` 하지 마라.
- 조회수·댓글 실패가 글 렌더를 막으면 안 된다. frontmatter 검증 실패는 반대로 빌드를 깨뜨려야 한다.
- 전역 상태 라이브러리를 도입하지 마라. 서버 상태는 Server Components.

## 개발 프로세스

- **TDD**: failing test 먼저 → 구현 → 통과 → 리팩터. `scripts/test_execute.py` 는 harness 회귀 네트.
- **커밋 메시지**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). 하네스가 2단계 커밋 (`feat(phase): step N — name` + `chore(phase): step N output`) 을 자동 처리.
- **시간대**: KST 고정 (`+0900`, ISO-8601).
- **phase 디렉토리 prefix**: `blog` — `phases/blog-{N}-{slug}/`

## 명령어

```bash
# 앱
npm run dev
npm run lint && npm run build && npm run test   # 기본 AC. Stop 훅도 이걸 실행한다
npm run typecheck                                # tsc --noEmit

# 하네스 자기 회귀 (harness 또는 phase 추가 시 필수)
pytest scripts/test_execute.py -q

# Phase 실행
python3 scripts/execute.py <phase-dir>            # e.g. blog-0-scaffold
python3 scripts/execute.py <phase-dir> --push     # 완료 후 브랜치 push
```

⚠️ `package.json` 이 존재하면 Stop 훅이 매 세션 종료 시 `npm run lint && npm run build && npm run test` 를 실행한다. 세 스크립트가 **전부** 정의되어 있어야 하며, 하나라도 실패하면 훅이 에러를 낸다. (Next 16 Turbopack 기준 빌드 ~4초라 부담은 작다.)

⚠️ Next.js 16 에서 `next lint` 는 제거되었다. `lint` 스크립트는 `eslint` 를 직접 호출한다.

## 환경변수 (이름 고정 — 각 phase 가 임의로 바꾸지 마라)

phase 는 서로 다른 세션에서 실행되므로 이름이 갈리면 마지막에 전부 어긋난다. 새 변수가 필요하면 이 표에 추가하고 쓴다. 값은 `.env.local`(git 제외), 예시는 `.env.example`.

| 변수 | 용도 | 도입 phase |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | 절대 URL 생성 (OG·RSS·sitemap) | blog-2 |
| `TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN` | 조회수 | blog-2 |
| `NEXT_PUBLIC_GISCUS_REPO` · `_REPO_ID` · `_CATEGORY` · `_CATEGORY_ID` | 댓글 | blog-2 |
| `AUTH_SECRET` · `AUTH_GITHUB_ID` · `AUTH_GITHUB_SECRET` | Auth.js v5 | blog-3 |
| `ADMIN_GITHUB_LOGINS` | 허용 계정 화이트리스트 (콤마 구분) | blog-3 |
| `GITHUB_CONTENT_REPO` (`owner/repo`) · `GITHUB_CONTENT_BRANCH` · `GITHUB_CONTENT_TOKEN` | 발행 커밋 (fine-grained PAT) | blog-3 |
| ~~`R2_*`~~ | ~~이미지 업로드~~ — **쓰지 않는다.** 이미지도 레포에 커밋한다 (ADR-005) | — |

`NEXT_PUBLIC_` 접두사는 **브라우저에 노출되어도 되는 값에만** 붙인다. 토큰·시크릿에 붙이지 마라.

## 하네스 (`scripts/execute.py`) — 핵심 동작

- **브랜치**: phase 당 `feat-<phase_name>` 자동 생성. 중간 수동 전환 금지.
- **가드레일 주입**: `execute.py` 의 `ALWAYS_INLINE_DOCS` 5종(`CLAUDE.md` · `docs/PRD.md` · `docs/ADR.md` · `docs/ARCHITECTURE.md` · `docs/UI_GUIDE.md`)을 전문 inline. `REFERENCE_ONLY_DOCS`(`docs/PLAN.md`)는 경로만 노출 — 필요 시 Read 로 조회.
- **재시도**: `MAX_RETRIES = 3`. 실패 시 이전 에러가 다음 preamble 에 주입. 타임아웃 (`CLAUDE_TIMEOUT_SEC = 1800`) 도 error 처리.
- **상태**: step 항목에 `started_at` / `completed_at` / `failed_at` / `blocked_at` + append-only `events[]` 이력.
- **블록**: `blocked` 상태는 사람 개입 대기 — 즉시 exit 2.

## 훅 (`.claude/`)

- **Stop 훅**: 조건부 실행 (test_execute.py / pyproject.toml / package.json marker 파일 기준).
- **PreToolUse 훅** (`.claude/hooks/pre_tool_use.py`): 위험 명령 차단 (`rm -rf`, `git push --force`, `git reset --hard`, `DROP TABLE`, 배포·DB·버킷 삭제 계열 등). case-sensitive 처리로 `git branch -d` 같은 safe 명령 보호.
  - 차단당하면 우회하지 말고 안전한 대안을 써라: 디렉토리 삭제는 `rm -r <경로>` (`-f` 없이), 강제 push 는 `--force-with-lease`.
  - 훅은 **명령 문자열 전체**를 검사한다. heredoc·커밋 메시지 본문에 차단 패턴이 들어가도 걸린다 — 긴 메시지는 파일로 넘겨라 (`git commit -F <file>`).
- **훅 command 는 `$CLAUDE_PROJECT_DIR` 기반 절대경로만** (cwd 독립성).

## 참조 문서

- `docs/PRD.md` · `docs/ADR.md` · `docs/ARCHITECTURE.md` · `docs/UI_GUIDE.md` — 매 step inline 주입
- `.claude/commands/harness.md` — phase/step 저작 스펙 (정본)
- `.claude/commands/review.md` — 변경 리뷰 체크리스트

## 분류 축 (CRITICAL — 셋을 섞지 마라)

- **주제 `axis`** (1급, 필수·단일) — 6축. `/topics/{axis}`. **색을 쓰지 않는다 — 번호(mono `01`~`06`)가 부호다.**
- **소스 `category`** (**5개**) — `/sources/{category}`. 안료 3색 + **먹 2단계**는 **여기 전용**이다.
  **글 주소에는 들어가지 않는다** (`/posts/{slug}`) — 분류를 고칠 때마다 링크가 죽지 않게.
- **포맷 `format`** (선택) — 라우트도 필터도 없다. 60/60 이 `explainer` 하나라 필터가 아무것도 거르지 못했다. 필드와 enum 은 남긴다 — 「재현 검증·실전 기록은 `notes` 강제」 규칙이 거기 있다.
- 태그 `tags` — 고유명사(모델·툴·기법) + 부차 주제(걸친 **다른** 축). **이 글의 `axis` 를 되풀이하는 태그만 금지**(`isOwnAxisEcho`). 포맷은 태그로 표현하지 마라.

**카테고리 5개 (2026-08-15 개편 — 수집 파이프라인의 데이터 분포에 맞췄다)**

| slug | 이름 | 부호 | 채우는 주체 |
|---|---|---|---|
| `papers` | 논문 | 草綠 (accent) | 봇 + 사람 |
| `releases` | 릴리즈 | 朱土 (accent-2) | 봇 |
| `news` | 소식 | 藍 (accent-3) | 봇 |
| `community` | 커뮤니티 | **먹 中** (neutral-600) | 봇 |
| `notes` | 기록 | **먹 濃** (neutral-800) | **사람만** |

옛 `hf-blog` 한 칸이 `releases`(GitHub 릴리즈 28곳)와 `news`(기업 블로그·뉴스레터 17곳)로 갈라졌다.
**색을 안 쓰는 것 자체가 부호다** — `community` 는 원문이 여럿이고, `notes` 는 원문이 아니라 **사람이 골랐다는 것**이 기준이다 (직접 잰 글에는 원문이 아예 없다).

**더 늘릴 때는 값을 치러야 한다.** `CategorySlug`·`CategoryAccent` 유니온 + `Record<CategoryAccent,…>` **4곳**
(`KICKER_ACCENT`·`ACCENT_COLOR`·`ACCENT_TEXT`·`CAT_CLASS`) + `globals.css` 의
`--cat-*`·`--color-cat-*`·`.cat-*`. TS 4곳은 컴파일이 잡지만 **CSS 는 못 잡아 조용히 무색이 된다.**

## 비-목표 (명시적 제외)

- 다중 저자 / 권한 등급 / 실시간 협업 편집
- 뉴스레터·이메일 발송
- 다국어 (한글 전용)

광고·유료화는 **제외 목록에서 뺐다** (Vercel Pro 라 약관 제약 없음). 그래도 지금 범위는 아니다 — 요청 없이 광고 스크립트·결제를 넣지 마라.

**자동 수집·LLM 요약은 이 레포에서 빠졌다.** 별도 private 레포 `chorok-collect` 가 담당하며,
산출물을 `bot/*` 브랜치 PR 로만 올린다. **이 레포에 수집기·크롤러·LLM 호출을 만들지 마라** —
Turso 경계(ADR-002)와 "조회수만 런타임"(ARCHITECTURE) 규약이 그 자리에서 무너진다.
