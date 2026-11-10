import type { Metadata } from "next";
import matter from "gray-matter";

import { MDX_COMPONENTS } from "@/components/mdx";
import { requireAdmin } from "@/lib/auth";
/**
 * 수식 스타일(katex CSS)은 src/lib/mdx.ts 가 들고 있다. 프리뷰 Server Action 도 그 모듈을 쓰지만
 * "use server" 모듈의 CSS 는 이 라우트의 스타일시트에 실리지 않는다 — 실측 결과 프리뷰의 수식이
 * 조판되지 않고 본문 폰트로 남았다. 이 페이지의 모듈 그래프에 넣어 스타일을 딸려 오게 한다.
 */
import "@/lib/mdx";
import { isPublishConfigured, readFile } from "@/services/github";

import { Editor } from "./Editor";
import { newDraft, nowKstIso, toDraftForm, type DraftForm } from "./draft";

export const metadata: Metadata = {
  title: "에디터",
  // 관리자 화면은 검색엔진에 실리면 안 된다.
  robots: { index: false, follow: false },
};

/**
 * ⚠ 지우지 마라 — "쓰지 않는 import" 가 아니다.
 *
 * 프리뷰는 Server Action 이 컴파일한 트리를 **이 라우트에서** 렌더한다. 그 안의 클라이언트
 * 컴포넌트(Chart · Diagram)는 이 라우트의 React Client Manifest 에 등록되어 있어야 살아난다.
 * Server Action 파일에서 import 하는 것만으로는 부족하고, 이 페이지가 MDX_COMPONENTS 를
 * 실제로 참조해야 등록된다 (렌더할 필요는 없다 — 참조만으로 충분함을 실측했다).
 *
 * 빠지면 프로덕션은 "Could not find the module ...Chart.tsx#default in the React Client
 * Manifest", 개발은 에러 없이 프리뷰가 조용히 빈 화면이 된다.
 */
const PREVIEW_COMPONENTS = Object.keys(MDX_COMPONENTS).length;

interface LoadedPost {
  form: DraftForm;
  /** 수정 커밋에 필요하다 (step 4). 신규 작성이면 null. */
  sha: string;
  path: string;
}

type LoadResult =
  | { post: LoadedPost }
  | { error: string }
  // ?path= 가 없는 신규 작성
  | null;

async function loadPost(path: string): Promise<Exclude<LoadResult, null>> {
  if (!isPublishConfigured()) {
    return {
      error:
        "GitHub 연결이 설정되지 않아 기존 글을 불러올 수 없습니다. GITHUB_CONTENT_REPO · GITHUB_CONTENT_BRANCH · GITHUB_CONTENT_TOKEN 을 채운 뒤 다시 시도하세요.",
    };
  }

  try {
    const file = await readFile(path);
    if (!file) {
      return { error: `레포에 ${path} 가 없습니다.` };
    }

    // 깨진 frontmatter 도 폼에 실어 준다 — 관리자는 그걸 고치러 들어온다.
    const { data, content } = matter(file.content);
    return {
      post: {
        form: toDraftForm(data, content, path),
        sha: file.sha,
        path,
      },
    };
  } catch (error) {
    // ARCHITECTURE: 실패 원인을 조용히 삼키지 마라 (GitHubApiError 에 토큰은 들어 있지 않다).
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * MDX 에디터 — `/admin/editor?path=content/{category}/{YYYY-MM-DD}-{slug}.mdx`.
 * 파라미터가 없으면 신규 작성이다 (대시보드가 정한 규약).
 *
 * searchParams 를 읽으므로 이 페이지는 동적이다. 관리자 화면이라 정상이며,
 * 공개 글 상세의 정적 생성과는 무관하다.
 */
export default async function EditorPage(props: PageProps<"/admin/editor">) {
  // CLAUDE.md CRITICAL — proxy 가 이미 막지만 페이지에서 화이트리스트를 다시 확인한다.
  await requireAdmin();

  const raw = (await props.searchParams).path;
  const path = typeof raw === "string" && raw ? raw : undefined;
  const loaded: LoadResult = path ? await loadPost(path) : null;

  // 서버에서 만든 현재 시각을 초기값으로 내려보낸다 (클라이언트에서 만들면 하이드레이션이 어긋난다).
  const initial =
    loaded && "post" in loaded ? loaded.post.form : newDraft(nowKstIso());

  return (
    <div
      className="mx-auto max-w-6xl px-5 py-8 md:px-8"
      data-preview-components={PREVIEW_COMPONENTS}
    >
      {loaded && "error" in loaded ? (
        <div
          role="alert"
          className="mb-6 border-l-[3px] border-l-danger bg-surface py-3 pl-4"
        >
          <p className="text-sm text-body">글을 불러오지 못했습니다.</p>
          <p className="mt-1 text-sm break-words text-muted">{loaded.error}</p>
        </div>
      ) : null}

      <Editor
        initial={initial}
        filePath={loaded && "post" in loaded ? loaded.post.path : null}
        sha={loaded && "post" in loaded ? loaded.post.sha : null}
      />
    </div>
  );
}
