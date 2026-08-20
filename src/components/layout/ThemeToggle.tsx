"use client";

import { useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { currentTheme, setTheme, type Theme } from "@/lib/theme";

/**
 * 테마의 실제 소재지는 `<html>` 의 light 클래스다 — layout.tsx 의 인라인 스크립트가
 * 페인트 전에 이미 확정해 둔다. 여기서는 그 값을 읽기만 하고 다시 계산하지 않는다.
 * **밤에는 클래스가 없다** — 그게 기본이라는 뜻이다.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return currentTheme();
}

/** 서버는 사용자의 테마를 알 수 없다 — 마운트 전에는 아이콘을 확정하지 않는다. */
function getServerSnapshot(): null {
  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
    for (const listener of listeners) listener();
  }

  const label =
    theme === null
      ? "테마 전환"
      : theme === "dark"
        ? "라이트 모드로 전환"
        : "다크 모드로 전환";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded border border-border p-1.5 text-muted transition-colors hover:bg-surface hover:text-heading focus-visible:outline-2 focus-visible:outline-focus"
    >
      {theme === null ? (
        <span className="block size-5" />
      ) : theme === "dark" ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </button>
  );
}
