"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { saveContentPage, resetContentPage } from "@/lib/actions/content-pages";
import { TONES, TONE_INFO, type Block, type PageContent, type Tone } from "@/lib/content/blocks";
import { BRAND_PALETTE, contrastRatio } from "@/lib/theme/schema";
import { PageBanner, PageBlocks } from "@/components/content/page-blocks";
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
  heading: "Heading",
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
            <Textarea
              value={subtitle}
              rows={2}
              maxLength={600}
              placeholder="One or two lines under the title — Bangla and English both fine"
              onChange={(e) => touch(setSubtitle)(e.target.value)}
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
        </Card>

        <p className="text-xs text-ink-muted">
          Tip: write <code className="rounded bg-surface-sunken px-1">**৭২ ঘণ্টার মধ্যে**</code> to make
          words bold. Line breaks are kept.
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

            {b.type === "heading" ? (
              <Input
                value={b.text}
                maxLength={200}
                placeholder="Section heading"
                onChange={(e) => update(b._id, { text: e.target.value })}
              />
            ) : b.type === "paragraph" ? (
              <Textarea
                value={b.text}
                rows={3}
                placeholder="Write the paragraph…"
                onChange={(e) => update(b._id, { text: e.target.value })}
              />
            ) : b.type === "list" ? (
              <Textarea
                value={b.items.join("\n")}
                rows={4}
                placeholder={"One point per line"}
                onChange={(e) => update(b._id, { items: e.target.value.split("\n") })}
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
                <Textarea
                  value={b.text}
                  rows={3}
                  placeholder="What the box says"
                  onChange={(e) => update(b._id, { text: e.target.value })}
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
                <Textarea
                  value={b.a}
                  rows={3}
                  placeholder="Answer"
                  onChange={(e) => update(b._id, { a: e.target.value })}
                />
              </div>
            )}
          </Card>
        ))}

        <Card className="p-4">
          <p className="mb-2 text-sm font-medium text-ink">Add a block</p>
          <div className="flex flex-wrap gap-2">
            <AddButton onClick={() => add({ type: "heading", text: "" })}>Heading</AddButton>
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
