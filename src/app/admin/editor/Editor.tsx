"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { MdxBody } from "@/components/mdx/MdxBody";
import { CATEGORIES } from "@/lib/categories";

import { previewMdx } from "./actions";
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
  "w-full rounded border border-border bg-surface px-3 py-2 text-sm text-body focus-visible:outline-2 focus-visible:outline-accent";
const LABEL = "block text-sm text-muted";
const LEGEND = "text-sm font-medium text-heading";
const TAB =
  "rounded border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent";

type Pane = "write" | "preview";

interface EditorProps {
  initial: DraftForm;
  /** 기존 글을 열었을 때의 레포 경로. 신규 작성이면 null. */
  filePath: string | null;
  /** 기존 글의 blob sha — step 4 의 수정 커밋이 쓴다. */
  sha: string | null;
}

export function Editor({ initial, filePath, sha }: EditorProps) {
  const [form, setForm] = useState<DraftForm>(initial);
  // 사용자가 slug 를 직접 건드린 뒤에는 제목을 고쳐도 덮어쓰지 않는다.
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const [pane, setPane] = useState<Pane>("write");

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
          <span className="text-xs text-muted">저장은 다음 단계에서</span>
          <button
            type="button"
            disabled
            title="발행(커밋)은 아직 붙지 않았습니다"
            className="cursor-not-allowed rounded bg-heading px-4 py-2 text-sm font-medium text-bg opacity-40"
          >
            저장
          </button>
        </div>
      </header>

      {/* 좁은 화면에서는 두 칸을 나란히 놓을 수 없다 — 탭으로 바꿔 보여 준다. */}
      <div className="flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setPane("write")}
          aria-pressed={pane === "write"}
          className={`${TAB} ${pane === "write" ? "border-accent text-accent" : "border-border text-muted"}`}
        >
          작성
        </button>
        <button
          type="button"
          onClick={() => setPane("preview")}
          aria-pressed={pane === "preview"}
          className={`${TAB} ${pane === "preview" ? "border-accent text-accent" : "border-border text-muted"}`}
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

            <label className={LABEL}>
              커버 이미지 경로 (선택)
              <input
                className={`mt-1 ${INPUT} font-mono`}
                value={form.cover}
                onChange={(event) => update({ cover: event.target.value })}
                placeholder="/sample/cover.svg"
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
            <label className={LABEL} htmlFor="mdx-body">
              본문 (MDX)
            </label>
            <textarea
              id="mdx-body"
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

      {/* step 4 의 커밋이 쓸 값. 지금은 화면에만 둔다. */}
      {sha ? (
        <p className="font-mono text-xs text-faint">sha {sha.slice(0, 7)}</p>
      ) : null}
    </div>
  );
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
