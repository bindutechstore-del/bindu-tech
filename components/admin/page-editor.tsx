"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Bold,
  Plus,
  RotateCcw,
  Trash2,
  Underline,
} from "lucide-react";
import { saveContentPage, resetContentPage } from "@/lib/actions/content-pages";
import {
  TEXT_COLORS,
  TONES,
  TONE_INFO,
  type Block,
  type PageContent,
  type Tone,
  TITLE_ICONS,
  type TitleColor,
  type TitleIcon,
  type TextColor,
} from "@/lib/content/blocks";
import { BRAND_PALETTE, contrastRatio } from "@/lib/theme/schema";
import { PageBanner, PageBlocks, titleColor } from "@/components/content/page-blocks";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/field";

type Item = Block & { _id: number };

const TONE_DOT: Record<Tone, string> = {
  danger: "bg-red-500",
  warning: "bg-orange-500",
  info: "bg-sky-600",
  note: "bg-amber-400",
  success: "bg-emerald-600",
};

const BLOCK_LABEL: Record<Block["type"], string> = {
  heading: "Title",
  subheading: "Subtitle",
  paragraph: "Paragraph",
  list: "Ticked list",
  callout: "Notice box",
  faq: "Question & answer",
};

/** Banner swatches: the brand palette's darker colours, plus a few classics. */
const BANNER_SWATCHES = [
  "#016952",
  "#15803d",
  "#0f766e",
  "#1d4ed8",
  "#6d28d9",
  "#be123c",
  "#c2410c",
  ...BRAND_PALETTE.map((p) => p.hex),
].filter((hex, i, all) => all.indexOf(hex) === i && contrastRatio("#ffffff", hex) >= 4.5);

export function PageEditor({
  slug,
  initial,
  edited,
}: {
  slug: string;
  initial: PageContent;
  edited: boolean;
}) {
  const nextId = useRef(0);
  const tag = (b: Block): Item => ({ ...b, _id: nextId.current++ });

  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [description, setDescription] = useState(initial.description);
  const [bannerColor, setBannerColor] = useState(initial.bannerColor);
  const [boxed, setBoxed] = useState(initial.boxed);
  const [blocks, setBlocks] = useState<Item[]>(() => initial.blocks.map(tag));
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const lastAdded = useRef<number | null>(null);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (lastAdded.current === null) return;
    document.getElementById(`block-${lastAdded.current}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    lastAdded.current = null;
  }, [blocks]);

  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };

  const update = (id: number, patch: Partial<Block>) => {
    setBlocks((all) => all.map((b) => (b._id === id ? ({ ...b, ...patch } as Item) : b)));
    setDirty(true);
  };
  const move = (i: number, by: -1 | 1) => {
    setBlocks((all) => {
      const j = i + by;
      if (j < 0 || j >= all.length) return all;
      const copy = [...all];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    setDirty(true);
  };
  const remove = (id: number) => {
    setBlocks((all) => all.filter((b) => b._id !== id));
    setDirty(true);
  };
  const add = (b: Block) => {
    const item = tag(b);
    lastAdded.current = item._id;
    setBlocks((all) => [...all, item]);
    setDirty(true);
  };

  const content: PageContent = {
    title,
    subtitle,
    description,
    bannerColor,
    boxed,
    blocks: blocks.map(({ _id, ...b }) => b as Block),
  };

  const save = () =>
    start(async () => {
      const r = await saveContentPage(slug, content);
      if (r.ok) {
        setDirty(false);
        toast.success(r.message ?? "Saved.");
      } else toast.error(r.error ?? "Could not save.");
    });

  const reset = () => {
    if (!confirm("Throw away your version and show the built-in text again?")) return;
    start(async () => {
      const r = await resetContentPage(slug);
      if (r.ok) {
        setDirty(false);
        window.location.reload();
      } else toast.error(r.error ?? "Could not reset.");
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Title</span>
            <Input value={title} maxLength={160} onChange={(e) => touch(setTitle)(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Subtitle</span>
            <RichTextarea
              value={subtitle}
              rows={2}
              placeholder="One or two lines under the title — Bangla and English both fine"
              onChange={touch(setSubtitle)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Google description</span>
            <Input
              value={description}
              maxLength={300}
              placeholder="What Google shows under the link (about 150 characters)"
              onChange={(e) => touch(setDescription)(e.target.value)}
            />
          </label>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={Boolean(bannerColor)}
                onChange={(e) => touch(setBannerColor)(e.target.checked ? "#15803d" : "")}
                className="size-4 accent-brand-600"
              />
              Coloured banner behind the title
            </label>
            {bannerColor ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={bannerColor}
                  onChange={(e) => touch(setBannerColor)(e.target.value)}
                  aria-label="Banner colour"
                  className="size-9 cursor-pointer rounded-lg border border-line bg-surface p-1"
                />
                {BANNER_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => touch(setBannerColor)(hex)}
                    aria-label={`Use ${hex}`}
                    className={`size-7 rounded-md border-2 ${bannerColor === hex ? "border-ink" : "border-transparent"}`}
                    style={{ background: hex }}
                  />
                ))}
                {contrastRatio("#ffffff", bannerColor) < 4.5 ? (
                  <p className="w-full text-xs text-danger">
                    White title text is hard to read on this colour — pick a darker one.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={boxed}
              onChange={(e) => touch(setBoxed)(e.target.checked)}
              className="mt-0.5 size-4 accent-brand-600"
            />
            <span>
              <span className="block font-medium">Put each section in its own box</span>
              <span className="block text-xs text-ink-muted">
                Every Title starts a new box with everything under it.
              </span>
            </span>
          </label>
        </Card>

        <p className="text-xs text-ink-muted">
          Tip: select words, then press <b>B</b> for bold, <u>U</u> for underline, or a colour dot.
          Line breaks are kept.
        </p>

        {blocks.map((b, i) => (
          <Card key={b._id} id={`block-${b._id}`} className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {b.type === "callout" ? <span className={`size-2.5 rounded-full ${TONE_DOT[b.tone]}`} /> : null}
                {b.type === "callout" ? TONE_INFO[b.tone].label : BLOCK_LABEL[b.type]}
              </span>
              <span className="ml-auto flex gap-1">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={15} />
                </IconButton>
                <IconButton label="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={15} />
                </IconButton>
                <IconButton label="Remove" danger onClick={() => remove(b._id)}>
                  <Trash2 size={15} />
                </IconButton>
              </span>
            </div>

            {b.type === "heading" || b.type === "subheading" ? (
              <div className="space-y-2">
                <Input
                  value={b.text}
                  maxLength={200}
                  placeholder={b.type === "heading" ? "Section title" : "Subtitle"}
                  onChange={(e) => update(b._id, { text: e.target.value })}
                  className={b.type === "heading" ? "font-semibold" : undefined}
                />
                <TitleControls block={b} onChange={(patch) => update(b._id, patch)} />
              </div>
            ) : b.type === "paragraph" ? (
              <RichTextarea
                value={b.text}
                rows={3}
                placeholder="Write the paragraph…"
                onChange={(v) => update(b._id, { text: v })}
              />
            ) : b.type === "list" ? (
              <RichTextarea
                value={b.items.join("\n")}
                rows={4}
                placeholder={"One point per line"}
                onChange={(v) => update(b._id, { items: v.split("\n") })}
              />
            ) : b.type === "callout" ? (
              <div className="space-y-2">
                <Select
                  value={b.tone}
                  onChange={(e) => update(b._id, { tone: e.target.value as Tone })}
                  aria-label="Box colour"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {TONE_INFO[t].label} — {TONE_INFO[t].hint}
                    </option>
                  ))}
                </Select>
                <Input
                  value={b.title}
                  maxLength={200}
                  placeholder="Box title, e.g. সতর্কীকরণ:"
                  onChange={(e) => update(b._id, { title: e.target.value })}
                />
                <RichTextarea
                  value={b.text}
                  rows={3}
                  placeholder="What the box says"
                  onChange={(v) => update(b._id, { text: v })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={b.q}
                  maxLength={300}
                  placeholder="Question"
                  onChange={(e) => update(b._id, { q: e.target.value })}
                />
                <RichTextarea
                  value={b.a}
                  rows={3}
                  placeholder="Answer"
                  onChange={(v) => update(b._id, { a: v })}
                />
              </div>
            )}
          </Card>
        ))}

        <Card className="p-4">
          <p className="mb-2 text-sm font-medium text-ink">Add a block</p>
          <div className="flex flex-wrap gap-2">
            <AddButton onClick={() => add({ type: "heading", text: "" })}>Title</AddButton>
            <AddButton onClick={() => add({ type: "subheading", text: "" })}>Subtitle</AddButton>
            <AddButton onClick={() => add({ type: "paragraph", text: "" })}>Paragraph</AddButton>
            <AddButton onClick={() => add({ type: "list", items: [""] })}>Ticked list</AddButton>
            {TONES.map((t) => (
              <AddButton key={t} dot={TONE_DOT[t]} onClick={() => add({ type: "callout", tone: t, title: "", text: "" })}>
                {TONE_INFO[t].label}
              </AddButton>
            ))}
            <AddButton onClick={() => add({ type: "faq", q: "", a: "" })}>Question &amp; answer</AddButton>
          </div>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-surface-sunken/95 px-4 py-3 backdrop-blur">
          <Button type="button" onClick={save} loading={pending}>
            Save page
          </Button>
          {edited ? (
            <Button type="button" variant="outline" onClick={reset} disabled={pending}>
              <RotateCcw size={15} />
              Back to built-in text
            </Button>
          ) : null}
          {dirty ? <span className="text-xs text-warning">Unsaved changes</span> : null}
        </div>
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <p className="mb-2 text-xs font-medium text-ink-muted">Live preview</p>
        <Card className="max-h-[80vh] overflow-y-auto p-5 sm:p-6">
          <PageBanner title={title || "Untitled"} subtitle={subtitle} color={bannerColor} />
          <div className="mt-6">
            <PageBlocks
              boxed={boxed}
              blocks={content.blocks.map((b) =>
                b.type === "list" ? { ...b, items: b.items.filter((x) => x.trim()) } : b,
              )}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * A textarea with a small formatting bar. The buttons wrap the selected words
 * in the markers the page renderer understands — **bold**, __underline__,
 * [red]colour[/red] — so nobody has to remember them. With nothing selected
 * they insert a placeholder word to type over.
 */
function RichTextarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (open: string, close: string) => {
    const el = ref.current;
    if (!el) return;
    const a = el.selectionStart;
    const b = el.selectionEnd;
    const picked = value.slice(a, b) || "text";
    onChange(value.slice(0, a) + open + picked + close + value.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + open.length, a + open.length + picked.length);
    });
  };
  return (
    <div className="overflow-hidden rounded-lg border border-line-strong bg-surface focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface-sunken px-2 py-1.5">
        <ToolButton label="Bold" onClick={() => wrap("**", "**")}>
          <Bold size={15} />
        </ToolButton>
        <ToolButton label="Underline" onClick={() => wrap("__", "__")}>
          <Underline size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {(Object.entries(TEXT_COLORS) as [keyof typeof TEXT_COLORS, string][]).map(([name, hex]) => (
          <button
            key={name}
            type="button"
            title={`${name[0].toUpperCase()}${name.slice(1)} text`}
            aria-label={`Make the selected words ${name}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => wrap(`[${name}]`, `[/${name}]`)}
            className="size-6 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
            style={{ background: hex }}
          />
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full resize-y bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </div>
  );
}

/**
 * Under each Title / Subtitle: left or centred, a colour, and an icon — the
 * shop owner asked for all three ("titles don't come to the middle", "can't
 * add an icon", "need a colour option for titles").
 */
function TitleControls({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "heading" | "subheading" }>;
  onChange: (patch: Partial<Block>) => void;
}) {
  const colors: (TitleColor | undefined)[] = [
    undefined,
    "brand",
    ...(Object.keys(TEXT_COLORS) as TextColor[]),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-line p-0.5" role="group" aria-label="Alignment">
        <ToolButton label="Align left" active={!block.align} onClick={() => onChange({ align: undefined })}>
          <AlignLeft size={15} />
        </ToolButton>
        <ToolButton label="Centre" active={block.align === "center"} onClick={() => onChange({ align: "center" })}>
          <AlignCenter size={15} />
        </ToolButton>
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Title colour">
        {colors.map((c) => (
          <button
            key={c ?? "default"}
            type="button"
            title={c ? `${c[0].toUpperCase()}${c.slice(1)}` : "Default (dark)"}
            aria-label={`Title colour: ${c ?? "default"}`}
            aria-pressed={block.color === c}
            onClick={() => onChange({ color: c })}
            className={`size-6 rounded-full border-2 ${
              block.color === c ? "border-ink ring-2 ring-brand-600/30" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
            }`}
            style={{ background: c ? titleColor(c) : "#14161a" }}
          />
        ))}
      </div>
      <Select
        value={block.icon ?? ""}
        onChange={(e) => onChange({ icon: (e.target.value || undefined) as TitleIcon | undefined })}
        aria-label="Title icon"
        className="h-8 w-auto min-w-36 text-xs"
      >
        <option value="">No icon</option>
        {(Object.entries(TITLE_ICONS) as [TitleIcon, string][]).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      // Keep the textarea's selection while the button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-md hover:bg-surface hover:text-ink ${
        active ? "bg-brand-50 text-brand-700" : "text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex size-8 items-center justify-center rounded-lg text-ink-muted disabled:opacity-30 ${
        danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-surface-sunken hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function AddButton({
  onClick,
  dot,
  children,
}: {
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-brand-600 hover:text-brand-700"
    >
      {dot ? <span className={`size-2.5 rounded-full ${dot}`} /> : <Plus size={14} />}
      {children}
    </button>
  );
}
