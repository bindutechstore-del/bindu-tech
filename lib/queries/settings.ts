import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HIGHLIGHTS,
  sanitiseHighlights,
  type HomeHighlight,
} from "@/lib/content/highlights";

/**
 * Public store configuration, seeded by migration 0013 and editable at
 * /admin/settings.
 *
 * RLS only exposes rows with `is_public`, so this is safe to call from any
 * storefront component. Nothing here is hardcoded in React — that is the whole
 * point of the settings table.
 */

export interface StoreSettings {
  store_name: string;
  /** The shop's logo, shown in the header instead of the name (admin → Settings). */
  logo_url: string;
  store_tagline: string;
  store_description: string;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  support_hours: string;
  showroom_address: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    /** Facebook page username, for m.me/<username> links. */
    messenger?: string;
  };
  currency: { code: string; symbol: string; locale: string };
  cod_advance_threshold_paisa: number;
  return_window_days: number;
  warranty_note: string;
  low_stock_banner_threshold: number;
  /** The "Buying from <store>" cards on the homepage. */
  home_highlights: HomeHighlight[];
  /** The homepage Delivery card. Empty = written from the delivery zones. */
  home_delivery_note: string;
}

/** Used when the settings row is missing so the UI still renders sensibly. */
const FALLBACK: StoreSettings = {
  store_name: "Nazmul",
  logo_url: "",
  store_tagline: "Electronics, honestly priced.",
  store_description:
    "Nazmul is a Dhaka-based electronics retailer delivering nationwide.",
  support_phone: "+8801812345678",
  support_whatsapp: "+8801812345678",
  support_email: "support@nazmul.com.bd",
  support_hours: "Saturday–Thursday, 10:00–20:00",
  showroom_address: "Panthapath, Dhaka",
  social_links: {},
  currency: { code: "BDT", symbol: "৳", locale: "en-BD" },
  cod_advance_threshold_paisa: 5_000_000,
  return_window_days: 7,
  warranty_note: "",
  low_stock_banner_threshold: 5,
  home_highlights: DEFAULT_HIGHLIGHTS,
  home_delivery_note: "",
};

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value");

  const rows = (data as { key: string; value: unknown }[] | null) ?? [];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const merged = { ...FALLBACK, ...map } as StoreSettings;

  // Coerce every field to the type the storefront assumes. A phone saved as
  // a number by an older admin form, or a null, would otherwise crash every
  // page at `.replace()` / `.includes()` in the header, footer or chat bubble.
  const loose = merged as unknown as Record<string, unknown>;
  for (const [key, fallback] of Object.entries(FALLBACK)) {
    const value = loose[key];
    if (typeof fallback === "string" && typeof value !== "string") {
      loose[key] = value == null ? fallback : String(value);
    } else if (typeof fallback === "number" && typeof value !== "number") {
      const n = Number(value);
      loose[key] = Number.isFinite(n) ? n : fallback;
    }
  }
  // Admin-entered structure: never trust its shape at render time.
  merged.home_highlights = sanitiseHighlights(merged.home_highlights);
  merged.social_links =
    merged.social_links && typeof merged.social_links === "object" ? merged.social_links : {};
  return merged;
});

export const getDeliveryZones = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("is_active", true)
    .order("position");
  return data ?? [];
});
