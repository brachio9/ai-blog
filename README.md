# Harness Framework

Claude Code 기반 phase-driven 개발 하네스. 한 프로젝트를 여러 phase 로 쪼개, 각 phase 를 여러 step 으로 세분화한 뒤, 하네스가 Claude 서브프로세스를 호출해 step 단위로 구현/테스트/커밋을 자동화한다.

**DootaWiki** 실 프로젝트에서 17-phase (Demo 0~16) 로드맵 실행 중 발견한 edge case 와 fix 를 반영한 최신 버전.

## 빠른 시작 (신규 프로젝트 부트스트랩)

```bash
# 1. 새 프로젝트 디렉토리로 복사 (또는 git clone 후 remote 교체)
cp -R ~/work2/harness_framework ~/work2/MyNewProject
cd ~/work2/MyNewProject
rm -rf .git && git init -b main

# 2. CLAUDE.md 의 {플레이스홀더} 채움 (기술 스택, CRITICAL 규칙, 비-목표)
#    docs/PRD.md · ADR.md · ARCHITECTURE.md · UI_GUIDE.md 초안 작성

# 3. 하네스 self-test
pytest scripts/test_execute.py -q

# 4. 첫 phase 설계 (.claude/commands/harness.md 스펙 참조)
mkdir -p phases/demo-0-scaffold
cat > phases/index.json <<'JSON'
{
  "phases": [
    { "dir": "demo-0-scaffold", "status": "pending" }
  ]
}
JSON
# phases/demo-0-scaffold/index.json 과 step0.md ... stepN.md 작성

# 5. 실행
python3 scripts/execute.py demo-0-scaffold
```

## 구성

```
harness_framework/
├── scripts/
│   ├── execute.py           하네스 본체 (retry, timeout, 2단계 commit, 상태/events 추적)
│   └── test_execute.py      67 회귀 테스트 (harness 수정 시 필수 통과)
├── .claude/
│   ├── commands/
│   │   ├── harness.md       phase/step 저작 스펙 (정본)
│   │   └── review.md        변경 리뷰 체크리스트
│   ├── hooks/
│   │   └── pre_tool_use.py  위험 명령 차단 (case-sensitive)
│   └── settings.json        Stop / PreToolUse 훅 연결 ($CLAUDE_PROJECT_DIR 기반)
├── docs/
│   ├── PRD.md               제품 요구사항 (placeholder)
│   ├── ADR.md               아키텍처 결정 (placeholder)
│   ├── ARCHITECTURE.md      시스템 구조 (placeholder)
│   └── UI_GUIDE.md          UI 가이드 (placeholder)
├── phases/                  (비어 있음 — 프로젝트별 phase 추가)
├── CLAUDE.md                상위 가이드 (매 step 프롬프트 inline 주입)
└── README.md                이 문서
```

## 핵심 기능

### 1. 2단계 Commit
각 step 완료 시:
- `feat(<phase>): step N — <name>` — 실 작업 산출물
- `chore(<phase>): step N output` — step-output.json + index.json 상태 업데이트

→ rollback 시 작업 단위로 정확히 revert 가능.

### 2. 재시도 (MAX_RETRIES = 3)
- step 실패 / 타임아웃 시 최대 3회 재시도
- 이전 에러 메시지가 다음 preamble 에 `preceding_error` 로 주입되어 Claude 가 맥락 이해
- 타임아웃 (`CLAUDE_TIMEOUT_SEC = 1800s`) 도 error 로 처리

### 3. 상태 + Events 추적
`phases/{phase}/index.json` 의 각 step:
```json
{
  "step": 2,
  "name": "...",
  "status": "completed",
  "started_at": "2026-04-21T15:47:46+0900",
  "completed_at": "2026-04-21T16:30:00+0900",
  "summary": "한 줄 산출물 요약 (다음 step 에 컨텍스트 전달)",
  "events": [
    { "at": "...", "status": "started" },
    { "at": "...", "status": "retry", "attempt": 1, "error": "..." },
    { "at": "...", "status": "completed", "attempt": 2 }
  ]
}
```

### 4. 상태 전이
- `pending` → `completed` (성공) / `error` (3회 실패) / `blocked` (사람 개입 대기)
- `blocked` 는 즉시 `exit 2` — 사용자 수동 처리 대기

### 5. 가드레일 자동 주입
매 step 프롬프트에 `CLAUDE.md` + `docs/PRD.md` + `docs/ADR.md` + `docs/ARCHITECTURE.md` + `docs/UI_GUIDE.md` 내용이 inline 포함된다. 추가 참조 문서는 `execute.py` 의 `guardrails` 로 확장.

## Hooks

### Stop 훅
매 Claude 서브프로세스 종료 시:
- `scripts/test_execute.py` 존재 → 회귀 pytest 자동 실행
- `pyproject.toml` 존재 → `ruff check .` (설치되어 있을 때)
- `package.json` 존재 → `npm run lint && build && test`

### PreToolUse 훅 — 위험 명령 차단
[.claude/hooks/pre_tool_use.py](.claude/hooks/pre_tool_use.py) 가 차단:
- `rm -rf /`, `sudo rm`
- `git push --force` / `--force-with-lease`, `git reset --hard`, `git clean -fdx`
- `git branch -D` (대소문자 정확히 — `-d` 는 통과)
- `DROP TABLE`, `TRUNCATE`, `DELETE FROM` (WHERE 없이)
- `kubectl delete --all`, `aws s3 rb --force`
- Supabase/DB 초기화 계열

`$CLAUDE_PROJECT_DIR` 기반 절대경로로 로드 — cwd 독립.

## DootaWiki 프로젝트에서 발견된 fix (반영됨)

1. **git branch -d 차단 버그** (PreToolUse): IGNORECASE regex 가 `-d` 를 `-D` 로 오판 → `(?-i:-D)` inline case-sensitive 로 수정
2. **하네스 timeout 후 commit 인식**: Claude 가 마지막 1초에 commit 했으나 timeout 처리되는 race → status 재확인 로직 추가
3. **Retry preamble 에 preceding_error 주입**: 실패 원인을 다음 시도에 context 로 전달해 동일 실수 반복 방지
4. **Event log 보존 (append-only)**: 상태 변경 시 덮어쓰지 않고 `events[]` 에 append → 디버깅 가능
5. **2단계 commit**: feat + chore 분리로 작업 단위 명확화

## 회귀 테스트

하네스 자체 수정 시 반드시 통과:

```bash
pytest scripts/test_execute.py -q
# 67 passed
```

테스트 커버리지:
- 상태 전이 (pending → completed / error / blocked)
- 재시도 로직
- 타임아웃 처리
- 2단계 commit
- Events append-only
- 가드레일 주입
- Phase 완료 검증

## 라이선스

MIT. 자유롭게 포크/수정하여 사용.
