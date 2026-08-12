"use client";

import NextImage from "next/image";
import { useEffect, useState, type ComponentProps } from "react";

/** src 문자열만으로는 실제 비율을 알 수 없다 — 로드 전 자리를 잡는 기본 비율이다. */
const PLACEHOLDER_WIDTH = 1600;
const PLACEHOLDER_HEIGHT = 900;

/**
 * `img` 매핑. alt 를 캡션으로 쓰고, 클릭하면 라이트박스로 확대한다.
 * alt 가 없으면 렌더 중에 던져서 빌드를 깨뜨린다 — 접근성 규칙을 조용히 통과시키지 않는다.
 */
export function MdxImage({ src, alt }: ComponentProps<"img">) {
  if (typeof src !== "string" || src.length === 0) {
    throw new Error("MDX 이미지에 src 가 없다");
  }
  if (!alt) {
    throw new Error(`MDX 이미지에 alt 가 없다: ${src} — alt 는 필수다`);
  }

  return (
    <figure className="my-8">
      <ZoomableImage src={src} alt={alt} />
      <figcaption className="mt-2 font-sans text-sm text-muted">
        {alt}
      </figcaption>
    </figure>
  );
}

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomed(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed]);

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={`이미지 확대: ${alt}`}
        className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-accent"
      >
        <NextImage
          src={src}
          alt={alt}
          width={PLACEHOLDER_WIDTH}
          height={PLACEHOLDER_HEIGHT}
          sizes="(min-width: 768px) 68ch, 100vw"
          className="h-auto w-full rounded-sm border border-border"
        />
      </button>

      {zoomed ? (
        <button
          type="button"
          onClick={() => setZoomed(false)}
          aria-label="확대한 이미지 닫기"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-bg/95 p-6"
        >
          <NextImage
            src={src}
            alt={alt}
            width={PLACEHOLDER_WIDTH}
            height={PLACEHOLDER_HEIGHT}
            sizes="100vw"
            className="h-auto max-h-[90vh] w-auto max-w-full rounded-sm"
          />
        </button>
      ) : null}
    </>
  );
}
