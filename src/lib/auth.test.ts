import { describe, expect, it } from "vitest";

// auth.ts 는 `@/lib/auth` 로 다시 export 하지만, 여기서 직접 import 하면 next-auth 가 딸려 와
// vitest(jsdom) 가 `next/server` 를 해석하지 못한다. 판정 로직을 떼어 둔 이유다.
import { isAllowedLogin } from "./auth-allowlist";

/**
 * 화이트리스트 판정만 검증한다 — NextAuth 인스턴스를 띄우지 않는다.
 * 이 함수가 새면 /admin 전체가 열리므로 거부 쪽 경계를 특히 촘촘히 본다.
 */
describe("isAllowedLogin", () => {
  it("목록에 있는 계정은 허용한다", () => {
    expect(isAllowedLogin("brachio9", "brachio9,someone")).toBe(true);
  });

  it("목록에 없는 계정은 거부한다", () => {
    expect(isAllowedLogin("stranger", "brachio9,someone")).toBe(false);
  });

  it("대소문자가 달라도 같은 계정으로 본다", () => {
    // GitHub login 은 대소문자를 구분하지 않는다 — 목록·입력 어느 쪽이 달라도 통과해야 한다.
    expect(isAllowedLogin("Brachio9", "brachio9")).toBe(true);
    expect(isAllowedLogin("brachio9", "BRACHIO9")).toBe(true);
  });

  it("공백이 섞인 목록도 파싱한다", () => {
    expect(isAllowedLogin("a", " a , b ")).toBe(true);
    expect(isAllowedLogin("b", " a , b ")).toBe(true);
    expect(isAllowedLogin(" a ", "a,b")).toBe(true);
  });

  it.each([undefined, "", "   ", ",", " , "])(
    "빈 목록(%p)은 전부 거부한다",
    (rawList) => {
      // 빈 목록을 "전부 허용" 으로 해석하면 관리자 화면이 통째로 열린다.
      expect(isAllowedLogin("brachio9", rawList)).toBe(false);
    },
  );

  it.each([undefined, null, "", "   "])(
    "login 이 없으면(%p) 거부한다",
    (login) => {
      expect(isAllowedLogin(login, "brachio9")).toBe(false);
    },
  );

  it("목록 항목의 일부만 일치하면 거부한다", () => {
    expect(isAllowedLogin("brachio", "brachio9")).toBe(false);
    expect(isAllowedLogin("brachio99", "brachio9")).toBe(false);
  });
});
