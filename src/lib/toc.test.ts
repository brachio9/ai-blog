import GithubSlugger from "github-slugger";
import { describe, expect, it } from "vitest";

import { extractHeadings } from "./toc";

describe("extractHeadings", () => {
  it("##·### 를 깊이로 구분한다", () => {
    const headings = extractHeadings(
      ["## 세우려는 식", "본문", "### 예산-손실 곡선"].join("\n"),
    );

    expect(headings).toEqual([
      { id: "세우려는-식", text: "세우려는 식", depth: 2 },
      { id: "예산-손실-곡선", text: "예산-손실 곡선", depth: 3 },
    ]);
  });

  it("목차 깊이(2·3) 밖의 제목은 싣지 않는다", () => {
    const headings = extractHeadings(
      ["# 글 제목", "## 절", "#### 아주 깊은 절"].join("\n"),
    );

    expect(headings.map((heading) => heading.depth)).toEqual([2]);
  });

  it("코드블록 안의 # 주석을 제목으로 잡지 않는다", () => {
    const mdx = [
      "## 설치와 첫 배포",
      "",
      "```bash",
      "# 설치 — CLI 는 SDK 에 함께 들어 있다",
      "pip install 'huggingface-hub[cli]>=0.42'",
      "",
      "## 이것도 제목이 아니다",
      "```",
      "",
      "## SDK 에서 다루기",
      "",
      "~~~python",
      "## 물결 펜스 안도 마찬가지",
      "~~~",
    ].join("\n");

    expect(extractHeadings(mdx).map((heading) => heading.text)).toEqual([
      "설치와 첫 배포",
      "SDK 에서 다루기",
    ]);
  });

  it("한글 제목의 id 가 github-slugger 결과와 정확히 일치한다", () => {
    // rehype-slug 도 github-slugger 를 쓴다. 여기가 어긋나면 목차 링크가 전부 죽는다.
    const titles = ["길이가 아니라 감쇠", "SDK 에서 다루기", "`hf` 명령어 정리"];
    const slugger = new GithubSlugger();

    const headings = extractHeadings(
      titles.map((title) => `## ${title}`).join("\n\n"),
    );

    expect(headings.map((heading) => heading.id)).toEqual([
      slugger.slug("길이가 아니라 감쇠"),
      slugger.slug("SDK 에서 다루기"),
      // 인라인 코드는 렌더되면 텍스트만 남는다 — 백틱을 남긴 채 slug 를 뜨면 어긋난다.
      slugger.slug("hf 명령어 정리"),
    ]);
  });

  it("중복 제목에 번호가 붙는다", () => {
    const headings = extractHeadings(
      ["## 메모", "### 메모", "## 메모"].join("\n"),
    );

    expect(headings.map((heading) => heading.id)).toEqual([
      "메모",
      "메모-1",
      "메모-2",
    ]);
  });

  it("목차에 싣지 않는 깊이도 번호 매김에 반영한다", () => {
    // rehype-slug 는 h1~h6 전부에 id 를 붙인다. h4 를 세지 않으면 뒤따르는 id 가 밀린다.
    const headings = extractHeadings(["#### 메모", "## 메모"].join("\n"));

    expect(headings).toEqual([{ id: "메모-1", text: "메모", depth: 2 }]);
  });

  it("제목이 없으면 빈 배열이다", () => {
    expect(extractHeadings("본문만 있는 글이다.\n\n다음 문단.")).toEqual([]);
  });
});
