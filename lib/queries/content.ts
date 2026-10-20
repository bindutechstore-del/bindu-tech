import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { sanitiseBlocks, type PageContent } from "@/lib/content/blocks";

/**
 * The shop owner's own version of an information page (admin → Pages), or
 * null when the built-in text in lib/content/pages.ts still applies.
 * Cached per request: metadata and the page both ask.
 */
export const getPageOverride = cache(async (slug: string): Promise<PageContent | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_pages")
    .select("title, subtitle, description, banner_color, boxed, blocks")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    title: string;
    subtitle: string | null;
    description: string | null;
    banner_color: string | null;
    boxed: boolean | null;
    blocks: unknown;
  };
  return {
    title: row.title,
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    bannerColor: row.banner_color ?? "",
    boxed: Boolean(row.boxed),
    blocks: sanitiseBlocks(row.blocks),
  };
});
