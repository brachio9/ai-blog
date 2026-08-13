import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, resolveUploadTarget } from "./upload";

/** KST 기준 2026-08-13 09:30:12 (CLAUDE.md CRITICAL — 모든 시각은 KST). */
const KST_NOW = "2026-08-13T09:30:12+0900";

function target(overrides: Partial<Parameters<typeof resolveUploadTarget>[0]> = {}) {
  return resolveUploadTarget({
    name: "diagram.png",
    size: 1024,
    kstNow: KST_NOW,
    ...overrides,
  });
}

describe("resolveUploadTarget", () => {
  it("public/uploads/{YYYY}/{MM}/ 아래로만 커밋한다 (ADR-005)", () => {
    const result = target();

    expect(result).toEqual({
      ok: true,
      value: {
        path: "public/uploads/2026/08/13-093012-diagram.png",
        url: "/uploads/2026/08/13-093012-diagram.png",
      },
    });
  });

  it("허용 확장자를 모두 받는다", () => {
    for (const ext of ["png", "jpg", "jpeg", "webp", "gif", "svg"]) {
      const result = target({ name: `photo.${ext}` });
      expect(result.ok && result.value.url.endsWith(`.${ext}`)).toBe(true);
    }
  });

  it("확장자는 대소문자를 가리지 않고 소문자로 저장한다", () => {
    const result = target({ name: "PHOTO.PNG" });

    expect(result.ok && result.value.url).toBe(
      "/uploads/2026/08/13-093012-photo.png",
    );
  });

  it.each(["evil.svgz", "payload.html", "script.js", "archive.zip", "noext"])(
    "허용하지 않는 확장자는 거부한다: %s",
    (name) => {
      const result = target({ name });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.message).toContain("확장자");
    },
  );

  // 파일명은 서버가 정한다 — 업로드된 이름을 그대로 경로에 넣지 않는다.
  it.each([
    ["../evil.png", "/uploads/2026/08/13-093012-evil.png"],
    ["../../.github/workflows/ci.png", "/uploads/2026/08/13-093012-github-workflows-ci.png"],
    ["/etc/passwd.png", "/uploads/2026/08/13-093012-etc-passwd.png"],
    ["C:\\temp\\shot.PNG", "/uploads/2026/08/13-093012-c-temp-shot.png"],
    ["스크린샷 2026.png", "/uploads/2026/08/13-093012-2026.png"],
    ["한글.png", "/uploads/2026/08/13-093012-image.png"],
    ["  .png", "/uploads/2026/08/13-093012-image.png"],
  ])("파일명 %s 를 안전한 이름으로 정규화한다", (name, expected) => {
    const result = target({ name });

    expect(result.ok && result.value.url).toBe(expected);
  });

  it("정규화한 경로에는 순회 조각이 남지 않는다", () => {
    const result = target({ name: "../../../etc/passwd.svg" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.path).not.toContain("..");
    expect(result.value.path).toMatch(
      /^public\/uploads\/\d{4}\/\d{2}\/[a-z0-9-]+\.(png|jpg|jpeg|webp|gif|svg)$/,
    );
  });

  it("아주 긴 파일명은 잘라 낸다", () => {
    const result = target({ name: `${"a".repeat(200)}.png` });

    expect(result.ok).toBe(true);
    expect(result.ok && result.value.path.length).toBeLessThan(80);
  });

  it("4MB 를 넘으면 거부한다 (Vercel 요청 본문 한도 앞에서 끊는다)", () => {
    const result = target({ size: MAX_UPLOAD_BYTES + 1 });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("4");
  });

  it("상한과 같은 크기는 통과한다", () => {
    expect(target({ size: MAX_UPLOAD_BYTES }).ok).toBe(true);
  });

  it("빈 파일은 거부한다", () => {
    expect(target({ size: 0 }).ok).toBe(false);
  });

  it("날짜 조각은 KST 시각에서 가져온다", () => {
    const result = resolveUploadTarget({
      name: "a.png",
      size: 10,
      kstNow: "2027-01-09T00:05:07+0900",
    });

    expect(result.ok && result.value.path).toBe(
      "public/uploads/2027/01/09-000507-a.png",
    );
  });
});
