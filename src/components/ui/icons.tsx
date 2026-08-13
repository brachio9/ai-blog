import type { ReactNode } from "react";

/**
 * 아이콘 단일 출처 — docs/UI_GUIDE.md 「아이콘」.
 * 파일마다 인라인 SVG 를 새로 그리면 획 두께와 크기가 자리마다 갈린다. 여기서만 그린다.
 * 규격은 24px 그리드 · strokeWidth 1.5 · currentColor 이고, 표시 크기만 호출부가 정한다.
 * 아이콘 라이브러리(lucide·heroicons 등)를 설치하지 마라 — 그 기본 룩 자체가 템플릿 신호다.
 */
export interface IconProps {
  /** 표시 크기(px). 24px 로 그려 두고 여기서 줄인다. 본문 인라인은 16, 그 외는 기본 20. */
  size?: number;
  className?: string;
}

const DEFAULT_SIZE = 20;

/**
 * 모든 아이콘이 공유하는 껍데기. 획 속성이 여기 한 번만 적혀 있어야 자리마다 갈리지 않는다.
 * 기본은 장식(`aria-hidden`)이다 — 아이콘이 단독으로 의미를 가지면 호출부의 버튼·링크에 레이블을 준다.
 */
function Icon({
  size = DEFAULT_SIZE,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** 검색 — 헤더 링크·검색 입력창. */
export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </Icon>
  );
}

/** 라이트 모드로 전환. */
export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </Icon>
  );
}

/** 다크 모드로 전환. */
export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 14.3A8.5 8.5 0 1 1 10.2 3.5a6.8 6.8 0 0 0 10.3 10.8z" />
    </Icon>
  );
}

/** 새 탭으로 열리는 외부 링크 표식 — 본문 링크와 출처 표기가 함께 쓴다. */
export function ExternalLinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </Icon>
  );
}

/** 콜아웃 info. */
export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  );
}

/** 콜아웃 success. */
export function CheckCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </Icon>
  );
}

/** 콜아웃 warning. */
export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4M12 17h.01" />
    </Icon>
  );
}

/** 콜아웃 danger. */
export function XCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </Icon>
  );
}

/** 코드블록 복사 전. */
export function ClipboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M6 15H5.5A1.5 1.5 0 0 1 4 13.5v-8A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V6" />
    </Icon>
  );
}

/** 코드블록 복사 완료. */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.5 9 17l10.5-10.5" />
    </Icon>
  );
}

/** 이전 글. */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

/** 다음 글. */
export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

/** 접힌 목차 — 펼치기. */
export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

/** 펼친 목차 — 접기. */
export function ChevronUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 15l-6-6-6 6" />
    </Icon>
  );
}

/** 선택 해제 — 활성 태그 필터. */
export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}
