"use client";

import { useSyncExternalStore } from "react";

import { DARK_CLASS, setTheme, type Theme } from "@/lib/theme";

/**
 * 테마의 실제 소재지는 `<html>` 의 dark 클래스다 — layout.tsx 의 인라인 스크립트가
 * 페인트 전에 이미 확정해 둔다. 여기서는 그 값을 읽기만 하고 다시 계산하지 않는다.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains(DARK_CLASS)
    ? "dark"
    : "light";
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
      className="rounded border border-border p-1.5 text-muted transition-colors hover:bg-surface hover:text-heading focus-visible:outline-2 focus-visible:outline-accent"
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

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.5 14.3A8.5 8.5 0 1 1 10.2 3.5a6.8 6.8 0 0 0 10.3 10.8z" />
    </svg>
  );
}
