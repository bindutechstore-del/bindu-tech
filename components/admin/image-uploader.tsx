"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * "Add pictures" for the admin forms.
 *
 * Files go straight from the browser to Supabase Storage with the staff
 * member's own session. Migration 0012 already lets `is_staff()` write to the
 * catalogue buckets, so storage RLS is the gate — and a 5 MB photo never has to
 * pass through a Vercel function on its way there, which on the free tier is
 * both a memory cost and a request-size limit waiting to be hit.
 *
 * Photos are shrunk in the browser before upload. A phone camera produces
 * 4-12 MB per shot; the bucket rejects anything over 5 MB, the free storage
 * tier is 1 GB, and nothing on a product page is ever shown wider than about
 * 1,600 px. Re-encoding to WebP at that size typically lands at 150-400 KB.
 *
 * The chosen URLs are posted as repeated hidden inputs. The first one is the
 * main picture — the card thumbnail — and the rest become the gallery.
 *
 * There is deliberately no "paste a link" box. Every picture the shop shows
 * lives in its own storage, so nothing breaks the day someone else's server
 * moves a file, and next/image never has to be taught another host.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
async function shrink(
  file: File,
  maxEdge: number,
): Promise<{ blob: Blob; ext: string; type: string }> {
  // createImageBitmap applies EXIF orientation in current browsers, so a
  // portrait phone photo does not come out sideways.
  // Safari before 17 rejects the options bag outright; it already honours EXIF
  // by default, so retrying without it loses nothing.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(
    () => createImageBitmap(file),
  );

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));

  // Some browsers cannot ENCODE WebP and silently hand back a PNG instead —
  // which for a photo is larger than the original. Check what actually came
  // out and fall back.
  const webp = await encode("image/webp");
  if (webp && webp.type === "image/webp") {
    return { blob: webp, ext: "webp", type: "image/webp" };
  }

  // JPEG has no transparency: a PNG logo on a clear background would come out
  // on solid black. Keep PNGs as PNG.
  if (file.type === "image/png") {
    const png = await encode("image/png");
    if (!png) throw new Error("encode-failed");
    return { blob: png, ext: "png", type: "image/png" };
  }

  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("encode-failed");
  return { blob: jpeg, ext: "jpg", type: "image/jpeg" };
}

export function ImageUploader({
  name,
  initial = [],
  folder,
  max = 8,
  single = false,
  bucket = "product-images",
  maxBytes = 5 * 1024 * 1024,
  maxEdge = 1600,
  label = "picture",
  deniedMessage = "your account is not allowed to upload. Sign in again as staff.",
  fileBase,
}: {
  /** Name of the repeated hidden input the form posts. */
  name: string;
  initial?: string[];
  /** Storage path prefix, e.g. "products" or "brands". */
  folder: string;
  max?: number;
  /** One picture only — a logo, not a gallery. */
  single?: boolean;
  bucket?: string;
  /** The bucket's own file_size_limit (migration 0012). */
  maxBytes?: number;
  /** Longest side after shrinking, in pixels. */
  maxEdge?: number;
  /** What one item is called on the button: "logo", "banner", "picture". */
  label?: string;
  /** Shown when storage refuses the upload (row-level security). */
  deniedMessage?: string;
  /**
   * A fixed file name instead of the original one — for customer photos,
   * whose original names are often the person's own ("rahim-selfie.jpg").
   */
  fileBase?: string;
}) {
  const limit = single ? 1 : max;
  const limitMb = Math.round((maxBytes / 1024 / 1024) * 10) / 10;
  const [urls, setUrls] = useState<string[]>(initial.filter(Boolean));
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // One folder per form session, so two products uploading "IMG_0001.jpg" at
  // once cannot overwrite each other.
  const sessionFolder = useRef(
    `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const room = limit - urls.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    const problems: string[] = [];

    if (files.length > room) {
      problems.push(
        single
          ? "Only one picture here — remove the current one first."
          : `Only ${limit} pictures per product; ${files.length - room} were skipped.`,
      );
    }

    const supabase = createClient();
    setBusy((n) => n + chosen.length);

    const results = await Promise.all(
      chosen.map(async (file) => {
        try {
          if (!ACCEPTED.includes(file.type)) {
            problems.push(`${file.name}: use a JPG, PNG, WebP or AVIF picture.`);
            return null;
          }

          let blob: Blob;
          let ext: string;
          let type: string;
          try {
            ({ blob, ext, type } = await shrink(file, maxEdge));
          } catch {
            problems.push(`${file.name}: this picture could not be read.`);
            return null;
          }

          if (blob.size > maxBytes) {
            problems.push(`${file.name}: still over ${limitMb} MB after shrinking.`);
            return null;
          }

          const base = fileBase ?? (file.name
            .replace(/\.[^.]+$/, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40) || "image");
          const path = `${sessionFolder.current}/${Date.now().toString(36)}-${base}.${ext}`;

          const { error } = await supabase.storage.from(bucket).upload(path, blob, {
            contentType: type,
            cacheControl: "31536000",
            upsert: false,
          });

          if (error) {
            // Storage RLS is the thing that says no for a signed-out or
            // non-staff session; say that rather than the raw policy text.
            problems.push(
              /row-level security|unauthori|not allowed|403/i.test(error.message)
                ? `${file.name}: ${deniedMessage}`
                : `${file.name}: upload failed (${error.message}).`,
            );
            return null;
          }

          return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        } finally {
          setBusy((n) => n - 1);
        }
      }),
    );

    const added = results.filter((u): u is string => Boolean(u));
    setUrls((prev) => [...prev, ...added].slice(0, limit));
    setErrors(problems);
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (i: number, dir: -1 | 1) =>
    setUrls((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const makeMain = (i: number) =>
    setUrls((prev) => [prev[i], ...prev.filter((_, k) => k !== i)]);

  const remove = (i: number) => setUrls((prev) => prev.filter((_, k) => k !== i));

  return (
    <div>
      {/* What the form actually posts. Order matters: the first is the main one.
          The marker lets the server tell "every picture was removed" (marker,
          no URLs) from "this form has no picture field" (neither). */}
      <input type="hidden" name={`${name}__on`} value="1" />
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}

      {urls.length > 0 ? (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((u, i) => (
            <li
              key={u}
              className={`group relative aspect-square overflow-hidden rounded-lg border bg-surface-sunken ${
                i === 0 && !single ? "border-brand-600 ring-1 ring-brand-600/30" : "border-line"
              }`}
            >
              <Image src={u} alt="" fill sizes="160px" className="object-cover" unoptimized />

              {i === 0 && !single ? (
                <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Main
                </span>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/70 to-transparent p-1">
                {!single ? (
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded bg-surface/90 p-0.5 text-ink disabled:opacity-30"
                      aria-label="Move earlier"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === urls.length - 1}
                      className="rounded bg-surface/90 p-0.5 text-ink disabled:opacity-30"
                      aria-label="Move later"
                    >
                      <ChevronRight size={13} />
                    </button>
                    {i !== 0 ? (
                      <button
                        type="button"
                        onClick={() => makeMain(i)}
                        className="rounded bg-surface/90 p-0.5 text-ink"
                        aria-label="Make this the main picture"
                        title="Make main"
                      >
                        <Star size={13} />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded bg-surface/90 p-0.5 text-danger"
                  aria-label="Remove this picture"
                >
                  <X size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple={!single}
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy > 0 || urls.length >= limit}
          onClick={() => inputRef.current?.click()}
        >
          {busy > 0 ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          {busy > 0
            ? `Uploading ${busy}…`
            : single
              ? `${urls.length ? "Replace" : "Upload"} ${label}`
              : "Add pictures"}
        </Button>

        <span className="text-[11px] text-ink-faint">
          {single
            ? `JPG, PNG or WebP · shrunk automatically`
            : `${urls.length}/${limit} · the first is the main picture`}
        </span>
      </div>


      {errors.length > 0 ? (
        <ul role="alert" className="mt-2 space-y-0.5 text-xs text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
