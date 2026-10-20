"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/session";
import { getContentPage } from "@/lib/content/pages";
import { sanitiseBlocks } from "@/lib/content/blocks";

export interface PageSaveState {
  ok: boolean;
  message?: string;
  error?: string;
}

const pageSchema = z.object({
  title: z.string().trim().min(1, "Give the page a title").max(160),
  subtitle: z.string().trim().max(600).optional().default(""),
  description: z.string().trim().max(300).optional().default(""),
  bannerColor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(#[0-9a-f]{6})?$/, "Pick the banner colour from the picker"),
  boxed: z.boolean().optional().default(false),
  blocks: z.unknown(),
});

/**
 * Save the shop owner's version of an information page (admin → Pages).
 * Only the built-in pages can be edited: the storefront route 404s anything
 * else, so a row for an unknown slug would be unreachable.
 */
export async function saveContentPage(slug: string, input: unknown): Promise<PageSaveState> {
  const actor = await requirePermission("settings");
  if (!getContentPage(slug)) return { ok: false, error: "Unknown page." };

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the page." };
  }
  const d = parsed.data;
  const blocks = sanitiseBlocks(d.blocks);
  if (blocks.length === 0) return { ok: false, error: "Add at least one block." };

  const db = createAdminClient();
  const { error } = await db.from("content_pages").upsert(
    {
      slug,
      title: d.title,
      subtitle: d.subtitle || null,
      description: d.description || null,
      banner_color: d.bannerColor || null,
      boxed: d.boxed,
      blocks,
      updated_by: actor.id,
    },
    { onConflict: "slug" },
  );
  if (error) return { ok: false, error: "Could not save the page." };

  revalidatePath(`/${slug}`);
  revalidatePath("/admin/pages");
  return { ok: true, message: "Page saved — it is live now." };
}

/** Throw away the edited version: the built-in text shows again. */
export async function resetContentPage(slug: string): Promise<PageSaveState> {
  await requirePermission("settings");
  const db = createAdminClient();
  const { error } = await db.from("content_pages").delete().eq("slug", slug);
  if (error) return { ok: false, error: "Could not reset the page." };
  revalidatePath(`/${slug}`);
  revalidatePath("/admin/pages");
  return { ok: true, message: "Back to the built-in text." };
}
