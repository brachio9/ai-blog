"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { MdxBody } from "@/components/mdx/MdxBody";
import { AXES } from "@/lib/axes";
import { CATEGORIES } from "@/lib/categories";
import { FORMATS } from "@/lib/formats";

import { previewMdx, serializeDraftFile } from "./actions";
import {
  draftFilePath,
  isValidSlug,
  suggestSlug,
  validateDraft,
  type DraftForm,
  SLUG_RULE,
} from "./draft";

/** 매 타건마다 서버를 부르지 않는다. 타이핑이 멎고 나서 한 번 컴파일한다. */
const PREVIEW_DEBOUNCE_MS = 600;

const INPUT =
  "w-full rounded border border-border bg-surface px-3 py-2 text-sm text-body focus-visible:outline-2 focus-visible:outline-focus";
const LABEL = "block text-sm text-muted";
const LEGEND = "text-sm font-medium text-heading";
const TAB =
  "rounded border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus";
const PRIMARY_BUTTON =
  "rounded bg-heading px-4 py-2 text-sm font-medium text-bg transition-opacity focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40";
const SECONDARY_BUTTON =
  "rounded border border-border px-3 py-1.5 text-sm text-body transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40";

/** 커밋한 뒤 Vercel 이 다시 빌드해 사이트에 반영되기까지 걸리는 시간 (ADR-001). */
const REDEPLOY_NOTICE =
  "사이트에 반영되기까지 재배포에 ~90초 걸립니다. 바로 새로고침해도 아직 옛 내용입니다.";

type Pane = "write" | "preview";
type Busy = "save" | "delete" | "upload" | null;

interface Notice {
  tone: "ok" | "error";
  text: string;
  commitUrl?: string;
}

interface EditorProps {
  initial: DraftForm;
  /** 기존 글을 열었을 때의 레포 경로. 신규 작성이면 null. */
  filePath: string | null;
  /** 기존 글의 blob sha — 수정 커밋이 덮어쓸 대상을 특정한다. */
  sha: string | null;
}

export function Editor({ initial, filePath, sha }: EditorProps) {
  const [form, setForm] = useState<DraftForm>(initial);
  // 사용자가 slug 를 직접 건드린 뒤에는 제목을 고쳐도 덮어쓰지 않는다.
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const [pane, setPane] = useState<Pane>("write");

  /** 커밋할 때마다 바뀐다 — 저장 응답으로 갱신하지 않으면 두 번째 저장이 422 로 실패한다. */
  const [saved, setSaved] = useState<{ path: string; sha: string } | null>(
    filePath && sha ? { path: filePath, sha } : null,
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** 어떤 본문으로 만든 결과인지 함께 들고 있어야 "컴파일 중" 을 상태 없이 알 수 있다. */
  const [preview, setPreview] = useState<{
    source: string;
    content: ReactNode;
    error: string | null;
  }>({ source: "", content: null, error: null });

  const { body } = form;
  const isEmpty = body.trim() === "";

  useEffect(() => {
    if (body.trim() === "") return;

    let active = true;
    const timer = setTimeout(async () => {
      const result = await previewMdx(body);
      // 타이핑이 이어졌으면 이 결과는 이미 낡았다 — 늦게 도착한 응답이 최신 프리뷰를 덮지 않게 한다.
      if (!active) return;

      // 실패하면 content 를 비운다. 낡은 프리뷰가 남아 있으면 고쳐진 줄 안다.
      setPreview(
        result.ok
          ? { source: body, content: result.content, error: null }
          : { source: body, content: null, error: result.message },
      );
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [body]);

  const compiling = !isEmpty && preview.source !== body;

  const issues = useMemo(() => validateDraft(form), [form]);
  const targetPath = draftFilePath(form.category, form.publishedAt, form.slug);

  function update(patch: Partial<DraftForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateTitle(title: string) {
    // 한글 제목은 후보가 빈 문자열이 된다 — 그때는 사용자가 직접 채운다 (로마자화하지 않는다).
    update(slugTouched ? { title } : { title, slug: suggestSlug(title) });
  }

  /**
   * 저장 = /api/publish 커밋. 직렬화만 서버 액션을 거친다 (gray-matter 는 브라우저에서 못 돈다).
   * 경로·frontmatter 는 라우트가 다시 검증한다 — 여기 검사는 사용자를 위한 것이지 방어선이 아니다.
   */
  async function save() {
    if (busy || !targetPath) return;

    setBusy("save");
    setNotice(null);
    try {
      const built = await serializeDraftFile(form);
      if (!built.ok) {
        setNotice({ tone: "error", text: built.message });
        return;
      }

      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          path: targetPath,
          content: built.content,
          // 경로가 바뀌었으면 그건 다른 파일이다 — 옛 sha 를 붙이면 엉뚱한 글을 덮어쓴다.
          sha: saved?.path === targetPath ? saved.sha : undefined,
        }),
      });

      if (!response.ok) {
        setNotice({ tone: "error", text: await failureMessage(response) });
        return;
      }

      const result = (await response.json()) as { sha: string; commitUrl: string };
      setSaved({ path: targetPath, sha: result.sha });
      setNotice({
        tone: "ok",
        text: `${targetPath} 를 커밋했습니다. ${REDEPLOY_NOTICE}`,
        commitUrl: result.commitUrl,
      });
    } catch (error) {
      setNotice({ tone: "error", text: describe(error) });
    } finally {
      setBusy(null);
    }
  }

  /** 되돌릴 수 없다 — 버튼은 두 단계다. */
  async function remove() {
    if (busy || !saved) return;

    setBusy("delete");
    setNotice(null);
    try {
      const response = await fetch("/api/publish", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: saved.path, sha: saved.sha }),
      });

      if (!response.ok) {
        setNotice({ tone: "error", text: await failureMessage(response) });
        return;
      }

      setNotice({
        tone: "ok",
        text: `${saved.path} 를 레포에서 삭제했습니다. ${REDEPLOY_NOTICE}`,
      });
      // 지운 파일의 sha 로 다시 저장하면 422 다. 이제부터는 신규 작성이다.
      setSaved(null);
      setConfirmingDelete(false);
    } catch (error) {
      setNotice({ tone: "error", text: describe(error) });
    } finally {
      setBusy(null);
    }
  }

  /** 이미지는 글과 **별개의 커밋**으로 레포에 올라간다 (ADR-005). 그 사실을 숨기지 않는다. */
  async function upload(file: File) {
    setBusy("upload");
    setNotice(null);
    try {
      const payload = new FormData();
      payload.set("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        setNotice({ tone: "error", text: await failureMessage(response) });
        return;
      }

      const result = (await response.json()) as { url: string; commitUrl: string };
      insertImage(result.url, file.name.replace(/\.[^.]+$/, ""));
      setNotice({
        tone: "ok",
        text: `이미지를 레포에 커밋했습니다 (${result.url}). 글을 저장하지 않고 나가도 이미지는 레포에 남습니다. 재배포 전까지는 프리뷰에서 깨져 보이는데 정상입니다.`,
        commitUrl: result.commitUrl,
      });
    } catch (error) {
      setNotice({ tone: "error", text: describe(error) });
    } finally {
      setBusy(null);
    }
  }

  /**
   * 커서 자리에 마크다운을 끼워 넣는다. 앞뒤로 빈 줄을 채워 **독립된 블록**으로 만든다 —
   * 글줄에 붙으면 이미지가 같은 문단으로 묶이고, 그 문단은 <p> 안의 <figure> 가 되어
   * 브라우저가 DOM 중첩 경고를 낸다 (실측). content/ 의 기존 글들도 같은 규칙으로 쓰여 있다.
   */
  function insertImage(url: string, alt: string) {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? form.body.length;
    const end = textarea?.selectionEnd ?? form.body.length;

    // 선택 위치는 지금 화면에 있는 값(form.body) 기준이다 — 같은 값으로 잘라야 어긋나지 않는다.
    const before = form.body.slice(0, start);
    const after = form.body.slice(end);
    const lead = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const trail = !after ? "\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    const snippet = `${lead}![${alt}](${url})${trail}`;
    const caret = start + snippet.length - trail.length;

    update({ body: `${before}${snippet}${after}` });

    // 값이 바뀐 뒤에 커서를 옮겨야 브라우저가 끝으로 밀어 두지 않는다.
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-heading">
            {filePath ? "글 수정" : "새 글 작성"}
          </h1>
          <p className="mt-1 font-mono text-xs break-all text-muted">
            {targetPath ?? "저장 경로 — 발행일과 slug 를 채우면 정해집니다"}
            {filePath && targetPath && filePath !== targetPath
              ? ` (원래 ${filePath})`
              : null}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saved ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy !== null}
              className={`${SECONDARY_BUTTON} text-danger`}
            >
              삭제
            </button>
          ) : null}

          <button
            type="button"
            onClick={save}
            disabled={busy !== null || !targetPath || issues.length > 0}
            title={
              !targetPath
                ? "발행일과 slug 를 채워야 저장 경로가 정해집니다"
                : issues.length > 0
                  ? "frontmatter 오류를 먼저 고치세요"
                  : saved
                    ? "레포의 기존 파일을 덮어씁니다"
                    : "레포에 새 파일로 커밋합니다"
            }
            className={PRIMARY_BUTTON}
          >
            {busy === "save" ? "저장 중…" : saved ? "저장 (덮어쓰기)" : "저장"}
          </button>
        </div>
      </header>

      {confirmingDelete && saved ? (
        <div
          role="alert"
          className="border-l-[3px] border-l-danger bg-surface py-3 pl-4"
        >
          <p className="text-sm text-body">
            <span className="font-mono text-xs">{saved.path}</span> 를 레포에서
            지웁니다. <strong className="font-medium">되돌릴 수 없습니다</strong>{" "}
            (git 히스토리에는 남지만 사이트에서는 사라집니다).
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={busy !== null}
              className={`${SECONDARY_BUTTON} border-danger text-danger`}
            >
              {busy === "delete" ? "삭제 중…" : "정말 삭제합니다"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy !== null}
              className={SECONDARY_BUTTON}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className={`border-l-[3px] bg-surface py-3 pl-4 ${notice.tone === "ok" ? "border-l-success" : "border-l-danger"}`}
        >
          <p className="text-sm break-words whitespace-pre-wrap text-body">
            {notice.text}
          </p>
          {notice.commitUrl ? (
            <a
              href={notice.commitUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading"
            >
              커밋 확인하기 →
            </a>
          ) : null}
        </div>
      ) : null}

      {/* 좁은 화면에서는 두 칸을 나란히 놓을 수 없다 — 탭으로 바꿔 보여 준다. */}
      <div className="flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setPane("write")}
          aria-pressed={pane === "write"}
          className={`${TAB} ${pane === "write" ? "border-heading font-medium text-heading" : "border-border text-muted"}`}
        >
          작성
        </button>
        <button
          type="button"
          onClick={() => setPane("preview")}
          aria-pressed={pane === "preview"}
          className={`${TAB} ${pane === "preview" ? "border-heading font-medium text-heading" : "border-border text-muted"}`}
        >
          프리뷰
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-label="작성"
          className={pane === "write" ? "space-y-6" : "hidden space-y-6 lg:block"}
        >
          <fieldset className="space-y-3 rounded-md border border-border p-5">
            <legend className={LEGEND}>기본</legend>

            <label className={LABEL}>
              제목
              <input
                className={`mt-1 ${INPUT}`}
                value={form.title}
                onChange={(event) => updateTitle(event.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={LABEL}>
                카테고리
                <select
                  className={`mt-1 ${INPUT}`}
                  value={form.category}
                  onChange={(event) =>
                    update({
                      category: event.target
                        .value as DraftForm["category"],
                    })
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={LABEL}>
                slug
                <input
                  className={`mt-1 ${INPUT} font-mono`}
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update({ slug: event.target.value });
                  }}
                  placeholder="moe-routing-pipeline"
                  aria-describedby="slug-rule"
                />
              </label>
            </div>

            <p
              id="slug-rule"
              className={`text-xs ${form.slug && !isValidSlug(form.slug) ? "text-danger" : "text-muted"}`}
            >
              {SLUG_RULE}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* 축은 필수·단일이다 — 「없음」 선택지를 만들지 마라 (docs/PRD.md). */}
              <label className={LABEL}>
                주제 축
                <select
                  className={`mt-1 ${INPUT}`}
                  value={form.axis}
                  onChange={(event) =>
                    update({ axis: event.target.value as DraftForm["axis"] })
                  }
                >
                  {AXES.map((axis) => (
                    <option key={axis.slug} value={axis.slug}>
                      {`${String(axis.order).padStart(2, "0")} ${axis.name}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className={LABEL}>
                발행 포맷 (선택)
                <select
                  className={`mt-1 ${INPUT}`}
                  value={form.format}
                  onChange={(event) =>
                    update({ format: event.target.value as DraftForm["format"] })
                  }
                >
                  <option value="">지정하지 않음</option>
                  {FORMATS.map((format) => (
                    <option key={format.slug} value={format.slug}>
                      {format.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={LABEL}>
              요약
              <textarea
                className={`mt-1 ${INPUT} min-h-20`}
                value={form.summary}
                onChange={(event) => update({ summary: event.target.value })}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={LABEL}>
                발행일 (KST +0900)
                <input
                  className={`mt-1 ${INPUT} font-mono`}
                  value={form.publishedAt}
                  onChange={(event) =>
                    update({ publishedAt: event.target.value })
                  }
                  placeholder="2026-08-13T09:00:00+0900"
                />
              </label>

              <label className={LABEL}>
                수정일 (선택)
                <input
                  className={`mt-1 ${INPUT} font-mono`}
                  value={form.updatedAt}
                  onChange={(event) =>
                    update({ updatedAt: event.target.value })
                  }
                  placeholder="비워 두면 넣지 않습니다"
                />
              </label>
            </div>

            <label className={LABEL}>
              태그 (콤마 구분)
              <input
                className={`mt-1 ${INPUT}`}
                value={form.tags}
                onChange={(event) => update({ tags: event.target.value })}
                placeholder="LLM, 추론"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={form.draft}
                onChange={(event) => update({ draft: event.target.checked })}
              />
              초안 (draft — 프로덕션 빌드에서 공개되지 않습니다)
            </label>

            {/* 지면당 머리기사는 하나다 — 새로 붙이면 이전 머리기사에서 떼어 내야 한다. */}
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={form.lead}
                onChange={(event) => update({ lead: event.target.checked })}
              />
              머리기사 (lead — 1면 맨 위에 크게 실립니다)
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-md border border-border p-5">
            <legend className={LEGEND}>출처</legend>
            <p className="text-xs text-muted">
              외부 원문을 요약·인용했다면 원문 URL 표기가 필수입니다.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={LABEL}>
                원문 URL
                <input
                  className={`mt-1 ${INPUT}`}
                  value={form.sourceUrl}
                  onChange={(event) =>
                    update({ sourceUrl: event.target.value })
                  }
                  placeholder="https://huggingface.co/blog/..."
                />
              </label>

              <label className={LABEL}>
                원문 제목
                <input
                  className={`mt-1 ${INPUT}`}
                  value={form.sourceTitle}
                  onChange={(event) =>
                    update({ sourceTitle: event.target.value })
                  }
                />
              </label>

              <label className={LABEL}>
                원문 저자
                <input
                  className={`mt-1 ${INPUT}`}
                  value={form.sourceAuthor}
                  onChange={(event) =>
                    update({ sourceAuthor: event.target.value })
                  }
                />
              </label>

              <label className={LABEL}>
                라이선스
                <input
                  className={`mt-1 ${INPUT}`}
                  value={form.sourceLicense}
                  onChange={(event) =>
                    update({ sourceLicense: event.target.value })
                  }
                  placeholder="CC BY 4.0"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={LABEL}>
                원문 발행일 (KST +0900, 선택)
                <input
                  className={`mt-1 ${INPUT} font-mono`}
                  value={form.sourcePublishedAt}
                  onChange={(event) =>
                    update({ sourcePublishedAt: event.target.value })
                  }
                  placeholder="2026-08-01T12:00:00+0900"
                />
              </label>

              {/* 「추린 비율」의 분모다 — 비워 두면 그 글에는 비율을 그리지 않는다. */}
              <label className={LABEL}>
                원문 단어 수 (선택)
                <input
                  className={`mt-1 ${INPUT} font-mono`}
                  value={form.sourceWords}
                  inputMode="numeric"
                  onChange={(event) =>
                    update({ sourceWords: event.target.value })
                  }
                  placeholder="3240"
                />
              </label>
            </div>
          </fieldset>

          {/* paper 는 papers 전용이다 — 다른 카테고리에 있으면 스키마가 거부한다. */}
          {form.category === "papers" ? (
            <fieldset className="space-y-3 rounded-md border border-border p-5">
              <legend className={LEGEND}>논문</legend>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={LABEL}>
                  arXiv ID
                  <input
                    className={`mt-1 ${INPUT} font-mono`}
                    value={form.paperArxivId}
                    onChange={(event) =>
                      update({ paperArxivId: event.target.value })
                    }
                    placeholder="2606.11890"
                  />
                </label>

                <label className={LABEL}>
                  저자 (콤마 구분)
                  <input
                    className={`mt-1 ${INPUT}`}
                    value={form.paperAuthors}
                    onChange={(event) =>
                      update({ paperAuthors: event.target.value })
                    }
                    placeholder="S. Bergmann, T. Iwata"
                  />
                </label>
              </div>
            </fieldset>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <label className={LABEL} htmlFor="mdx-body">
                본문 (MDX)
              </label>

              {/* 이미지도 레포에 커밋한다 (ADR-005) — 외부 스토리지가 없어 업로드 = 커밋이다. */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className={SECONDARY_BUTTON}
              >
                {busy === "upload" ? "올리는 중…" : "이미지 삽입"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // 같은 파일을 다시 고를 수 있게 비운다 (change 가 안 뜬다).
                  event.target.value = "";
                  if (file) void upload(file);
                }}
              />
            </div>

            <textarea
              id="mdx-body"
              ref={bodyRef}
              className={`${INPUT} min-h-[28rem] font-mono leading-relaxed`}
              value={form.body}
              onChange={(event) => update({ body: event.target.value })}
              spellCheck={false}
            />
          </div>

          <IssueList issues={issues} />
        </section>

        <section
          aria-label="프리뷰"
          className={pane === "preview" ? "" : "hidden lg:block"}
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-sm font-medium text-heading">프리뷰</h2>
            <span className="text-xs text-muted">
              {compiling ? "컴파일 중…" : "공개 글과 같은 렌더 경로"}
            </span>
          </div>

          <div className="mt-4">
            {isEmpty ? (
              <p className="text-sm text-muted">
                본문을 입력하면 여기에 프리뷰가 나옵니다.
              </p>
            ) : preview.error ? (
              <div
                role="alert"
                className="border-l-[3px] border-l-danger bg-surface py-3 pl-4"
              >
                <p className="text-sm text-body">
                  MDX 를 컴파일하지 못했습니다.
                </p>
                <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-muted">
                  {preview.error}
                </pre>
              </div>
            ) : preview.content ? (
              // 공개 글 상세와 같은 타이포 컨테이너 — 다르게 보이면 프리뷰의 의미가 없다.
              <MdxBody>{preview.content}</MdxBody>
            ) : (
              <p className="text-sm text-muted">컴파일 중…</p>
            )}
          </div>
        </section>
      </div>

      {/* 덮어쓸 대상. 커밋할 때마다 바뀌므로 저장 응답으로 갱신된 값을 보여준다. */}
      {saved ? (
        <p className="font-mono text-xs text-faint">
          sha {saved.sha.slice(0, 7)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 실패 응답을 사람이 읽을 문장으로. 원인을 그대로 노출한다 (ARCHITECTURE — 조용히 삼키지 마라).
 * 본문 없는 404 는 proxy 나 라우트가 세션을 거절했다는 뜻이다.
 */
async function failureMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    issues?: { field: string; message: string }[];
  } | null;

  if (!body?.message) {
    return response.status === 404
      ? "세션이 만료되었거나 권한이 없습니다. 다시 로그인하세요."
      : `요청이 실패했습니다 (HTTP ${response.status}).`;
  }

  const issues = (body.issues ?? [])
    .map((issue) => `\n· ${issue.field} — ${issue.message}`)
    .join("");

  return `${body.message}${issues}`;
}

/** fetch 자체가 실패한 경우 (네트워크 끊김 등). */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function IssueList({
  issues,
}: {
  issues: { field: string; message: string }[];
}) {
  if (issues.length === 0) {
    return (
      <p className="text-sm text-success">frontmatter 검증을 통과했습니다.</p>
    );
  }

  return (
    <div
      role="alert"
      className="border-l-[3px] border-l-warning bg-surface py-3 pl-4"
    >
      <p className="text-sm text-body">저장하기 전에 고쳐야 할 항목</p>
      <ul className="mt-2 space-y-1">
        {issues.map((issue) => (
          <li key={`${issue.field}-${issue.message}`} className="text-sm text-muted">
            <span className="font-mono text-xs text-heading">
              {issue.field}
            </span>{" "}
            — {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
