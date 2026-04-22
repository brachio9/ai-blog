# 프로젝트: {프로젝트명}

이 파일은 `scripts/execute.py` 하네스가 매 step 프롬프트에 inline 주입한다. **간결 유지 — 상세는 `docs/*.md` 로 미룰 것.**

## 기술 스택
- {프레임워크 (예: Next.js 15 · FastAPI 0.112)}
- {언어 (예: TypeScript strict · Python 3.12)}
- {데이터 (예: Postgres + pgvector · Neo4j · Redis)}
- {테스트 (예: pytest · vitest · Playwright)}

## 아키텍처 규칙 (CRITICAL)
- CRITICAL: {절대 지켜야 할 규칙 1}
- CRITICAL: {절대 지켜야 할 규칙 2}
- {일반 규칙}

## 개발 프로세스
- **TDD**: failing test 먼저 → 구현 → 통과 → 리팩터. `scripts/test_execute.py` 는 harness 회귀 네트.
- **커밋 메시지**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). 하네스가 2단계 커밋 (`feat(phase): step N — name` + `chore(phase): step N output`) 을 자동 처리.
- **시간대**: KST 고정 (`+0900`, ISO-8601).

## 명령어

```bash
# 하네스 자기 회귀 (harness 또는 phase 추가 시 필수)
pytest scripts/test_execute.py -q

# Phase 실행
python3 scripts/execute.py <phase-dir>            # e.g. demo-0-repo-scaffold
python3 scripts/execute.py <phase-dir> --push     # 완료 후 브랜치 push
```

## 하네스 (`scripts/execute.py`) — 핵심 동작

- **브랜치**: phase 당 `feat-<phase_name>` 자동 생성. 중간 수동 전환 금지.
- **가드레일 주입**: `CLAUDE.md` + `docs/*.md` 를 inline 주입. 선택적 docs 는 `execute.py` 의 `guardrails` 에서 지정.
- **재시도**: `MAX_RETRIES = 3`. 실패 시 이전 에러가 다음 preamble 에 주입. 타임아웃 (`CLAUDE_TIMEOUT_SEC = 1800`) 도 error 처리.
- **상태**: step 항목에 `started_at` / `completed_at` / `failed_at` / `blocked_at` + append-only `events[]` 이력.
- **블록**: `blocked` 상태는 사람 개입 대기 — 즉시 exit 2.

## 훅 (`.claude/`)

- **Stop 훅**: 조건부 실행 (test_execute.py / pyproject.toml / package.json marker 파일 기준).
- **PreToolUse 훅** (`.claude/hooks/pre_tool_use.py`): 위험 명령 차단 (`rm -rf`, `git push --force`, `DROP TABLE`, `TRUNCATE`, `kubectl delete --all`, `aws s3 rb --force` 등). case-sensitive 처리로 `git branch -d` 같은 safe 명령 보호.
- **훅 command 는 `$CLAUDE_PROJECT_DIR` 기반 절대경로만** (cwd 독립성).

## 참조 문서

- `docs/PRD.md` · `docs/ADR.md` · `docs/ARCHITECTURE.md` · `docs/UI_GUIDE.md` — 매 step inline 주입
- `.claude/commands/harness.md` — phase/step 저작 스펙 (정본)
- `.claude/commands/review.md` — 변경 리뷰 체크리스트

## 비-목표 (명시적 제외)

- {예: 상용 배포 인프라}
- {예: 엔터프라이즈 요구 (SLA, HA, 멀티리전)}
