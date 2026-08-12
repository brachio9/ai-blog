import { afterEach, describe, expect, it, vi } from "vitest";

import { getGiscusConfig } from "./giscus";

const FILLED = {
  NEXT_PUBLIC_GISCUS_REPO: "brachio9/ai-blog",
  NEXT_PUBLIC_GISCUS_REPO_ID: "R_kgDOTestRepo",
  NEXT_PUBLIC_GISCUS_CATEGORY: "Comments",
  NEXT_PUBLIC_GISCUS_CATEGORY_ID: "DIC_kwDOTestCategory",
} as const;

const NAMES = Object.keys(FILLED) as (keyof typeof FILLED)[];

function stubEnv(overrides: Partial<Record<keyof typeof FILLED, string>> = {}) {
  for (const name of NAMES) {
    vi.stubEnv(name, overrides[name] ?? FILLED[name]);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getGiscusConfig", () => {
  it("네 값이 모두 있으면 설정을 돌려준다", () => {
    stubEnv();

    expect(getGiscusConfig()).toEqual({
      repo: "brachio9/ai-blog",
      repoId: "R_kgDOTestRepo",
      category: "Comments",
      categoryId: "DIC_kwDOTestCategory",
    });
  });

  it.each(NAMES)("%s 가 없으면 null 이다", (missing) => {
    stubEnv();
    vi.stubEnv(missing, undefined);

    expect(getGiscusConfig()).toBeNull();
  });

  it.each(NAMES)("%s 가 빈 문자열이면 없는 것으로 본다", (blank) => {
    // .env.example 은 이 변수들을 빈 값으로 실어 보낸다 — 채우기 전에도 빌드가 돌아야 한다.
    stubEnv({ [blank]: "" });

    expect(getGiscusConfig()).toBeNull();
  });

  it("공백만 든 값도 없는 것으로 본다", () => {
    stubEnv({ NEXT_PUBLIC_GISCUS_CATEGORY_ID: "   " });

    expect(getGiscusConfig()).toBeNull();
  });
});
