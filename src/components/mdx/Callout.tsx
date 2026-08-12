import type { ReactNode } from "react";

export type CalloutType = "info" | "success" | "warning" | "danger";

/** 클래스는 리터럴이어야 한다 — Tailwind 는 조합된 클래스명을 찾지 못한다. */
const TONE: Record<CalloutType, { border: string; icon: string }> = {
  info: { border: "border-l-info", icon: "text-info" },
  success: { border: "border-l-success", icon: "text-success" },
  warning: { border: "border-l-warning", icon: "text-warning" },
  danger: { border: "border-l-danger", icon: "text-danger" },
};

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children?: ReactNode;
}) {
  const tone = TONE[type];

  return (
    <aside
      className={`my-6 flex gap-3 border-l-[3px] bg-surface px-4 py-3 ${tone.border}`}
    >
      <span className={`mt-0.5 shrink-0 ${tone.icon}`}>
        <CalloutIcon type={type} />
      </span>
      <div className="min-w-0">
        {title ? (
          <p className="mb-1 font-sans text-sm font-medium text-heading">
            {title}
          </p>
        ) : null}
        {children}
      </div>
    </aside>
  );
}

function CalloutIcon({ type }: { type: CalloutType }) {
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
      {type === "success" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </>
      ) : type === "warning" ? (
        <>
          <path d="M12 4.5 21 19.5H3z" />
          <path d="M12 10v4M12 17h.01" />
        </>
      ) : type === "danger" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </>
      )}
    </svg>
  );
}
