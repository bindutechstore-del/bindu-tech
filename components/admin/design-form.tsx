"use client";

import { useActionState, useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { saveSiteTheme, resetSiteTheme, type AdminState } from "@/lib/actions/admin";
import {
  COLOR_FIELDS,
  FONT_CHOICES,
  DEFAULT_THEME,
  BRAND_PALETTE,
  contrastRatio,
  type SiteTheme,
} from "@/lib/theme/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

const initial: AdminState = { ok: false };

/**
 * Design controls with a live preview.
 *
 * The preview is driven by local state rather than by saving and reloading,
 * because picking a brand colour is a dozen small adjustments and nobody wants
 * a round trip per nudge. Nothing is persisted until Save, and the server
 * re-validates everything regardless of what this form sends.
 */
/**
 * Pairs the storefront actually prints on top of each other. Buttons, the SALE
 * badge and status pills are WHITE text on the colour; body copy is the text
 * colour on the surfaces. 4.5 : 1 is the WCAG AA line for normal-size text.
 */
function readabilityProblems(c: SiteTheme["colors"]): string[] {
  const checks: [string, string, string][] = [
    ["White button text on Primary", "#ffffff", c.brand600],
    ["White button text on Primary (hover)", "#ffffff", c.brand700],
    ["White SALE badge text on Sale / danger", "#ffffff", c.danger],
    ["Text on Surface", c.ink, c.surface],
    ["Text on Page background", c.ink, c.surfaceSunken],
    ["Success messages on Surface", c.success, c.surface],
    ["Warning messages on Surface", c.warning, c.surface],
    ["Shop name on Surface", c.storeName, c.surface],
    ["Footer text on Footer background", c.footerText, c.footerBg],
  ];
  return checks
    .map(([what, fg, bg]) => [what, contrastRatio(fg, bg)] as const)
    .filter(([, ratio]) => ratio < 4.5)
    .map(([what, ratio]) => `${what} — ${ratio.toFixed(1)} : 1`);
}

export function DesignForm({
  theme,
  storeName,
}: {
  theme: SiteTheme;
  storeName: string;
}) {
  const [state, action, pending] = useActionState(saveSiteTheme, initial);
  const [draft, setDraft] = useState<SiteTheme>(theme);
  const [resetting, setResetting] = useState(false);

  const setColor = (key: string, value: string) =>
    setDraft((d) => ({ ...d, colors: { ...d.colors, [key]: value } }));

  const problems = readabilityProblems(draft.colors);

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Brand palette</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Tap a swatch under any colour below to use it there.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {BRAND_PALETTE.map((p) => (
              <li key={p.hex} className="flex items-center gap-2">
                <span
                  className="size-7 shrink-0 rounded-md border border-line"
                  style={{ background: p.hex }}
                />
                <span className="min-w-0 leading-tight">
                  <span lang="bn" className="block truncate text-xs font-medium text-ink">
                    {p.bn}
                  </span>
                  <span className="block font-mono text-[10px] uppercase text-ink-muted">
                    {p.hex}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Colours</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            These drive every button, badge and panel on the storefront. Lighter
            tints and hover shades are worked out from them automatically.
          </p>

          <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {COLOR_FIELDS.map(({ key, label, hint }) => (
              <div key={key}>
                <label className="flex items-center gap-3">
                  <input
                    type="color"
                    name={`color__${key}`}
                    value={draft.colors[key]}
                    onChange={(e) => setColor(key, e.target.value)}
                    className="size-10 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1"
                    aria-label={label}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{label}</span>
                    <span className="block text-[11px] text-ink-faint">{hint}</span>
                    <span className="block font-mono text-[11px] uppercase text-ink-muted">
                      {draft.colors[key]}
                    </span>
                  </span>
                </label>

                <div
                  className="mt-2 flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={`Palette colours for ${label}`}
                >
                  {BRAND_PALETTE.map((p) => {
                    const on = draft.colors[key].toLowerCase() === p.hex;
                    return (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setColor(key, p.hex)}
                        title={`${p.bn} · ${p.en} · ${p.hex.toUpperCase()}`}
                        aria-label={`${p.en} ${p.hex}`}
                        aria-pressed={on}
                        className={`size-5 rounded-full border border-line-strong transition-transform hover:scale-110 ${
                          on ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
                        }`}
                        style={{ background: p.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {problems.length > 0 ? (
            <div
              role="status"
              className="mt-5 rounded-lg border border-warning/40 bg-warning-soft p-3 text-xs text-ink"
            >
              <p className="flex items-center gap-1.5 font-semibold">
                <TriangleAlert size={14} className="text-warning" />
                Some of these will be hard to read
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink-soft">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="mt-1.5 text-ink-muted">
                Aim for 4.5 : 1 or more. You can still save — this is advice, not
                a block.
              </p>
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Typeface</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            A fixed list, because these are compiled in and self-hosted — a font
            named at runtime would cost a blocking request and flash on load.
            Bangla always uses Hind Siliguri.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                Headings
              </span>
              <select
                name="headingFont"
                value={draft.headingFont}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, headingFont: e.target.value as never }))
                }
                className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
              >
                {FONT_CHOICES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                Body &amp; interface
              </span>
              <select
                name="bodyFont"
                value={draft.bodyFont}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bodyFont: e.target.value as never }))
                }
                className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm focus:border-brand-600 focus:outline-none"
              >
                {FONT_CHOICES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 flex items-center justify-between text-xs font-medium text-ink-muted">
              <span>Corner rounding</span>
              <span className="tabular">{draft.radius.toFixed(2)}rem</span>
            </span>
            <input
              type="range"
              name="radius"
              min={0}
              max={2}
              step={0.05}
              value={draft.radius}
              onChange={(e) =>
                setDraft((d) => ({ ...d, radius: Number(e.target.value) }))
              }
              className="w-full accent-brand-600"
            />
          </label>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Header</h2>
          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              name="showStoreName"
              checked={draft.showStoreName}
              onChange={(e) => setDraft((d) => ({ ...d, showStoreName: e.target.checked }))}
              className="mt-0.5 size-4 accent-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Show the shop name next to the logo
              </span>
              <span className="block text-xs text-ink-muted">
                Keep it on for a square logo mark. Turn it off if your logo already
                has the name written in it — the logo then gets the full width.
              </span>
            </span>
          </label>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            Save design
          </Button>

          <Button
            type="button"
            variant="outline"
            loading={resetting}
            onClick={async () => {
              setResetting(true);
              await resetSiteTheme();
              setDraft(DEFAULT_THEME);
              setResetting(false);
            }}
          >
            <RotateCcw size={15} />
            Reset to default
          </Button>

          {state.error ? (
            <span role="alert" className="text-sm text-danger">
              {state.error}
            </span>
          ) : state.ok && state.message ? (
            <span className="text-sm text-success">{state.message}</span>
          ) : null}
        </div>
      </div>

      <ThemePreview theme={draft} storeName={storeName} />
    </form>
  );
}

/**
 * A miniature storefront, scoped to its own CSS variables.
 *
 * The overrides are set on this element rather than on :root, so the preview
 * can show unsaved colours without recolouring the admin panel around it.
 */
function ThemePreview({ theme, storeName }: { theme: SiteTheme; storeName: string }) {
  const c = theme.colors;

  return (
    <div className="lg:sticky lg:top-4 lg:self-start">
      <p className="mb-2 text-xs font-medium text-ink-muted">Live preview</p>

      <div
        className="overflow-hidden rounded-xl border border-line"
        style={
          {
            "--color-brand-600": c.brand600,
            "--color-brand-700": c.brand700,
            "--color-ink": c.ink,
            "--color-surface": c.surface,
            "--color-surface-sunken": c.surfaceSunken,
            "--color-danger": c.danger,
            "--color-success": c.success,
            "--color-warning": c.warning,
            "--radius-card": `${theme.radius}rem`,
            background: c.surfaceSunken,
            color: c.ink,
          } as React.CSSProperties
        }
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: c.surface, borderBottom: `1px solid ${c.surfaceSunken}` }}
        >
          <span className="text-sm font-bold" style={{ color: c.storeName }}>
            {theme.showStoreName ? storeName : "Logo"}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ background: c.danger }}
          >
            SALE
          </span>
        </div>

        <div className="space-y-3 p-4">
          <div
            className="p-3"
            style={{ background: c.surface, borderRadius: `${theme.radius}rem` }}
          >
            <div
              className="mb-2 h-16 w-full"
              style={{
                background: `linear-gradient(135deg, ${c.brand600}, ${c.brand700})`,
                borderRadius: `${theme.radius}rem`,
              }}
            />
            <p className="text-sm font-semibold">Wireless Earbuds</p>
            <p className="text-xs" style={{ opacity: 0.6 }}>
              In stock · Free delivery
            </p>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-base font-bold tabular">৳2,450</span>
              <span
                className="text-xs line-through tabular"
                style={{ opacity: 0.45 }}
              >
                ৳3,200
              </span>
            </div>

            <button
              type="button"
              className="mt-3 w-full px-3 py-2 text-xs font-semibold text-white"
              style={{ background: c.brand600, borderRadius: `${theme.radius}rem` }}
            >
              Add to cart
            </button>
          </div>

          <div className="flex gap-2">
            <span
              className="flex-1 px-2 py-1.5 text-center text-[11px] font-semibold text-white"
              style={{ background: c.success, borderRadius: `${theme.radius}rem` }}
            >
              Delivered
            </span>
            <span
              className="flex-1 px-2 py-1.5 text-center text-[11px] font-semibold text-white"
              style={{ background: c.warning, borderRadius: `${theme.radius}rem` }}
            >
              Pending
            </span>
          </div>
        </div>

        <div className="px-4 py-3 text-xs" style={{ background: c.footerBg, color: c.footerText }}>
          <p className="font-bold">{storeName}</p>
          <p style={{ opacity: 0.75 }}>Shop · Help · Talk to us — footer</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-ink-faint">
        Fonts are not previewed here — they apply to the whole document, so the
        change shows on the storefront the moment you save.
      </p>
    </div>
  );
}
