"use client";

import { type ReactElement, useEffect, useRef } from "react";

import { getGiscusConfig } from "@/lib/giscus";
import { DARK_CLASS } from "@/lib/theme";

const GISCUS_ORIGIN = "https://giscus.app";

/** NEXT_PUBLIC_* 는 빌드 타임 상수라 모듈이 로드될 때 한 번만 읽으면 된다. */
const CONFIG = getGiscusConfig();

/** giscus 프리셋 이름. 사이트 테마와 축이 같아서 그대로 넘길 수 있다. */
function currentTheme(): "light" | "dark" {
  return document.documentElement.classList.contains(DARK_CLASS)
    ? "dark"
    : "light";
}

/**
 * 댓글 — Giscus 가 GitHub Discussions 에 저장한다 (ADR-004). 서버·DB 를 쓰지 않는다.
 * 환경변수가 하나라도 비면 아무것도 그리지 않는다 (조회수와 같은 원칙).
 */
export function Comments(): ReactElement | null {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !CONFIG) {
      return;
    }

    // 스크립트에 실어 보낸 테마. 여기서부터의 변화는 postMessage 로만 전달된다.
    let applied = currentTheme();

    const script = document.createElement("script");
    script.src = `${GISCUS_ORIGIN}/client.js`;
    script.async = true;
    script.crossOrigin = "anonymous";

    const settings: Record<string, string> = {
      "data-repo": CONFIG.repo,
      "data-repo-id": CONFIG.repoId,
      "data-category": CONFIG.category,
      "data-category-id": CONFIG.categoryId,
      // 글 URL 로 Discussion 을 매칭한다 — 글 하나에 스레드 하나.
      "data-mapping": "pathname",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": applied,
      "data-lang": "ko",
      "data-loading": "lazy",
    };
    for (const [name, value] of Object.entries(settings)) {
      script.setAttribute(name, value);
    }
    host.appendChild(script);

    /**
     * 이미 만들어진 iframe 은 data-theme 을 고쳐도 반응하지 않는다 — postMessage 만 통한다.
     * 로드 전에 보낸 것은 무시되므로 applied 를 그대로 두고, giscus 가 첫 메시지를 보낼 때 다시 시도한다.
     */
    function syncTheme() {
      const theme = currentTheme();
      const frame = host?.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
      if (theme === applied || !frame?.contentWindow) {
        return;
      }

      frame.contentWindow.postMessage(
        { giscus: { setConfig: { theme } } },
        GISCUS_ORIGIN,
      );
      applied = theme;
    }

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // 테마를 로딩 중에 바꿨다면 위 postMessage 가 버려졌다 — iframe 이 말을 걸어올 때 만회한다.
    function onGiscusMessage(event: MessageEvent) {
      if (event.origin === GISCUS_ORIGIN) {
        syncTheme();
      }
    }
    window.addEventListener("message", onGiscusMessage);

    return () => {
      observer.disconnect();
      window.removeEventListener("message", onGiscusMessage);
      // 글 사이를 이동할 때 비우지 않으면 iframe 이 두 벌 남는다.
      host.replaceChildren();
    };
  }, []);

  if (!CONFIG) {
    return null;
  }

  // 댓글이 늦게 떠도 페이지가 크게 밀리지 않도록 자리를 먼저 잡는다.
  return <div ref={hostRef} className="mt-4 min-h-[240px]" />;
}
