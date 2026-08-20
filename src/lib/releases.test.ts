import { describe, expect, it } from "vitest";

import {
  COLLAPSE_MIN,
  isRoutineRelease,
  parseReleaseTag,
  partitionReleases,
  repoKeyOf,
  tagOf,
} from "./releases";
import type { Post, PostSelection } from "@/types/content";

/** 2026-08-18 하루치의 실제 릴리즈 12편. 이 표가 이 모듈의 근거다. */
const REAL_DAY: { repo: string; tag: string; routine: boolean }[] = [
  { repo: "anthropics/claude-code", tag: "v2.1.232", routine: true },
  { repo: "anthropics/claude-code", tag: "v2.1.233", routine: true },
  { repo: "cline/cline", tag: "desktop-v0.0.13", routine: true },
  { repo: "aaif-goose/goose", tag: "v1.46.0", routine: false },
  { repo: "livekit/agents", tag: "livekit-agents%401.6.9", routine: true },
  { repo: "ggml-org/llama.cpp", tag: "b10451", routine: true },
  { repo: "ollama/ollama", tag: "v0.32.12", routine: true },
  { repo: "pipecat-ai/pipecat", tag: "v1.7.0", routine: false },
  { repo: "k2-fsa/sherpa-onnx", tag: "v1.13.5", routine: true },
  { repo: "huggingface/transformers", tag: "v5.15.0", routine: false },
  { repo: "unslothai/unsloth", tag: "v0.1.800-beta", routine: true },
  { repo: "vllm-project/vllm", tag: "v0.27.0", routine: false },
];

const SELECTION: PostSelection = {
  axisBy: "source",
  axisConfidence: "high",
  band: "mid",
  crossSources: 1,
};

function release(
  repo: string,
  tag: string,
  overrides: Partial<PostSelection> = {},
): Post {
  return {
    frontmatter: {
      title: `${repo} ${tag}`,
      category: "releases",
      axis: "serving",
      summary: "요약",
      publishedAt: "2026-08-18T09:00:00+0900",
      tags: [],
      draft: false,
      source: {
        url: `https://github.com/${repo}/releases/tag/${tag}`,
        title: tag,
      },
      selection: { ...SELECTION, ...overrides },
    },
    slug: `${repo.replace("/", "-")}-${tag}`.toLowerCase(),
    category: "releases",
    body: "",
    filePath: "",
    readingMinutes: 2,
    ratio: null,
  };
}

function paper(slug: string): Post {
  return {
    frontmatter: {
      title: "논문 하나",
      category: "papers",
      axis: "agent",
      summary: "요약",
      publishedAt: "2026-08-18T09:00:00+0900",
      tags: [],
      draft: false,
      source: { url: "https://arxiv.org/abs/2608.13706", title: "A paper" },
      paper: { arxivId: "2608.13706", authors: ["A"] },
      selection: SELECTION,
    },
    slug,
    category: "papers",
    body: "",
    filePath: "",
    readingMinutes: 4,
    ratio: null,
  };
}

describe("parseReleaseTag", () => {
  it("마지막 x.y.z 를 뽑는다 — 이름에 숫자가 섞여도 버전을 잡는다", () => {
    expect(parseReleaseTag("v0.27.0")).toMatchObject({
      major: 0,
      minor: 27,
      patch: 0,
    });
    expect(parseReleaseTag("desktop-v0.0.13")).toMatchObject({ patch: 13 });
    // `livekit-agents@1.6.9` — 스코프 이름에 숫자가 없지만 규칙은 마지막을 본다.
    expect(parseReleaseTag("livekit-agents%401.6.9")).toMatchObject({
      major: 1,
      minor: 6,
      patch: 9,
    });
    expect(parseReleaseTag("v5.15.0")).toMatchObject({ minor: 15, patch: 0 });
  });

  it("읽지 못하면 null 이다 — 빌드 번호는 버전이 아니다", () => {
    expect(parseReleaseTag("b10451")).toBeNull();
    expect(parseReleaseTag("")).toBeNull();
    expect(parseReleaseTag("nightly")).toBeNull();
  });

  it("프리릴리즈 접미사를 읽는다 — GitHub 의 플래그보다 정확하다", () => {
    // 발행분 12/12 가 API 상 `prerelease: false` 였는데 그중에 이 태그가 있었다.
    expect(parseReleaseTag("v0.1.800-beta")?.prerelease).toBe(true);
    expect(parseReleaseTag("v1.2.0-rc1")?.prerelease).toBe(true);
    expect(parseReleaseTag("v1.2.0")?.prerelease).toBe(false);
  });
});

describe("repoKeyOf · tagOf", () => {
  it("GitHub 은 owner/repo 로 묶는다 — 같은 날 같은 저장소가 합쳐진다", () => {
    const a = "https://github.com/anthropics/claude-code/releases/tag/v2.1.232";
    const b = "https://github.com/anthropics/claude-code/releases/tag/v2.1.233";

    expect(repoKeyOf(a)).toBe("anthropics/claude-code");
    expect(repoKeyOf(a)).toBe(repoKeyOf(b));
    expect(tagOf(a)).toBe("v2.1.232");
  });

  it("GitHub 이 아니면 호스트로 떨어진다", () => {
    expect(repoKeyOf("https://discuss.pytorch.kr/t/abc")).toBe(
      "discuss.pytorch.kr",
    );
  });

  it("잘못된 주소에도 죽지 않는다", () => {
    expect(() => repoKeyOf("주소가 아니다")).not.toThrow();
    expect(tagOf("주소가 아니다")).toBe("");
  });
});

describe("isRoutineRelease — 판정표", () => {
  it("2026-08-18 하루치 12편을 실제와 같이 가른다", () => {
    for (const { repo, tag, routine } of REAL_DAY) {
      expect(isRoutineRelease(release(repo, tag)), `${repo} ${tag}`).toBe(
        routine,
      );
    }
  });

  it("선별 등급은 보지 않는다 — 열에 여섯이 가진 값은 아무것도 가르지 못한다", () => {
    // 처음에는 「등급이 high 면 승격」을 맨 위에 뒀는데, 실제 콘텐츠에 대 보니 릴리즈 12편 중
    // 10편이 high 라 **아무것도 접히지 않았다.** 이 단언이 그 되돌림을 지킨다.
    expect(
      isRoutineRelease(release("anthropics/claude-code", "v2.1.233", { band: "high" })),
    ).toBe(true);
  });

  it("여러 곳에서 같이 나왔으면 승격한다 — 10% 뿐이라 드물다는 것이 값어치다", () => {
    expect(
      isRoutineRelease(release("k2-fsa/sherpa-onnx", "v1.13.5", { crossSources: 3 })),
    ).toBe(false);
  });
});

describe("partitionReleases", () => {
  it("하루치를 승격 4 · 저장소 7곳 · 정기 8건으로 가른다", () => {
    const posts = [
      paper("a-paper"),
      ...REAL_DAY.map(({ repo, tag }) => release(repo, tag)),
    ];

    const { promoted, routine } = partitionReleases(posts);

    // 승격 릴리즈 4편 + 논문 1편
    expect(promoted).toHaveLength(5);
    expect(routine).toHaveLength(7);
    expect(routine.reduce((sum, group) => sum + group.items.length, 0)).toBe(8);
  });

  it("같은 저장소의 같은 날 두 판을 한 줄로 합친다", () => {
    const posts = REAL_DAY.map(({ repo, tag }) => release(repo, tag));

    const group = partitionReleases(posts).routine.find(
      (found) => found.repoKey === "anthropics/claude-code",
    );

    expect(group?.items.map((item) => item.tag)).toEqual([
      "v2.1.232",
      "v2.1.233",
    ]);
  });

  it(`정기가 ${COLLAPSE_MIN}건 미만이면 접지 않고 순서 그대로 돌려준다`, () => {
    // 2건짜리 아코디언은 2행보다 나쁘다.
    const posts = [
      release("ollama/ollama", "v0.32.12"),
      paper("a-paper"),
      release("cline/cline", "desktop-v0.0.13"),
    ];

    const { promoted, routine } = partitionReleases(posts);

    expect(routine).toEqual([]);
    expect(promoted).toEqual(posts);
  });

  it("릴리즈가 아닌 글은 절대 접히지 않는다", () => {
    const posts = [paper("a"), paper("b"), paper("c"), paper("d")];

    expect(partitionReleases(posts)).toEqual({ promoted: posts, routine: [] });
  });
});
