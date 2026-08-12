# 프로젝트: AI 동향 블로그

HuggingFace 블로그·arXiv 논문 등 영문 AI 동향을 한글 요약으로 공개하는 1인 운영 블로그.
이 파일은 `scripts/execute.py` 하네스가 매 step 프롬프트에 inline 주입한다. **간결 유지 — 상세는 `docs/*.md` 로 미룰 것.**

## 기술 스택

- Next.js 15 App Router · React Server Components 기본
- TypeScript strict · Tailwind CSS
- 콘텐츠: MDX 파일 (`content/**/*.mdx`) + `gray-matter` + `zod` 검증
- MDX 컴파일: `next-mdx-remote/rsc` — `remark-gfm` · `remark-math`/`rehype-katex` · `rehype-pretty-code` · `rehype-slug`
- 시각화: Recharts(차트) · Mermaid(다이어그램) — 둘 다 lazy-load
- 저장소: GitHub(본문) · Turso/libSQL(조회수) · Cloudflare R2(이미지)
- 인증: Auth.js v5 GitHub OAuth · 댓글: Giscus
- 테스트: Vitest
- 배포: Vercel

## 아키텍처 규칙 (CRITICAL)

- **CRITICAL: 글 본문은 `content/**/*.mdx` 파일에만 저장한다.** 본문을 DB에 넣지 마라. 이유: git이 저장소이자 백업이며, 이게 무너지면 비용·복구 전략이 전부 무너진다.
- **CRITICAL: Turso에는 조회수 같은 휘발성 수치만 넣는다.** 본문·인증정보·댓글을 넣지 마라.
- **CRITICAL: `/admin/*` 은 middleware로 전부 보호하고, 허용 GitHub 계정 화이트리스트로 다시 확인한다.** 클라이언트 체크만으로 막지 마라.
- **CRITICAL: 비밀값은 환경변수로만.** 코드·콘텐츠·커밋 메시지에 토큰·키를 하드코딩하지 마라.
- **CRITICAL: 외부 원문을 요약·인용하면 `source.url` 표기가 필수다.** 출처 없는 번역 게시 금지.
- **CRITICAL: 모든 시각은 KST(`+0900`) ISO-8601.**
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

# 하네스 자기 회귀 (harness 또는 phase 추가 시 필수)
pytest scripts/test_execute.py -q

# Phase 실행
python3 scripts/execute.py <phase-dir>            # e.g. blog-0-scaffold
python3 scripts/execute.py <phase-dir> --push     # 완료 후 브랜치 push
```

⚠️ `package.json` 이 존재하면 Stop 훅이 매 세션 종료 시 `npm run lint && npm run build && npm run test` 를 실행한다. 세 스크립트가 **전부** 정의되어 있어야 하며, 하나라도 실패하면 훅이 에러를 낸다.

## 하네스 (`scripts/execute.py`) — 핵심 동작

- **브랜치**: phase 당 `feat-<phase_name>` 자동 생성. 중간 수동 전환 금지.
- **가드레일 주입**: `CLAUDE.md` + `docs/*.md` 를 inline 주입. 선택적 docs 는 `execute.py` 의 `guardrails` 에서 지정.
- **재시도**: `MAX_RETRIES = 3`. 실패 시 이전 에러가 다음 preamble 에 주입. 타임아웃 (`CLAUDE_TIMEOUT_SEC = 1800`) 도 error 처리.
- **상태**: step 항목에 `started_at` / `completed_at` / `failed_at` / `blocked_at` + append-only `events[]` 이력.
- **블록**: `blocked` 상태는 사람 개입 대기 — 즉시 exit 2.

## 훅 (`.claude/`)

- **Stop 훅**: 조건부 실행 (test_execute.py / pyproject.toml / package.json marker 파일 기준).
- **PreToolUse 훅** (`.claude/hooks/pre_tool_use.py`): 위험 명령 차단 (`rm -rf`, `git push --force`, `DROP TABLE`, `vercel remove`, `turso db destroy`, `wrangler r2 bucket delete` 등). case-sensitive 처리로 `git branch -d` 같은 safe 명령 보호.
- **훅 command 는 `$CLAUDE_PROJECT_DIR` 기반 절대경로만** (cwd 독립성).

## 참조 문서

- `docs/PRD.md` · `docs/ADR.md` · `docs/ARCHITECTURE.md` · `docs/UI_GUIDE.md` — 매 step inline 주입
- `.claude/commands/harness.md` — phase/step 저작 스펙 (정본)
- `.claude/commands/review.md` — 변경 리뷰 체크리스트

## 비-목표 (명시적 제외)

- HuggingFace/arXiv **자동 수집** 및 Claude API 자동 요약 — 별도 phase로 분리됨. 지금 만들지 마라.
- 다중 저자 / 권한 등급 / 실시간 협업 편집
- 뉴스레터·이메일 발송
- 다국어 (한글 전용)
- 유료화·광고 (Vercel Hobby 약관상 불가)
