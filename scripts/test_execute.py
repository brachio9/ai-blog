"""
execute.py 리팩터링 안전망 테스트.
리팩터링 전후 동작이 동일한지 검증한다.
"""

import json
import os
import subprocess
import sys
import textwrap
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import execute as ex


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_project(tmp_path):
    """phases/, CLAUDE.md, docs/ 를 갖춘 임시 프로젝트 구조.

    화이트리스트 정책(ALWAYS_INLINE_DOCS)에 맞춰 PRD/ADR/ARCHITECTURE/UI_GUIDE 를 채운다.
    REFERENCE_ONLY_DOCS 도 하나 심어 footer 동작을 검증할 수 있게 한다.
    """
    phases_dir = tmp_path / "phases"
    phases_dir.mkdir()

    claude_md = tmp_path / "CLAUDE.md"
    claude_md.write_text("# Rules\n- rule one\n- rule two")

    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "PRD.md").write_text("# PRD\nproduct reqs")
    (docs_dir / "ADR.md").write_text("# ADR\nPHILOSOPHY")
    (docs_dir / "ARCHITECTURE.md").write_text("# Architecture\nSome content")
    (docs_dir / "UI_GUIDE.md").write_text("# UI Guide\nAnother doc")
    # reference-only 문서 — inline 되면 안 되고 footer에 경로만 노출
    (docs_dir / "PLAN.md").write_text("# Plan\nshould-not-inline")

    return tmp_path


@pytest.fixture
def phase_dir(tmp_project):
    """step 3개를 가진 phase 디렉토리."""
    d = tmp_project / "phases" / "0-mvp"
    d.mkdir()

    index = {
        "project": "TestProject",
        "phase": "mvp",
        "steps": [
            {"step": 0, "name": "setup", "status": "completed", "summary": "프로젝트 초기화 완료"},
            {"step": 1, "name": "core", "status": "completed", "summary": "핵심 로직 구현"},
            {"step": 2, "name": "ui", "status": "pending"},
        ],
    }
    (d / "index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False))
    (d / "step2.md").write_text("# Step 2: UI\n\nUI를 구현하세요.")

    return d


@pytest.fixture
def top_index(tmp_project):
    """phases/index.json (top-level)."""
    top = {
        "phases": [
            {"dir": "0-mvp", "status": "pending"},
            {"dir": "1-polish", "status": "pending"},
        ]
    }
    p = tmp_project / "phases" / "index.json"
    p.write_text(json.dumps(top, indent=2))
    return p


@pytest.fixture
def executor(tmp_project, phase_dir):
    """테스트용 StepExecutor 인스턴스. git 호출은 별도 mock 필요."""
    with patch.object(ex, "ROOT", tmp_project):
        inst = ex.StepExecutor("0-mvp")
    # 내부 경로를 tmp_project 기준으로 재설정
    inst._root = str(tmp_project)
    inst._phases_dir = tmp_project / "phases"
    inst._phase_dir = phase_dir
    inst._phase_dir_name = "0-mvp"
    inst._index_file = phase_dir / "index.json"
    inst._top_index_file = tmp_project / "phases" / "index.json"
    return inst


# ---------------------------------------------------------------------------
# _stamp (= 이전 now_iso)
# ---------------------------------------------------------------------------

class TestStamp:
    def test_returns_kst_timestamp(self, executor):
        result = executor._stamp()
        assert "+0900" in result

    def test_format_is_iso(self, executor):
        result = executor._stamp()
        dt = datetime.strptime(result, "%Y-%m-%dT%H:%M:%S%z")
        assert dt.tzinfo is not None

    def test_is_current_time(self, executor):
        before = datetime.now(ex.StepExecutor.TZ).replace(microsecond=0)
        result = executor._stamp()
        after = datetime.now(ex.StepExecutor.TZ).replace(microsecond=0) + timedelta(seconds=1)
        parsed = datetime.strptime(result, "%Y-%m-%dT%H:%M:%S%z")
        assert before <= parsed <= after


# ---------------------------------------------------------------------------
# _read_json / _write_json
# ---------------------------------------------------------------------------

class TestJsonHelpers:
    def test_roundtrip(self, tmp_path):
        data = {"key": "값", "nested": [1, 2, 3]}
        p = tmp_path / "test.json"
        ex.StepExecutor._write_json(p, data)
        loaded = ex.StepExecutor._read_json(p)
        assert loaded == data

    def test_save_ensures_ascii_false(self, tmp_path):
        p = tmp_path / "test.json"
        ex.StepExecutor._write_json(p, {"한글": "테스트"})
        raw = p.read_text()
        assert "한글" in raw
        assert "\\u" not in raw

    def test_save_indented(self, tmp_path):
        p = tmp_path / "test.json"
        ex.StepExecutor._write_json(p, {"a": 1})
        raw = p.read_text()
        assert "\n" in raw

    def test_load_nonexistent_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            ex.StepExecutor._read_json(tmp_path / "nope.json")


# ---------------------------------------------------------------------------
# _load_guardrails
# ---------------------------------------------------------------------------

class TestLoadGuardrails:
    def test_inlines_whitelisted_docs(self, executor, tmp_project):
        """ALWAYS_INLINE_DOCS 의 내용이 전부 preamble 에 포함된다."""
        with patch.object(ex, "ROOT", tmp_project):
            result = executor._load_guardrails()
        assert "# Rules" in result
        assert "rule one" in result
        assert "# Architecture" in result
        assert "# UI Guide" in result
        assert "# PRD" in result
        assert "# ADR" in result

    def test_reference_only_docs_not_inlined(self, executor, tmp_project):
        """REFERENCE_ONLY_DOCS 의 본문은 inline 되지 않고 경로만 노출된다."""
        with patch.object(ex, "ROOT", tmp_project):
            result = executor._load_guardrails()
        assert "should-not-inline" not in result
        assert "docs/PLAN.md" in result
        assert "Read 도구로 조회" in result

    def test_sections_separated_by_divider(self, executor, tmp_project):
        with patch.object(ex, "ROOT", tmp_project):
            result = executor._load_guardrails()
        assert "---" in result

    def test_inline_order_follows_whitelist(self, executor, tmp_project):
        """ALWAYS_INLINE_DOCS 의 리스트 순서가 그대로 유지된다 (알파벳 정렬 아님)."""
        with patch.object(ex, "ROOT", tmp_project):
            result = executor._load_guardrails()
        # CLAUDE.md → docs/PRD.md → docs/ADR.md → docs/ARCHITECTURE.md → docs/UI_GUIDE.md
        claude_pos = result.index("CLAUDE.md")
        prd_pos = result.index("docs/PRD.md")
        adr_pos = result.index("docs/ADR.md")
        arch_pos = result.index("docs/ARCHITECTURE.md")
        ui_pos = result.index("docs/UI_GUIDE.md")
        assert claude_pos < prd_pos < adr_pos < arch_pos < ui_pos

    def test_missing_claude_md_is_skipped_silently(self, executor, tmp_project):
        (tmp_project / "CLAUDE.md").unlink()
        with patch.object(ex, "ROOT", tmp_project):
            result = executor._load_guardrails()
        assert "# Rules" not in result
        assert "# Architecture" in result  # 남은 화이트리스트는 정상 주입

    def test_missing_reference_doc_omitted_from_footer(self, executor, tmp_project):
        (tmp_project / "docs" / "PLAN.md").unlink()
        with patch.object(ex, "ROOT", tmp_project):
            result = executor._load_guardrails()
        # 파일이 없으면 footer 라인에서도 제외됨
        assert "docs/PLAN.md" not in result

    def test_no_docs_dir(self, executor, tmp_project):
        import shutil
        shutil.rmtree(tmp_project / "docs")
        with patch.object(ex, "ROOT", tmp_project):
            result = executor._load_guardrails()
        assert "# Rules" in result  # CLAUDE.md 만 남음
        assert "# Architecture" not in result

    def test_empty_project(self, tmp_path):
        with patch.object(ex, "ROOT", tmp_path):
            phases_dir = tmp_path / "phases" / "dummy"
            phases_dir.mkdir(parents=True)
            idx = {"project": "T", "phase": "t", "steps": []}
            (phases_dir / "index.json").write_text(json.dumps(idx))
            inst = ex.StepExecutor.__new__(ex.StepExecutor)
            result = inst._load_guardrails()
        assert result == ""


# ---------------------------------------------------------------------------
# _build_step_context
# ---------------------------------------------------------------------------

class TestBuildStepContext:
    def test_includes_completed_with_summary(self, phase_dir):
        index = json.loads((phase_dir / "index.json").read_text())
        result = ex.StepExecutor._build_step_context(index)
        assert "Step 0 (setup): 프로젝트 초기화 완료" in result
        assert "Step 1 (core): 핵심 로직 구현" in result

    def test_excludes_pending(self, phase_dir):
        index = json.loads((phase_dir / "index.json").read_text())
        result = ex.StepExecutor._build_step_context(index)
        assert "ui" not in result

    def test_excludes_completed_without_summary(self, phase_dir):
        index = json.loads((phase_dir / "index.json").read_text())
        del index["steps"][0]["summary"]
        result = ex.StepExecutor._build_step_context(index)
        assert "setup" not in result
        assert "core" in result

    def test_empty_when_no_completed(self):
        index = {"steps": [{"step": 0, "name": "a", "status": "pending"}]}
        result = ex.StepExecutor._build_step_context(index)
        assert result == ""

    def test_has_header(self, phase_dir):
        index = json.loads((phase_dir / "index.json").read_text())
        result = ex.StepExecutor._build_step_context(index)
        assert result.startswith("## 이전 Step 산출물")


# ---------------------------------------------------------------------------
# _build_preamble
# ---------------------------------------------------------------------------

class TestBuildPreamble:
    def test_includes_project_name(self, executor):
        result = executor._build_preamble("", "")
        assert "TestProject" in result

    def test_includes_guardrails(self, executor):
        result = executor._build_preamble("GUARD_CONTENT", "")
        assert "GUARD_CONTENT" in result

    def test_includes_step_context(self, executor):
        ctx = "## 이전 Step 산출물\n\n- Step 0: done"
        result = executor._build_preamble("", ctx)
        assert "이전 Step 산출물" in result

    def test_includes_commit_example(self, executor):
        result = executor._build_preamble("", "")
        assert "feat(mvp):" in result

    def test_includes_rules(self, executor):
        result = executor._build_preamble("", "")
        assert "작업 규칙" in result
        assert "AC" in result

    def test_no_retry_section_by_default(self, executor):
        result = executor._build_preamble("", "")
        assert "이전 시도 실패" not in result

    def test_retry_section_with_prev_error(self, executor):
        result = executor._build_preamble("", "", prev_error="타입 에러 발생")
        assert "이전 시도 실패" in result
        assert "타입 에러 발생" in result

    def test_includes_max_retries(self, executor):
        result = executor._build_preamble("", "")
        assert str(ex.StepExecutor.MAX_RETRIES) in result

    def test_includes_index_path(self, executor):
        result = executor._build_preamble("", "")
        assert "/phases/0-mvp/index.json" in result


# ---------------------------------------------------------------------------
# _update_top_index
# ---------------------------------------------------------------------------

class TestUpdateTopIndex:
    def test_completed(self, executor, top_index):
        executor._top_index_file = top_index
        executor._update_top_index("completed")
        data = json.loads(top_index.read_text())
        mvp = next(p for p in data["phases"] if p["dir"] == "0-mvp")
        assert mvp["status"] == "completed"
        assert "completed_at" in mvp

    def test_error(self, executor, top_index):
        executor._top_index_file = top_index
        executor._update_top_index("error")
        data = json.loads(top_index.read_text())
        mvp = next(p for p in data["phases"] if p["dir"] == "0-mvp")
        assert mvp["status"] == "error"
        assert "failed_at" in mvp

    def test_blocked(self, executor, top_index):
        executor._top_index_file = top_index
        executor._update_top_index("blocked")
        data = json.loads(top_index.read_text())
        mvp = next(p for p in data["phases"] if p["dir"] == "0-mvp")
        assert mvp["status"] == "blocked"
        assert "blocked_at" in mvp

    def test_other_phases_unchanged(self, executor, top_index):
        executor._top_index_file = top_index
        executor._update_top_index("completed")
        data = json.loads(top_index.read_text())
        polish = next(p for p in data["phases"] if p["dir"] == "1-polish")
        assert polish["status"] == "pending"

    def test_nonexistent_dir_is_noop(self, executor, top_index):
        executor._top_index_file = top_index
        executor._phase_dir_name = "no-such-dir"
        original = json.loads(top_index.read_text())
        executor._update_top_index("completed")
        after = json.loads(top_index.read_text())
        for p_before, p_after in zip(original["phases"], after["phases"]):
            assert p_before["status"] == p_after["status"]

    def test_no_top_index_file(self, executor, tmp_path):
        executor._top_index_file = tmp_path / "nonexistent.json"
        executor._update_top_index("completed")  # should not raise


# ---------------------------------------------------------------------------
# _checkout_branch (mocked)
# ---------------------------------------------------------------------------

class TestCheckoutBranch:
    def _mock_git(self, executor, responses):
        call_idx = {"i": 0}
        def fake_git(*args):
            idx = call_idx["i"]
            call_idx["i"] += 1
            if idx < len(responses):
                return responses[idx]
            return MagicMock(returncode=0, stdout="", stderr="")
        executor._run_git = fake_git

    def test_already_on_branch(self, executor):
        self._mock_git(executor, [
            MagicMock(returncode=0, stdout="feat-mvp\n", stderr=""),
        ])
        executor._checkout_branch()  # should return without checkout

    def test_branch_exists_checkout(self, executor):
        self._mock_git(executor, [
            MagicMock(returncode=0, stdout="main\n", stderr=""),
            MagicMock(returncode=0, stdout="", stderr=""),
            MagicMock(returncode=0, stdout="", stderr=""),
        ])
        executor._checkout_branch()

    def test_branch_not_exists_create(self, executor):
        self._mock_git(executor, [
            MagicMock(returncode=0, stdout="main\n", stderr=""),
            MagicMock(returncode=1, stdout="", stderr="not found"),
            MagicMock(returncode=0, stdout="", stderr=""),
        ])
        executor._checkout_branch()

    def test_checkout_fails_exits(self, executor):
        self._mock_git(executor, [
            MagicMock(returncode=0, stdout="main\n", stderr=""),
            MagicMock(returncode=1, stdout="", stderr=""),
            MagicMock(returncode=1, stdout="", stderr="dirty tree"),
        ])
        with pytest.raises(SystemExit) as exc_info:
            executor._checkout_branch()
        assert exc_info.value.code == 1

    def test_no_git_exits(self, executor):
        self._mock_git(executor, [
            MagicMock(returncode=1, stdout="", stderr="not a git repo"),
        ])
        with pytest.raises(SystemExit) as exc_info:
            executor._checkout_branch()
        assert exc_info.value.code == 1


# ---------------------------------------------------------------------------
# _commit_step (mocked)
# ---------------------------------------------------------------------------

class TestCommitStep:
    def test_two_phase_commit(self, executor):
        calls = []
        def fake_git(*args):
            calls.append(args)
            if args[:2] == ("diff", "--cached"):
                return MagicMock(returncode=1)
            return MagicMock(returncode=0, stdout="", stderr="")
        executor._run_git = fake_git

        executor._commit_step(2, "ui")

        commit_calls = [c for c in calls if c[0] == "commit"]
        assert len(commit_calls) == 2
        assert "feat(mvp):" in commit_calls[0][2]
        assert "chore(mvp):" in commit_calls[1][2]

    def test_no_code_changes_skips_feat_commit(self, executor):
        call_count = {"diff": 0}
        calls = []
        def fake_git(*args):
            calls.append(args)
            if args[:2] == ("diff", "--cached"):
                call_count["diff"] += 1
                if call_count["diff"] == 1:
                    return MagicMock(returncode=0)
                return MagicMock(returncode=1)
            return MagicMock(returncode=0, stdout="", stderr="")
        executor._run_git = fake_git

        executor._commit_step(2, "ui")

        commit_msgs = [c[2] for c in calls if c[0] == "commit"]
        assert len(commit_msgs) == 1
        assert "chore" in commit_msgs[0]


# ---------------------------------------------------------------------------
# _is_hook_autofix + pre-commit 재시도
# ---------------------------------------------------------------------------

class TestIsHookAutofix:
    def test_detects_files_were_modified(self):
        r = MagicMock(stdout="ruff format...Failed\n- files were modified by this hook\n", stderr="")
        assert ex.StepExecutor._is_hook_autofix(r) is True

    def test_detects_reformatted(self):
        r = MagicMock(stdout="1 file reformatted, 5 files left unchanged", stderr="")
        assert ex.StepExecutor._is_hook_autofix(r) is True

    def test_returns_false_for_unrelated_failure(self):
        r = MagicMock(stdout="", stderr="fatal: some other git error")
        assert ex.StepExecutor._is_hook_autofix(r) is False

    def test_handles_empty_outputs(self):
        r = MagicMock(stdout="", stderr="")
        assert ex.StepExecutor._is_hook_autofix(r) is False

    def test_handles_none_outputs(self):
        r = MagicMock(stdout=None, stderr=None)
        assert ex.StepExecutor._is_hook_autofix(r) is False

    def test_checks_stderr_as_well(self):
        r = MagicMock(stdout="", stderr="- files were modified by this hook")
        assert ex.StepExecutor._is_hook_autofix(r) is True


class TestCommitStepAutofixRetry:
    def test_retries_after_pre_commit_autofix_then_succeeds(self, executor):
        """pre-commit 훅이 파일을 수정해 첫 feat 커밋이 실패하면, 재스테이지 후 1회 재시도해 성공한다."""
        calls = []
        commit_attempt = {"n": 0}

        def fake_git(*args):
            calls.append(args)
            if args[0] == "commit":
                commit_attempt["n"] += 1
                if commit_attempt["n"] == 1:
                    # 첫 시도: pre-commit 훅이 파일을 수정 → abort
                    return MagicMock(
                        returncode=1,
                        stdout="ruff format...Failed\n- files were modified by this hook\n1 file reformatted",
                        stderr="",
                    )
                # 재시도 / 이후 chore 커밋은 성공
                return MagicMock(returncode=0, stdout="", stderr="")
            if args[:2] == ("diff", "--cached"):
                return MagicMock(returncode=1)  # staged changes 있음
            return MagicMock(returncode=0, stdout="", stderr="")

        executor._run_git = fake_git
        executor._commit_step(2, "ui")

        commit_calls = [c for c in calls if c[0] == "commit"]
        # feat (실패) + feat 재시도 + chore = 총 3회
        assert len(commit_calls) == 3
        assert all("feat(mvp):" in c[2] for c in commit_calls[:2])
        assert "chore(mvp):" in commit_calls[2][2]

    def test_does_not_retry_if_not_autofix(self, executor):
        """pre-commit 외 실패(예: 훅 에러)는 재시도하지 않는다."""
        calls = []

        def fake_git(*args):
            calls.append(args)
            if args[0] == "commit":
                return MagicMock(returncode=1, stdout="", stderr="fatal: unrelated error")
            if args[:2] == ("diff", "--cached"):
                return MagicMock(returncode=1)
            return MagicMock(returncode=0, stdout="", stderr="")

        executor._run_git = fake_git
        executor._commit_step(2, "ui")

        commit_calls = [c for c in calls if c[0] == "commit"]
        # feat (실패, 재시도 X) + chore = 총 2회
        assert len(commit_calls) == 2


# ---------------------------------------------------------------------------
# progress_indicator elapsed 타이밍 (bug fix 회귀)
# ---------------------------------------------------------------------------

class TestProgressIndicatorElapsedTiming:
    def test_elapsed_is_zero_inside_with_block(self):
        """finally 실행 전에는 pi.elapsed 가 초기값 0.0 — with 블록 안에서 읽으면 안 된다."""
        import time
        with ex.progress_indicator("test") as pi:
            time.sleep(0.1)
            inside = pi.elapsed
        outside = pi.elapsed
        assert inside == 0.0, "elapsed must be 0.0 inside the with block (before finally)"
        assert outside > 0, "elapsed must be populated after finally executes"


# ---------------------------------------------------------------------------
# _invoke_claude (mocked)
# ---------------------------------------------------------------------------

class TestInvokeClaude:
    def test_invokes_claude_with_correct_args(self, executor):
        mock_result = MagicMock(returncode=0, stdout='{"result": "ok"}', stderr="")
        step = {"step": 2, "name": "ui"}
        preamble = "PREAMBLE\n"

        with patch("subprocess.run", return_value=mock_result) as mock_run:
            output = executor._invoke_claude(step, preamble)

        cmd = mock_run.call_args[0][0]
        assert cmd[0] == "claude"
        assert "-p" in cmd
        assert "--dangerously-skip-permissions" in cmd
        assert "--output-format" in cmd
        assert "PREAMBLE" in cmd[-1]
        assert "UI를 구현하세요" in cmd[-1]

    def test_saves_output_json(self, executor):
        mock_result = MagicMock(returncode=0, stdout='{"ok": true}', stderr="")
        step = {"step": 2, "name": "ui"}

        with patch("subprocess.run", return_value=mock_result):
            executor._invoke_claude(step, "preamble")

        output_file = executor._phase_dir / "step2-output.json"
        assert output_file.exists()
        data = json.loads(output_file.read_text())
        assert data["step"] == 2
        assert data["name"] == "ui"
        assert data["exitCode"] == 0

    def test_nonexistent_step_file_exits(self, executor):
        step = {"step": 99, "name": "nonexistent"}
        with pytest.raises(SystemExit) as exc_info:
            executor._invoke_claude(step, "preamble")
        assert exc_info.value.code == 1

    def test_timeout_is_1800(self, executor):
        mock_result = MagicMock(returncode=0, stdout="{}", stderr="")
        step = {"step": 2, "name": "ui"}

        with patch("subprocess.run", return_value=mock_result) as mock_run:
            executor._invoke_claude(step, "preamble")

        assert mock_run.call_args[1]["timeout"] == ex.StepExecutor.CLAUDE_TIMEOUT_SEC

    def test_timeout_marks_step_error(self, executor):
        """TimeoutExpired 발생 시 step 을 error 상태로 전이시키고 output.json 에 timedOut 을 기록."""
        step = {"step": 2, "name": "ui"}
        timeout_exc = subprocess.TimeoutExpired(
            cmd=["claude"], timeout=ex.StepExecutor.CLAUDE_TIMEOUT_SEC,
            output="", stderr=None,
        )

        with patch("subprocess.run", side_effect=timeout_exc):
            output = executor._invoke_claude(step, "preamble")

        # output.json 에 타임아웃 표식
        assert output["timedOut"] is True
        assert output["exitCode"] == -1
        assert "TIMEOUT" in output["stderr"]

        # index.json 상 해당 step 상태가 error 로 전이
        index = json.loads(executor._index_file.read_text())
        ui_step = next(s for s in index["steps"] if s["step"] == 2)
        assert ui_step["status"] == "error"
        assert "TIMEOUT" in ui_step["error_message"]

    def test_timeout_does_not_overwrite_completed(self, executor):
        """이미 completed 된 step 이 어찌된 영문인지 retry 루트로 들어와 타임아웃이 나도 status를 덮지 않는다."""
        # 사전 세팅: step 2 를 completed 로 변경
        index = json.loads(executor._index_file.read_text())
        for s in index["steps"]:
            if s["step"] == 2:
                s["status"] = "completed"
        executor._index_file.write_text(json.dumps(index, ensure_ascii=False, indent=2))

        step = {"step": 2, "name": "ui"}
        timeout_exc = subprocess.TimeoutExpired(
            cmd=["claude"], timeout=ex.StepExecutor.CLAUDE_TIMEOUT_SEC,
            output="", stderr=None,
        )
        with patch("subprocess.run", side_effect=timeout_exc):
            executor._invoke_claude(step, "preamble")

        index = json.loads(executor._index_file.read_text())
        ui_step = next(s for s in index["steps"] if s["step"] == 2)
        assert ui_step["status"] == "completed"  # pending 만 error 로 전이, 이미 completed 된 건 보호


# ---------------------------------------------------------------------------
# _append_event (이력 배열)
# ---------------------------------------------------------------------------

class TestAppendEvent:
    def test_appends_event_with_timestamp_and_status(self):
        step_entry = {"step": 0, "name": "setup", "status": "pending"}
        ex.StepExecutor._append_event(step_entry, "started")
        assert len(step_entry["events"]) == 1
        assert step_entry["events"][0]["status"] == "started"
        assert "+0900" in step_entry["events"][0]["at"]

    def test_appends_multiple_events_in_order(self):
        step_entry = {"step": 0, "name": "setup", "status": "pending"}
        ex.StepExecutor._append_event(step_entry, "started")
        ex.StepExecutor._append_event(step_entry, "retry", attempt=1, error="test")
        ex.StepExecutor._append_event(step_entry, "completed", attempt=2)
        assert [e["status"] for e in step_entry["events"]] == ["started", "retry", "completed"]
        assert step_entry["events"][1]["attempt"] == 1
        assert step_entry["events"][1]["error"] == "test"

    def test_omits_none_extras(self):
        step_entry = {"step": 0, "name": "setup", "status": "pending"}
        ex.StepExecutor._append_event(step_entry, "blocked", reason=None, attempt=3)
        event = step_entry["events"][0]
        assert "reason" not in event
        assert event["attempt"] == 3


# ---------------------------------------------------------------------------
# progress_indicator (= 이전 Spinner)
# ---------------------------------------------------------------------------

class TestProgressIndicator:
    def test_context_manager(self):
        import time
        with ex.progress_indicator("test") as pi:
            time.sleep(0.15)
        assert pi.elapsed >= 0.1

    def test_elapsed_increases(self):
        import time
        with ex.progress_indicator("test") as pi:
            time.sleep(0.2)
        assert pi.elapsed > 0


# ---------------------------------------------------------------------------
# main() CLI 파싱 (mocked)
# ---------------------------------------------------------------------------

class TestMainCli:
    def test_no_args_exits(self):
        with patch("sys.argv", ["execute.py"]):
            with pytest.raises(SystemExit) as exc_info:
                ex.main()
            assert exc_info.value.code == 2  # argparse exits with 2

    def test_invalid_phase_dir_exits(self):
        with patch("sys.argv", ["execute.py", "nonexistent"]):
            with patch.object(ex, "ROOT", Path("/tmp/fake_nonexistent")):
                with pytest.raises(SystemExit) as exc_info:
                    ex.main()
                assert exc_info.value.code == 1

    def test_missing_index_exits(self, tmp_project):
        (tmp_project / "phases" / "empty").mkdir()
        with patch("sys.argv", ["execute.py", "empty"]):
            with patch.object(ex, "ROOT", tmp_project):
                with pytest.raises(SystemExit) as exc_info:
                    ex.main()
                assert exc_info.value.code == 1


# ---------------------------------------------------------------------------
# _check_blockers (= 이전 main() error/blocked 체크)
# ---------------------------------------------------------------------------

class TestCheckBlockers:
    def _make_executor_with_steps(self, tmp_project, steps):
        d = tmp_project / "phases" / "test-phase"
        d.mkdir(exist_ok=True)
        index = {"project": "T", "phase": "test", "steps": steps}
        (d / "index.json").write_text(json.dumps(index))

        with patch.object(ex, "ROOT", tmp_project):
            inst = ex.StepExecutor.__new__(ex.StepExecutor)
        inst._root = str(tmp_project)
        inst._phases_dir = tmp_project / "phases"
        inst._phase_dir = d
        inst._phase_dir_name = "test-phase"
        inst._index_file = d / "index.json"
        inst._top_index_file = tmp_project / "phases" / "index.json"
        inst._phase_name = "test"
        inst._total = len(steps)
        return inst

    def test_error_step_exits_1(self, tmp_project):
        steps = [
            {"step": 0, "name": "ok", "status": "completed"},
            {"step": 1, "name": "bad", "status": "error", "error_message": "fail"},
        ]
        inst = self._make_executor_with_steps(tmp_project, steps)
        with pytest.raises(SystemExit) as exc_info:
            inst._check_blockers()
        assert exc_info.value.code == 1

    def test_blocked_step_exits_2(self, tmp_project):
        steps = [
            {"step": 0, "name": "ok", "status": "completed"},
            {"step": 1, "name": "stuck", "status": "blocked", "blocked_reason": "API key"},
        ]
        inst = self._make_executor_with_steps(tmp_project, steps)
        with pytest.raises(SystemExit) as exc_info:
            inst._check_blockers()
        assert exc_info.value.code == 2


# ---------------------------------------------------------------------------
# Watcher (HARNESS_KILL_ON_COMPLETED)
# ---------------------------------------------------------------------------

class TestWatchForCompletion:
    """watcher thread 가 index.json 의 status='completed' 를 감지하고
    grace 후 subprocess 를 종료시키는지."""

    def _make_fake_process(self, alive_iters: int = 10):
        """poll() 가 처음 alive_iters 번 None 반환 후 0 반환하는 fake subprocess."""
        proc = MagicMock()
        state = {"polls": 0, "terminated": False, "killed": False}

        def poll():
            if state["terminated"] or state["killed"]:
                return 0
            state["polls"] += 1
            return None if state["polls"] <= alive_iters else 0

        def terminate():
            state["terminated"] = True

        def wait(timeout=None):
            return 0

        def kill():
            state["killed"] = True

        proc.poll = poll
        proc.terminate = terminate
        proc.wait = wait
        proc.kill = kill
        proc._state = state
        return proc

    def test_terminates_when_status_completed(self, executor, phase_dir):
        import threading
        proc = self._make_fake_process(alive_iters=100)
        stop = threading.Event()

        # index.json 에 step 2 status='completed' 로 업데이트
        index = json.loads((phase_dir / "index.json").read_text())
        for s in index["steps"]:
            if s["step"] == 2:
                s["status"] = "completed"
        (phase_dir / "index.json").write_text(json.dumps(index))

        # grace 0 으로 즉시 kill
        t = threading.Thread(
            target=executor._watch_for_completion,
            args=(2, proc, stop, 0, 0.05),  # grace=0, poll=50ms
        )
        t.start()
        t.join(timeout=2)

        assert proc._state["terminated"], "watcher 가 terminate() 호출 안 함"

    def test_does_not_terminate_if_status_not_completed(self, executor, phase_dir):
        import threading
        proc = self._make_fake_process(alive_iters=5)
        stop = threading.Event()

        # status 를 pending 으로 유지
        index = json.loads((phase_dir / "index.json").read_text())
        for s in index["steps"]:
            if s["step"] == 2:
                s["status"] = "pending"
        (phase_dir / "index.json").write_text(json.dumps(index))

        t = threading.Thread(
            target=executor._watch_for_completion,
            args=(2, proc, stop, 0, 0.05),
        )
        t.start()
        # 작은 poll 여러 번 후 subprocess 가 자연 종료
        t.join(timeout=2)

        assert not proc._state["terminated"], "status 가 completed 아닌데 terminate 됨"

    def test_respects_grace_period(self, executor, phase_dir):
        """status='completed' 감지 후 grace 동안 기다렸다가 terminate."""
        import threading, time
        proc = self._make_fake_process(alive_iters=100)
        stop = threading.Event()

        index = json.loads((phase_dir / "index.json").read_text())
        for s in index["steps"]:
            if s["step"] == 2:
                s["status"] = "completed"
        (phase_dir / "index.json").write_text(json.dumps(index))

        start = time.perf_counter()
        t = threading.Thread(
            target=executor._watch_for_completion,
            args=(2, proc, stop, 1, 0.05),  # grace 1s
        )
        t.start()
        t.join(timeout=3)
        elapsed = time.perf_counter() - start

        assert proc._state["terminated"]
        assert elapsed >= 1.0, f"grace 1s 인데 {elapsed:.2f}s 에 terminate"
        assert elapsed < 2.5, f"grace 1s 대비 너무 늦게 terminate: {elapsed:.2f}s"

    def test_stop_event_aborts_watcher(self, executor, phase_dir):
        """외부에서 stop_event set 되면 watcher 가 정상 종료."""
        import threading
        proc = self._make_fake_process(alive_iters=1000)
        stop = threading.Event()

        t = threading.Thread(
            target=executor._watch_for_completion,
            args=(2, proc, stop, 30, 0.1),
        )
        t.start()
        stop.set()
        t.join(timeout=2)

        assert not t.is_alive(), "stop_event set 에도 watcher 살아있음"
        assert not proc._state["terminated"]
