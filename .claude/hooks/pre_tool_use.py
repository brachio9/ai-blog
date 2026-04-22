#!/usr/bin/env python3
"""
PreToolUse 훅 — Bash 커맨드 파괴적 패턴 차단.

Claude Code는 PreToolUse 훅 호출 시 stdin으로 JSON 페이로드를 전달한다:
{"tool_name": "Bash", "tool_input": {"command": "...", "description": "..."}}

매칭 패턴 발견 시 exit code 2로 종료 → Claude에게 블록 사실이 피드백됨.
파싱 실패/빈 입력 등은 allow (false positive 최소화).
"""

import json
import re
import sys


# (regex, 라벨) — 라벨은 블록 메시지에만 사용
DESTRUCTIVE_PATTERNS = [
    # rm -rf 계열 (양쪽 플래그 모두 존재하는 경우만)
    (r"\brm\s+(-[rfRF]*r[rfRF]*f|-[rfRF]*f[rfRF]*r|-r\s+-f|-f\s+-r|-R\s+-f|-f\s+-R)\b", "rm -rf"),
    # git push --force (단, --force-with-lease 는 허용)
    (r"\bgit\s+push\s+(--force(?!-with-lease)|-f\b)", "git push --force"),
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard"),
    (r"\bgit\s+clean\s+-[fFdx]*f", "git clean -f (untracked 파괴)"),
    # `-D` (강제 삭제) 만 차단. `-d` (safe delete, 머지된 브랜치만 허용) 는 통과시켜야 하므로
    # inline case-sensitive 플래그 (?-i:...) 로 IGNORECASE 전역 설정 우회.
    (r"\bgit\s+branch\s+(?-i:-D)\b", "git branch -D (강제 삭제)"),
    # SQL 파괴적
    (r"\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b", "DROP TABLE/DATABASE/SCHEMA"),
    (r"\bTRUNCATE(\s+TABLE)?\b", "TRUNCATE"),
    # K8s/Docker
    (r"\bkubectl\s+delete\s+(namespace|ns\s|--all\b)", "kubectl delete namespace/--all"),
    (r"\bdocker\s+(system|volume|network)\s+prune", "docker prune"),
    (r"\bdocker\s+volume\s+rm\b", "docker volume rm"),
    # 클라우드 리소스
    (r"\bsupabase\s+(projects\s+delete|db\s+reset)\b", "supabase 파괴적 명령"),
    (r"\baws\s+s3\s+rb\b.*--force", "aws s3 rb --force"),
    (r"\baws\s+rds\s+delete-db-instance\b", "aws rds delete-db-instance"),
]


def main() -> int:
    raw = sys.stdin.read()
    if not raw.strip():
        return 0  # 빈 입력은 허용 (훅 호출 컨벤션 위반 시에도 차단하지 않음)

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        # 스키마가 달라진 경우 false positive 방지 — 차단하지 않음
        return 0

    tool_input = payload.get("tool_input") or {}
    cmd = tool_input.get("command", "") or ""
    if not cmd:
        return 0

    for pattern, label in DESTRUCTIVE_PATTERNS:
        if re.search(pattern, cmd, re.IGNORECASE):
            print(
                f"BLOCKED: 위험한 명령어가 감지되었습니다 — {label}\n"
                f"  명령: {cmd[:300]}\n"
                f"  우회가 필요하면 사용자 명시 승인을 받거나 안전한 대안을 찾으세요.",
                file=sys.stderr,
            )
            return 2  # PreToolUse: exit 2 = 차단 + Claude에 피드백

    return 0


if __name__ == "__main__":
    sys.exit(main())
