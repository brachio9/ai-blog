# Step 0: first-step-name

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/PRD.md`
- {이전 step 에서 생성/수정된 파일 경로 — step 0 이면 생략}

이전 step 에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

{구체적 구현 지시. 파일 경로, 클래스/함수 시그니처, 로직 설명.
코드 스니펫은 인터페이스/시그니처 수준만 제시하고 구현체는 Claude 에게 맡겨라.
단, 설계 의도에서 벗어나면 안 되는 핵심 규칙(멱등성, 보안, 데이터 무결성 등)은 반드시 명시.}

### 1) {소작업 1}

{구체적 지시 + 코드 예시}

### 2) {소작업 2}

{구체적 지시}

## Acceptance Criteria

```bash
# 백엔드 예시
pytest tests/test_<module>.py -q
ruff check src/
pyright src/

# 프론트엔드 예시
pnpm --filter <app> typecheck
pnpm --filter <app> test
pnpm --filter <app> build
```

추상적 서술 금지. AC 는 **복붙해서 바로 실행 가능한 커맨드** 여야 한다.

## 검증 절차

1. 위 AC 커맨드 실행.
2. 아키텍처 체크리스트:
   - ARCHITECTURE.md 디렉토리 구조 준수?
   - ADR 기술 스택 범위 내?
   - CLAUDE.md CRITICAL 규칙 위반 없음?
   - {프로젝트별 불변식: 멀티테넌트, lineage, grounding 등}
3. 결과에 따라 `phases/{task}/index.json` step 상태 업데이트:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message": "구체적 에러"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason": "사유"` → 즉시 중단

## 금지사항

- {이 step 에서 하지 말 것. "X 를 하지 마라. 이유: Y" 형식}
- {예: 새 의존성 도입 금지 — 이유: 번들 비대화}
- 기존 테스트를 깨뜨리지 마라
