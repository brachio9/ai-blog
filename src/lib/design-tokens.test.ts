import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CAT_CLASS } from "./categories";
import { contrast, inGamut, oklchToHex, parseOklch } from "./color";
import { OG_ACCENT, OG_GROUND } from "./og-colors";

/**
 * 정본(`design/styles.css`)과 앱(`src/app/globals.css`)이 갈라지지 않게 지킨다.
 *
 * **이 파일이 이번 개편의 최대 산출물이다.** 그동안 두 파일의 동기화를 확인한 것은
 * 일회성 인라인 스크립트뿐이었고, 그래서 정본에만 있는 값·앱에만 있는 값이 조용히 쌓였다
 * (`.cat-news` 가 정본에서 여전히 朱土였던 것이 그 예다).
 *
 * 잡는 결함은 넷이다:
 *   ① 정본만 고치고 앱을 안 옮김 · ② Tailwind 가 안 쓰이는 변수를 지워 버림
 *   ③ 컴포넌트가 토큰을 우회해 색·글꼴을 직접 적음 · ④ CSS 클래스 누락 (컴파일러가 못 잡는다)
 */

const ROOT = join(__dirname, "..", "..");
const CANON = readFileSync(join(ROOT, "design", "styles.css"), "utf8");
const APP = readFileSync(join(ROOT, "src", "app", "globals.css"), "utf8");

/** 셀렉터 뒤 `{ … }` 를 중괄호 균형으로 잘라 낸다. 이 파일들에 중첩 규칙은 없다. */
function block(css: string, selector: string): string {
  const start = css.indexOf(selector + " {");
  if (start < 0) throw new Error(`블록을 못 찾았다: ${selector}`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}" && (depth -= 1) === 0) return css.slice(start, i);
  }
  throw new Error(`블록이 안 닫혔다: ${selector}`);
}

function declarations(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    found.set(name, value.trim().replace(/\s+/g, " "));
  }
  return found;
}

/** 글꼴만은 값이 다를 수밖에 없다 — 앱은 next/font 가 만든 변수를 경유한다. */
const FONT_STACKS = new Set([
  "--font-heading",
  "--font-body",
  "--font-ui",
  "--font-mono",
]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

/** 주석은 규칙의 대상이 아니다 — 왜 그 값인지 설명하려면 값을 적어야 할 때가 있다. */
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const SOURCES = sourceFiles(join(ROOT, "src")).map((path) => ({
  path: path.slice(ROOT.length + 1),
  code: stripComments(readFileSync(path, "utf8")),
}));

describe("정본 ↔ 앱 동기화", () => {
  it("① 정본 :root 의 모든 토큰이 앱에 같은 값으로 있다", () => {
    const canon = declarations(block(CANON, ":root"));
    const app = new Map([
      ...declarations(block(APP, ":root")),
      ...declarations(block(APP, "@theme static")),
    ]);

    const missing: string[] = [];
    const drifted: string[] = [];
    for (const [name, value] of canon) {
      if (!app.has(name)) missing.push(name);
      else if (!FONT_STACKS.has(name) && app.get(name) !== value) {
        drifted.push(`${name}: 정본 ${value} ≠ 앱 ${app.get(name)}`);
      }
    }

    expect({ missing, drifted }).toEqual({ missing: [], drifted: [] });
  });

  it("② 정본 .ground-light 와 앱 .light 가 같은 값이다", () => {
    // 밤은 ①이 이미 본다 (:root ↔ :root). 낮만 따로 볼 수 있으면 두 지면이 다 덮인다.
    const canon = declarations(block(CANON, ".ground-light"));
    const app = declarations(block(APP, ".light"));

    const drifted: string[] = [];
    for (const [name, value] of canon) {
      // 정본은 스스로 지면을 칠하지만(background/color) 앱은 body 규칙이 한다.
      if (name === "background" || name === "color") continue;
      if (app.get(name) !== value) {
        drifted.push(`${name}: 정본 ${value} ≠ 앱 ${app.get(name) ?? "없음"}`);
      }
    }

    expect(drifted).toEqual([]);
  });

  it("③ @theme inline 의 모든 이름이 실제로 유틸리티로 쓰인다", () => {
    // 안 쓰이는 이름은 Tailwind 가 빌드에서 지운다. `--color-chart-2..5` 가 그렇게 죽었다.
    // 지면마다 값이 갈리지 않는 것은 `@theme static` 으로 내리고, 갈리는데 안 쓰이면 지워라.
    const names = [...declarations(block(APP, "@theme inline")).keys()];
    const utilities = SOURCES.map((file) => file.code).join("\n");

    const dead = names.filter((name) => {
      const suffix = name.replace(/^--(color|font)-/, "");
      return !new RegExp(`[\\w-]+-${suffix}\\b`).test(utilities);
    });

    expect(dead).toEqual([]);
  });

  it("④ 컴포넌트에 hex 리터럴이 없다 — 색은 토큰을 경유한다", () => {
    // 남은 예외는 없다. 소셜 카드조차 src/lib/og-colors.ts 에서 OKLCH 로부터 굽는다.
    const offenders = SOURCES.filter((file) =>
      /#[0-9a-fA-F]{3,8}\b/.test(file.code),
    ).map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it("⑤ 컴포넌트에 oklch() 리터럴이 없다", () => {
    // 예외는 색 변환기 자신뿐이고, 그것도 정규식 안에서만 그 낱말을 쓴다.
    const offenders = SOURCES.filter(
      (file) => /oklch\(/.test(file.code) && !file.path.endsWith("color.ts"),
    ).map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it("⑥ 컴포넌트가 글꼴 이름을 직접 적지 않는다", () => {
    const offenders = SOURCES.filter((file) =>
      /"(IBM Plex|Noto Serif|Pretendard|Apple SD Gothic)/.test(file.code),
    ).map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it("⑥-2 컴포넌트가 참조하는 var(--…) 가 전부 CSS 에 정의돼 있다", () => {
    // **실제로 겪은 결함이다.** 안료 ramp 이름을 바꾸면서 `text-[var(--color-accent-700)]`
    // 여섯 곳이 죽은 참조로 남았다. TS 도 Tailwind 도 잡지 못하고 화면에서만 색이 사라진다.
    const defined = new Set(
      [...APP.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name),
    );
    // next/font 가 <html> 에 심는 변수는 CSS 에 선언이 없다.
    const external = /^--font-plex|^--font-noto|^--shiki|^--cat$|^--tw-/;

    const dangling: string[] = [];
    for (const file of SOURCES) {
      for (const [, name] of file.code.matchAll(/var\((--[\w-]+)/g)) {
        if (!defined.has(name) && !external.test(name)) {
          dangling.push(`${file.path}: ${name}`);
        }
      }
    }

    expect([...new Set(dangling)]).toEqual([]);
  });

  it("⑦ .page 가 --page-max 를 쓴다 — 죽은 토큰을 만들지 않는다", () => {
    expect(APP).toContain(".page { max-width: var(--page-max);");
    expect(CANON).toContain(".page { max-width: var(--page-max);");
  });

  it("⑧ CAT_CLASS 의 다섯 클래스가 globals.css 에 전부 정의돼 있다", () => {
    // **CSS 누락은 컴파일러가 못 잡는다.** TS 쪽 4곳은 빌드가 잡지만 이쪽은 조용히 무색이 된다.
    const missing = Object.values(CAT_CLASS).filter(
      (className) => !new RegExp(`^\\.${className}\\s*[{ ]`, "m").test(APP),
    );

    expect(missing).toEqual([]);
  });
});

describe("색 — 색역과 대비", () => {
  const ramp = declarations(block(APP, "@theme static"));
  const dark = declarations(block(APP, ":root"));
  const light = declarations(block(APP, ".light"));

  const resolve = (map: Map<string, string>, name: string): string => {
    const value = map.get(name);
    if (!value) throw new Error(`없는 토큰: ${name}`);
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    return ref ? (ramp.get(ref[1]) ?? value) : value;
  };

  it("모든 안료가 sRGB 색역 안이다 — 벗어나면 브라우저가 말없이 잘라 낸다", () => {
    const outside = [...ramp]
      .filter(([name]) => name.startsWith("--color-"))
      .filter(([, value]) => {
        const { l, c, h } = parseOklch(value);
        return !inGamut(l, c, h);
      })
      .map(([name]) => name);

    expect(outside).toEqual([]);
  });

  it("본문·부호가 두 지면 모두에서 AA 4.5:1 을 넘는다", () => {
    const grounds = [
      { name: "밤", tokens: dark, bg: resolve(dark, "--bg") },
      { name: "낮", tokens: light, bg: "oklch(1 0 0)" },
    ];
    // 낮은 :root(밤) 를 물려받는 칸이 없다 — 두 블록이 같은 이름을 전부 다시 정한다.
    const roles = [
      "--body",
      "--muted",
      "--accent",
      "--cat-paper",
      "--cat-release",
      "--cat-news",
      "--cat-community",
      "--cat-note",
    ];

    const failures: string[] = [];
    for (const ground of grounds) {
      for (const role of roles) {
        const ratio = contrast(ground.bg, resolve(ground.tokens, role));
        if (ratio < 4.5) {
          failures.push(`${ground.name} ${role}: ${ratio.toFixed(2)}:1`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("액센트가 지면에서 유일하게 채도가 높다 — 부호가 액센트를 이기면 안 된다", () => {
    const chroma = (map: Map<string, string>, name: string) =>
      parseOklch(resolve(map, name)).c;
    const marks = ["--cat-paper", "--cat-release", "--cat-news"];

    for (const tokens of [dark, light]) {
      const accent = chroma(tokens, "--accent");
      for (const mark of marks) {
        expect(chroma(tokens, mark) * 2).toBeLessThan(accent);
      }
    }
  });

  it("소셜 카드 hex 가 정본 안료와 같은 색이다 — satori 는 oklch 를 못 읽는다", () => {
    // 카드는 늘 낮 지면이다. 여기가 갈리면 공유된 카드만 옛 색으로 남는다.
    // CSS 쪽 값에서 다시 구워 og-colors.ts 가 적어 둔 OKLCH 와 맞는지 본다.
    const hex = (name: string) => {
      const { l, c, h } = parseOklch(resolve(light, name));
      return oklchToHex(l, c, h);
    };

    expect(OG_ACCENT.paper).toBe(hex("--cat-paper"));
    expect(OG_ACCENT.release).toBe(hex("--cat-release"));
    expect(OG_ACCENT.news).toBe(hex("--cat-news"));
    expect(OG_ACCENT.community).toBe(hex("--cat-community"));
    expect(OG_ACCENT.note).toBe(hex("--cat-note"));
    expect(OG_GROUND.bg).toBe(hex("--surface"));
    expect(OG_GROUND.border).toBe(hex("--border"));
    expect(OG_GROUND.heading).toBe(hex("--heading"));
    expect(OG_GROUND.muted).toBe(hex("--muted"));
  });
});
