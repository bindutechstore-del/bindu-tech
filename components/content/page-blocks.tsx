import type { ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  Check,
  CircleCheck,
  CircleHelp,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Headphones,
  Info,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  inlineRuns,
  TEXT_COLORS,
  type Block,
  type Tone,
  type TitleColor,
  type TitleIcon,
} from "@/lib/content/blocks";

const TITLE_ICON: Record<TitleIcon, LucideIcon> = {
  shield: ShieldCheck,
  truck: Truck,
  return: RotateCcw,
  card: CreditCard,
  wallet: Wallet,
  money: Banknote,
  phone: Phone,
  mail: Mail,
  location: MapPin,
  clock: Clock,
  info: Info,
  warning: AlertTriangle,
  check: CircleCheck,
  package: Package,
  video: Video,
  gift: Gift,
  star: Star,
  lock: Lock,
  help: CircleHelp,
  file: FileText,
  support: Headphones,
};

/** The CSS colour for a Title colour choice; "brand" follows the shop's theme. */
export function titleColor(c: TitleColor): string {
  return c === "brand" ? "var(--color-brand-700)" : TEXT_COLORS[c];
}

/**
 * Emails, Bangladeshi phone numbers and web addresses become links, so a
 * shopper can tap "Call: 09658526519" or an email straight from a policy page.
 * Phones: 01XXXXXXXXX mobiles and 09XXXXXXXXX hotlines, with or without 880.
 */
const LINK =
  /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])|(www\.[^\s<]+[^\s<.,;:!?)\]'"])|((?<![\d+])(?:\+?880|0)(?:1[3-9]\d{8}|9\d{9})(?!\d))/g;

function linkify(text: string, linkClass: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const [whole, email, url, www, phone] = m;
    let href = "";
    if (email) href = `mailto:${email}`;
    else if (url) href = url;
    else if (www) href = `https://${www}`;
    else if (phone) {
      const digits = phone.replace(/\D/g, "");
      href = `tel:${digits.startsWith("880") ? `+${digits}` : `+88${digits}`}`;
    }
    out.push(
      <a
        key={at}
        href={href}
        className={linkClass}
        {...(url || www ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {whole}
      </a>,
    );
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const LINK_CLASS = "font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800";

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

/**
 * Text with **bold**, __underline__ and [red]colour[/red] runs, and emails,
 * phone numbers and web addresses as links; line breaks kept.
 */
export function Rich({ text, linkClass = LINK_CLASS }: { text: string; linkClass?: string }) {
  return (
    <>
      {inlineRuns(text).map((r, i) => {
        const cls = [r.bold && "font-bold text-ink", r.underline && "underline underline-offset-4"]
          .filter(Boolean)
          .join(" ");
        const style = r.color ? { color: TEXT_COLORS[r.color] } : undefined;
        const content = linkify(r.text, linkClass);
        if (!cls && !style) return <span key={i}>{content}</span>;
        return r.bold ? (
          <strong key={i} className={cls} style={style}>
            {content}
          </strong>
        ) : (
          <span key={i} className={cls || undefined} style={style}>
            {content}
          </span>
        );
      })}
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
          <p className="mt-3 whitespace-pre-line text-base leading-7 text-ink-soft">
            <Rich text={subtitle} />
          </p>
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
          {/* Links keep the banner's white, underlined. */}
          <Rich text={subtitle} linkClass="font-semibold underline underline-offset-2" />
        </p>
      ) : null}
    </div>
  );
}

function renderBlock(b: Block, i: number) {
  switch (b.type) {
    case "heading": {
      // "Title": underlined (in its own colour, or the brand colour), with an
      // optional icon, left or centred — all chosen in the editor.
      const color = b.color ? titleColor(b.color) : undefined;
      const Icon = b.icon ? TITLE_ICON[b.icon] : null;
      return (
        <h2
          key={i}
          className={`pt-3 text-lg font-bold tracking-tight text-ink first:pt-0 sm:text-xl ${
            b.align === "center" ? "text-center" : ""
          }`}
          style={color ? { color } : undefined}
        >
          {Icon ? <Icon size={22} aria-hidden className="mr-2 inline-block -translate-y-0.5 align-middle" /> : null}
          <span
            className="underline decoration-[3px] underline-offset-[7px]"
            style={{ textDecorationColor: color ?? "var(--color-brand-600)" }}
          >
            {b.text}
          </span>
        </h2>
      );
    }
    case "subheading": {
      const color = b.color ? titleColor(b.color) : undefined;
      const Icon = b.icon ? TITLE_ICON[b.icon] : null;
      return (
        <h3
          key={i}
          className={`pt-1 text-base font-semibold text-ink first:pt-0 ${b.align === "center" ? "text-center" : ""}`}
          style={color ? { color } : undefined}
        >
          {Icon ? <Icon size={18} aria-hidden className="mr-1.5 inline-block -translate-y-px align-middle" /> : null}
          {b.text}
        </h3>
      );
    }
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
}

/**
 * The blocks, either flowing as one column or — with `boxed` — grouped into
 * sections, each starting at a Title, and each in its own card.
 */
export function PageBlocks({ blocks, boxed = false }: { blocks: Block[]; boxed?: boolean }) {
  if (!boxed) return <div className="space-y-5">{blocks.map(renderBlock)}</div>;

  const sections: Block[][] = [];
  for (const b of blocks) {
    if (b.type === "heading" || sections.length === 0) sections.push([b]);
    else sections[sections.length - 1].push(b);
  }
  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <section key={i} className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          {s.map(renderBlock)}
        </section>
      ))}
    </div>
  );
}
