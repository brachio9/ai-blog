#!/usr/bin/env python3
"""
Harness Step Executor — phase 내 step을 순차 실행하고 자가 교정한다.

Usage:
    python3 scripts/execute.py <phase-dir> [--push]
"""

import argparse
import contextlib
import json
import os
import subprocess
import sys
import threading
import time
import types
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent


@contextlib.contextmanager
def progress_indicator(label: str):
    """터미널 진행 표시기. with 문으로 사용하며 .elapsed 로 경과 시간을 읽는다."""
    frames = "◐◓◑◒"
    stop = threading.Event()
    t0 = time.monotonic()

    def _animate():
        idx = 0
        while not stop.wait(0.12):
            sec = int(time.monotonic() - t0)
            sys.stderr.write(f"\r{frames[idx % len(frames)]} {label} [{sec}s]")
            sys.stderr.flush()
            idx += 1
        sys.stderr.write("\r" + " " * (len(label) + 20) + "\r")
        sys.stderr.flush()

    th = threading.Thread(target=_animate, daemon=True)
    th.start()
    info = types.SimpleNamespace(elapsed=0.0)
    try:
        yield info
    finally:
        stop.set()
        th.join()
        info.elapsed = time.monotonic() - t0


class StepExecutor:
    """Phase 디렉토리 안의 step들을 순차 실행하는 하네스."""

    MAX_RETRIES = 3
    CLAUDE_TIMEOUT_SEC = 1800
    FEAT_MSG = "feat({phase}): step {num} — {name}"
    CHORE_MSG = "chore({phase}): step {num} output"
    TZ = timezone(timedelta(hours=9))

    # 매 step preamble에 inline 주입되는 가드레일 (토큰 효율 — 2-tier 정책).
    ALWAYS_INLINE_DOCS = [
        "CLAUDE.md",
        "docs/PRD.md",
        "docs/ADR.md",
        "docs/ARCHITECTURE.md",
        "docs/UI_GUIDE.md",
    ]
    # footer에 경로만 노출 — 필요 시 Read 도구로 조회하도록 안내.
    REFERENCE_ONLY_DOCS = [
        "docs/PLAN.md",
    ]

    def __init__(self, phase_dir_name: str, *, auto_push: bool = False):
        self._root = str(ROOT)
        self._phases_dir = ROOT / "phases"
        self._phase_dir = self._phases_dir / phase_dir_name
        self._phase_dir_name = phase_dir_name
        self._top_index_file = self._phases_dir / "index.json"
        self._auto_push = auto_push

        if not self._phase_dir.is_dir():
            print(f"ERROR: {self._phase_dir} not found")
            sys.exit(1)

        self._index_file = self._phase_dir / "index.json"
        if not self._index_file.exists():
            print(f"ERROR: {self._index_file} not found")
            sys.exit(1)

        idx = self._read_json(self._index_file)
        self._project = idx.get("project", "project")
        self._phase_name = idx.get("phase", phase_dir_name)
        self._total = len(idx["steps"])

    def run(self):
        self._print_header()
        self._check_blockers()
        self._checkout_branch()
        guardrails = self._load_guardrails()
        self._ensure_created_at()
        self._execute_all_steps(guardrails)
        self._finalize()

    # --- timestamps ---

    def _stamp(self) -> str:
        return datetime.now(self.TZ).strftime("%Y-%m-%dT%H:%M:%S%z")

    @staticmethod
    def _append_event(step_entry: dict, status: str, **extra) -> None:
        """step 항목에 append-only 이벤트 이력을 기록한다 (재시도·타임아웃 등 감사용)."""
        events = step_entry.setdefault("events", [])
        event = {"at": datetime.now(StepExecutor.TZ).strftime("%Y-%m-%dT%H:%M:%S%z"), "status": status}
        for k, v in extra.items():
            if v is not None:
                event[k] = v
        events.append(event)

    # --- JSON I/O ---

    @staticmethod
    def _read_json(p: Path) -> dict:
        return json.loads(p.read_text(encoding="utf-8"))

    @staticmethod
    def _write_json(p: Path, data: dict):
        p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    # --- git ---

    def _run_git(self, *args) -> subprocess.CompletedProcess:
        cmd = ["git"] + list(args)
        return subprocess.run(cmd, cwd=self._root, capture_output=True, text=True)

    def _checkout_branch(self):
        branch = f"feat-{self._phase_name}"

        r = self._run_git("rev-parse", "--abbrev-ref", "HEAD")
        if r.returncode != 0:
            print(f"  ERROR: git을 사용할 수 없거나 git repo가 아닙니다.")
            print(f"  {r.stderr.strip()}")
            sys.exit(1)

        if r.stdout.strip() == branch:
            return

        r = self._run_git("rev-parse", "--verify", branch)
        r = self._run_git("checkout", branch) if r.returncode == 0 else self._run_git("checkout", "-b", branch)

        if r.returncode != 0:
            print(f"  ERROR: 브랜치 '{branch}' checkout 실패.")
            print(f"  {r.stderr.strip()}")
            print(f"  Hint: 변경사항을 stash하거나 commit한 후 다시 시도하세요.")
            sys.exit(1)

        print(f"  Branch: {branch}")

    @staticmethod
    def _is_hook_autofix(r: subprocess.CompletedProcess) -> bool:
        """pre-commit 훅이 파일을 auto-fix 하고 commit을 중단시켰는지 감지.

        ruff-format / trailing-whitespace / end-of-file-fixer 등 일부 훅은 파일을 직접 수정한 뒤
        pre-commit이 commit을 abort한다. 이 경우 수정된 파일을 재스테이지하고 한 번 재시도하면 통과한다.
        """
        text = (r.stdout or "") + (r.stderr or "")
        return "files were modified by this hook" in text or " reformatted" in text

    def _commit_step(self, step_num: int, step_name: str):
        output_rel = f"phases/{self._phase_dir_name}/step{step_num}-output.json"
        index_rel = f"phases/{self._phase_dir_name}/index.json"

        self._run_git("add", "-A")
        self._run_git("reset", "HEAD", "--", output_rel)
        self._run_git("reset", "HEAD", "--", index_rel)

        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            msg = self.FEAT_MSG.format(phase=self._phase_name, num=step_num, name=step_name)
            r = self._run_git("commit", "-m", msg)

            # pre-commit 훅이 파일을 auto-fix 했다면 1회 재시도.
            if r.returncode != 0 and self._is_hook_autofix(r):
                print(f"  ↻ pre-commit 훅이 파일 수정 — 재스테이지 후 1회 재시도")
                self._run_git("add", "-A")
                self._run_git("reset", "HEAD", "--", output_rel)
                self._run_git("reset", "HEAD", "--", index_rel)
                r = self._run_git("commit", "-m", msg)

            if r.returncode == 0:
                print(f"  Commit: {msg}")
            else:
                print(f"  WARN: 코드 커밋 실패: {r.stderr.strip()}")

        self._run_git("add", "-A")
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            msg = self.CHORE_MSG.format(phase=self._phase_name, num=step_num)
            r = self._run_git("commit", "-m", msg)
            if r.returncode != 0:
                print(f"  WARN: housekeeping 커밋 실패: {r.stderr.strip()}")

    # --- top-level index ---

    def _update_top_index(self, status: str):
        if not self._top_index_file.exists():
            return
        top = self._read_json(self._top_index_file)
        ts = self._stamp()
        for phase in top.get("phases", []):
            if phase.get("dir") == self._phase_dir_name:
                phase["status"] = status
                ts_key = {"completed": "completed_at", "error": "failed_at", "blocked": "blocked_at"}.get(status)
                if ts_key:
                    phase[ts_key] = ts
                break
        self._write_json(self._top_index_file, top)

    # --- guardrails & context ---

    def _load_guardrails(self) -> str:
        """매 step preamble에 주입되는 가드레일을 구성한다.

        2-tier 전략:
          - ALWAYS_INLINE_DOCS: 전문을 inline. Claude가 매 step마다 반드시 읽어야 하는 핵심 규칙.
          - REFERENCE_ONLY_DOCS: 경로만 footer에 노출. 토큰 낭비 방지, 필요 시 Read로 조회.
        """
        sections = []

        for rel in self.ALWAYS_INLINE_DOCS:
            path = ROOT / rel
            if path.exists():
                sections.append(f"## {rel}\n\n{path.read_text()}")

        ref_list = [f"- `{rel}`" for rel in self.REFERENCE_ONLY_DOCS if (ROOT / rel).exists()]
        if ref_list:
            sections.append(
                "## 참조 문서 (필요 시에만 Read 도구로 조회)\n\n"
                + "\n".join(ref_list)
                + "\n\n상세 결정 근거·장기 설계는 위 파일을 **필요할 때만** 읽어라. "
                "preamble에 포함되지 않으므로 자동 주입되지 않는다."
            )

        return "\n\n---\n\n".join(sections) if sections else ""

    @staticmethod
    def _build_step_context(index: dict) -> str:
        lines = [
            f"- Step {s['step']} ({s['name']}): {s['summary']}"
            for s in index["steps"]
            if s["status"] == "completed" and s.get("summary")
        ]
        if not lines:
            return ""
        return "## 이전 Step 산출물\n\n" + "\n".join(lines) + "\n\n"

    def _build_preamble(self, guardrails: str, step_context: str,
                        prev_error: Optional[str] = None) -> str:
        commit_example = self.FEAT_MSG.format(
            phase=self._phase_name, num="N", name="<step-name>"
        )
        retry_section = ""
        if prev_error:
            retry_section = (
                f"\n## ⚠ 이전 시도 실패 — 아래 에러를 반드시 참고하여 수정하라\n\n"
                f"{prev_error}\n\n---\n\n"
            )
        return (
            f"당신은 {self._project} 프로젝트의 개발자입니다. 아래 step을 수행하세요.\n\n"
            f"{guardrails}\n\n---\n\n"
            f"{step_context}{retry_section}"
            f"## 작업 규칙\n\n"
            f"1. 이전 step에서 작성된 코드를 확인하고 일관성을 유지하라.\n"
            f"2. 이 step에 명시된 작업만 수행하라. 추가 기능이나 파일을 만들지 마라.\n"
            f"3. 기존 테스트를 깨뜨리지 마라.\n"
            f"4. AC(Acceptance Criteria) 검증을 직접 실행하라.\n"
            f"5. /phases/{self._phase_dir_name}/index.json의 해당 step status를 업데이트하라:\n"
            f"   - AC 통과 → \"completed\" + \"summary\" 필드에 이 step의 산출물을 한 줄로 요약\n"
            f"   - {self.MAX_RETRIES}회 수정 시도 후에도 실패 → \"error\" + \"error_message\" 기록\n"
            f"   - 사용자 개입이 필요한 경우 (API 키, 인증, 수동 설정 등) → \"blocked\" + \"blocked_reason\" 기록 후 즉시 중단\n"
            f"6. 모든 변경사항을 커밋하라:\n"
            f"   {commit_example}\n\n---\n\n"
        )

    # --- Claude 호출 ---

    def _watch_for_completion(
        self,
        step_num: int,
        process: subprocess.Popen,
        stop_event: threading.Event,
        grace_sec: int,
        poll_interval_sec: float = 5.0,
    ) -> None:
        """index.json 에서 해당 step.status == 'completed' 를 감지하면 grace 후 terminate.

        Claude 가 작업을 완료하고 status='completed' 를 기록했으나 이후 추가 테스트/리팩터를
        수행하며 시간을 소진하는 패턴을 차단. grace_sec 동안은 2단계 commit 여유로 기다림.

        HARNESS_KILL_ON_COMPLETED=1 일 때만 활성.
        """
        while not stop_event.is_set() and process.poll() is None:
            try:
                index = self._read_json(self._index_file)
                for s in index.get("steps", []):
                    if s.get("step") == step_num and s.get("status") == "completed":
                        # grace period — chore commit 여유
                        stop_event.wait(grace_sec)
                        if process.poll() is None and not stop_event.is_set():
                            process.terminate()
                            try:
                                process.wait(timeout=5)
                            except subprocess.TimeoutExpired:
                                process.kill()
                        return
            except Exception:
                pass
            stop_event.wait(poll_interval_sec)

    def _invoke_claude(self, step: dict, preamble: str) -> dict:
        step_num, step_name = step["step"], step["name"]
        step_file = self._phase_dir / f"step{step_num}.md"

        if not step_file.exists():
            print(f"  ERROR: {step_file} not found")
            sys.exit(1)

        prompt = preamble + step_file.read_text()
        timed_out = False

        # kill-on-completed opt-in (env flag). 기본 off → 기존 동작 유지.
        kill_on_completed = os.environ.get("HARNESS_KILL_ON_COMPLETED") == "1"
        grace_sec = int(os.environ.get("HARNESS_KILL_GRACE_SEC", "30"))

        try:
            if kill_on_completed:
                # Popen + watcher thread 방식
                process = subprocess.Popen(
                    ["claude", "-p", "--dangerously-skip-permissions", "--output-format", "json", prompt],
                    cwd=self._root,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                stop_event = threading.Event()
                watcher = threading.Thread(
                    target=self._watch_for_completion,
                    args=(step_num, process, stop_event, grace_sec),
                    daemon=True,
                )
                watcher.start()
                try:
                    stdout, stderr = process.communicate(timeout=self.CLAUDE_TIMEOUT_SEC)
                    returncode = process.returncode
                finally:
                    stop_event.set()
                    watcher.join(timeout=2)
            else:
                result = subprocess.run(
                    ["claude", "-p", "--dangerously-skip-permissions", "--output-format", "json", prompt],
                    cwd=self._root, capture_output=True, text=True, timeout=self.CLAUDE_TIMEOUT_SEC,
                )
                returncode = result.returncode
                stdout = result.stdout
                stderr = result.stderr
        except subprocess.TimeoutExpired as e:
            timed_out = True
            returncode = -1
            stdout = (e.stdout.decode() if isinstance(e.stdout, (bytes, bytearray)) else e.stdout) or ""
            stderr = (
                f"TIMEOUT after {self.CLAUDE_TIMEOUT_SEC}s — "
                f"Claude가 step {step_num} ({step_name})을(를) 완료하지 못했습니다. "
                f"retry 루프가 이 실패를 error로 처리합니다."
            )
            # index.json 이 업데이트되지 않은 채 타임아웃된 경우, error 상태를 직접 기록한다.
            # (Claude가 status를 쓰지 못했으므로 기본값 pending 에서 전이시킴)
            index = self._read_json(self._index_file)
            for s in index["steps"]:
                if s["step"] == step_num and s.get("status", "pending") == "pending":
                    s["status"] = "error"
                    s["error_message"] = stderr
                    break
            self._write_json(self._index_file, index)
            print(f"\n  ⏱ TIMEOUT: step {step_num} ({step_name}) after {self.CLAUDE_TIMEOUT_SEC}s")

        if not timed_out and returncode != 0:
            print(f"\n  WARN: Claude가 비정상 종료됨 (code {returncode})")
            if stderr:
                print(f"  stderr: {stderr[:500]}")

        output = {
            "step": step_num, "name": step_name,
            "exitCode": returncode,
            "stdout": stdout, "stderr": stderr,
            "timedOut": timed_out,
        }
        out_path = self._phase_dir / f"step{step_num}-output.json"
        with open(out_path, "w") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        return output

    # --- 헤더 & 검증 ---

    def _print_header(self):
        print(f"\n{'='*60}")
        print(f"  Harness Step Executor")
        print(f"  Phase: {self._phase_name} | Steps: {self._total}")
        if self._auto_push:
            print(f"  Auto-push: enabled")
        print(f"{'='*60}")

    def _check_blockers(self):
        index = self._read_json(self._index_file)
        for s in reversed(index["steps"]):
            if s["status"] == "error":
                print(f"\n  ✗ Step {s['step']} ({s['name']}) failed.")
                print(f"  Error: {s.get('error_message', 'unknown')}")
                print(f"  Fix and reset status to 'pending' to retry.")
                sys.exit(1)
            if s["status"] == "blocked":
                print(f"\n  ⏸ Step {s['step']} ({s['name']}) blocked.")
                print(f"  Reason: {s.get('blocked_reason', 'unknown')}")
                print(f"  Resolve and reset status to 'pending' to retry.")
                sys.exit(2)
            if s["status"] != "pending":
                break

    def _ensure_created_at(self):
        index = self._read_json(self._index_file)
        if "created_at" not in index:
            index["created_at"] = self._stamp()
            self._write_json(self._index_file, index)

    # --- 실행 루프 ---

    def _execute_single_step(self, step: dict, guardrails: str) -> bool:
        """단일 step 실행 (재시도 포함). 완료되면 True, 실패/차단이면 False."""
        step_num, step_name = step["step"], step["name"]
        done = sum(1 for s in self._read_json(self._index_file)["steps"] if s["status"] == "completed")
        prev_error = None

        for attempt in range(1, self.MAX_RETRIES + 1):
            index = self._read_json(self._index_file)
            step_context = self._build_step_context(index)
            preamble = self._build_preamble(guardrails, step_context, prev_error)

            tag = f"Step {step_num}/{self._total - 1} ({done} done): {step_name}"
            if attempt > 1:
                tag += f" [retry {attempt}/{self.MAX_RETRIES}]"

            # pi.elapsed 는 progress_indicator 의 finally 에서만 세팅된다.
            # with 블록 안에서 읽으면 0.0 을 받는다 — 반드시 블록 종료 후 읽는다.
            with progress_indicator(tag) as pi:
                self._invoke_claude(step, preamble)
            elapsed = int(pi.elapsed)

            index = self._read_json(self._index_file)
            status = next((s.get("status", "pending") for s in index["steps"] if s["step"] == step_num), "pending")
            ts = self._stamp()

            if status == "completed":
                for s in index["steps"]:
                    if s["step"] == step_num:
                        s["completed_at"] = ts
                        self._append_event(s, "completed", attempt=attempt)
                self._write_json(self._index_file, index)
                self._commit_step(step_num, step_name)
                print(f"  ✓ Step {step_num}: {step_name} [{elapsed}s]")
                return True

            if status == "blocked":
                for s in index["steps"]:
                    if s["step"] == step_num:
                        s["blocked_at"] = ts
                        self._append_event(s, "blocked", attempt=attempt,
                                           reason=s.get("blocked_reason"))
                self._write_json(self._index_file, index)
                reason = next((s.get("blocked_reason", "") for s in index["steps"] if s["step"] == step_num), "")
                print(f"  ⏸ Step {step_num}: {step_name} blocked [{elapsed}s]")
                print(f"    Reason: {reason}")
                self._update_top_index("blocked")
                sys.exit(2)

            err_msg = next(
                (s.get("error_message", "Step did not update status") for s in index["steps"] if s["step"] == step_num),
                "Step did not update status",
            )

            if attempt < self.MAX_RETRIES:
                for s in index["steps"]:
                    if s["step"] == step_num:
                        self._append_event(s, "retry", attempt=attempt, error=err_msg)
                        s["status"] = "pending"
                        s.pop("error_message", None)
                self._write_json(self._index_file, index)
                prev_error = err_msg
                print(f"  ↻ Step {step_num}: retry {attempt}/{self.MAX_RETRIES} — {err_msg}")
            else:
                for s in index["steps"]:
                    if s["step"] == step_num:
                        s["status"] = "error"
                        s["error_message"] = f"[{self.MAX_RETRIES}회 시도 후 실패] {err_msg}"
                        s["failed_at"] = ts
                        self._append_event(s, "error", attempt=attempt, error=err_msg)
                self._write_json(self._index_file, index)
                self._commit_step(step_num, step_name)
                print(f"  ✗ Step {step_num}: {step_name} failed after {self.MAX_RETRIES} attempts [{elapsed}s]")
                print(f"    Error: {err_msg}")
                self._update_top_index("error")
                sys.exit(1)

        return False  # unreachable

    def _execute_all_steps(self, guardrails: str):
        while True:
            index = self._read_json(self._index_file)
            pending = next((s for s in index["steps"] if s["status"] == "pending"), None)
            if pending is None:
                print("\n  All steps completed!")
                return

            step_num = pending["step"]
            for s in index["steps"]:
                if s["step"] == step_num and "started_at" not in s:
                    s["started_at"] = self._stamp()
                    self._append_event(s, "started")
                    self._write_json(self._index_file, index)
                    break

            self._execute_single_step(pending, guardrails)

    def _finalize(self):
        index = self._read_json(self._index_file)
        index["completed_at"] = self._stamp()
        self._write_json(self._index_file, index)
        self._update_top_index("completed")

        self._run_git("add", "-A")
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            msg = f"chore({self._phase_name}): mark phase completed"
            r = self._run_git("commit", "-m", msg)
            if r.returncode == 0:
                print(f"  ✓ {msg}")

        if self._auto_push:
            branch = f"feat-{self._phase_name}"
            r = self._run_git("push", "-u", "origin", branch)
            if r.returncode != 0:
                print(f"\n  ERROR: git push 실패: {r.stderr.strip()}")
                remote_info = self._run_git("remote", "-v")
                print(f"  Remote 설정: {remote_info.stdout.strip() or '(없음 — git remote add origin <url> 필요)'}")
                print(f"  Hint: 인증(SSH key/token) · 브랜치 protection · network 중 어느 쪽인지 확인.")
                sys.exit(1)
            print(f"  ✓ Pushed to origin/{branch}")

        print(f"\n{'='*60}")
        print(f"  Phase '{self._phase_name}' completed!")
        print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Harness Step Executor")
    parser.add_argument("phase_dir", help="Phase directory name (e.g. 0-mvp)")
    parser.add_argument("--push", action="store_true", help="Push branch after completion")
    args = parser.parse_args()

    StepExecutor(args.phase_dir, auto_push=args.push).run()


if __name__ == "__main__":
    main()
