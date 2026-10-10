import { AlertTriangle, CircleCheck, Info, ShieldCheck, Check, type LucideIcon } from "lucide-react";
import { boldRuns, type Block, type Tone } from "@/lib/content/blocks";

/**
 * Renders an information page: the optional coloured banner and its blocks.
 *
 * No hooks and no server imports, so the storefront page and the admin
 * editor's live preview draw exactly the same thing.
 */

const TONE_STYLE: Record<Tone, { box: string; title: string; icon: LucideIcon; iconClass: string }> = {
  danger: {
    box: "border-red-500 bg-red-50",
    title: "text-red-700",
    icon: AlertTriangle,
    iconClass: "text-red-600",
  },
  warning: {
    box: "border-orange-500 bg-orange-50",
    title: "text-orange-800",
    icon: AlertTriangle,
    iconClass: "text-orange-600",
  },
  info: {
    box: "border-sky-600 bg-sky-50",
    title: "text-sky-800",
    icon: CircleCheck,
    iconClass: "text-sky-700",
  },
  note: {
    box: "border-amber-400 bg-amber-50",
    title: "text-amber-900",
    icon: Info,
    iconClass: "text-amber-700",
  },
  success: {
    box: "border-emerald-600 bg-emerald-50",
    title: "text-emerald-800",
    icon: ShieldCheck,
    iconClass: "text-emerald-700",
  },
};

/** Text with `**bold**` runs, line breaks kept. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {boldRuns(text).map((r, i) =>
        r.bold ? (
          <strong key={i} className="font-semibold text-ink">
            {r.text}
          </strong>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

export function PageBanner({
  title,
  subtitle,
  color,
}: {
  title: string;
  subtitle?: string;
  /** `#rrggbb` for a coloured banner, empty for a plain heading. */
  color?: string;
}) {
  if (!color) {
    return (
      <>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? (
          <p className="mt-3 whitespace-pre-line text-base leading-7 text-ink-soft">{subtitle}</p>
        ) : null}
      </>
    );
  }
  return (
    <div
      className="rounded-2xl px-6 py-8 text-center text-white shadow-card sm:px-10 sm:py-10"
      style={{ background: color }}
    >
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle ? (
        <p className="mx-auto mt-3 max-w-2xl whitespace-pre-line text-sm leading-7 text-white/90 sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function PageBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return (
              <h2 key={i} className="pt-3 text-lg font-bold tracking-tight text-ink">
                {b.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="whitespace-pre-line text-[15px] leading-7 text-ink-soft">
                <Rich text={b.text} />
              </p>
            );
          case "list":
            return (
              <ul key={i} className="space-y-2">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-[15px] leading-7 text-ink-soft">
                    <Check size={17} className="mt-1.5 shrink-0 text-success" />
                    <span>
                      <Rich text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "callout": {
            const t = TONE_STYLE[b.tone];
            const Icon = t.icon;
            return (
              <div key={i} className={`rounded-xl border-l-4 p-4 sm:p-5 ${t.box}`}>
                {b.title ? (
                  <p className={`flex items-center gap-2 font-semibold ${t.title}`}>
                    <Icon size={18} className={`shrink-0 ${t.iconClass}`} />
                    {b.title}
                  </p>
                ) : null}
                {b.text ? (
                  <p
                    className={`whitespace-pre-line text-[15px] leading-7 text-ink-soft ${b.title ? "mt-1.5" : ""}`}
                  >
                    <Rich text={b.text} />
                  </p>
                ) : null}
              </div>
            );
          }
          case "faq":
            return (
              <details
                key={i}
                className="group rounded-xl border border-line bg-surface p-4 open:shadow-card"
              >
                <summary className="cursor-pointer list-none text-[15px] font-medium text-ink marker:content-none">
                  <span className="flex items-start justify-between gap-3">
                    {b.q}
                    <span className="mt-1 shrink-0 text-ink-faint transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2.5 whitespace-pre-line text-[15px] leading-7 text-ink-muted">
                  <Rich text={b.a} />
                </p>
              </details>
            );
        }
      })}
    </div>
  );
}
