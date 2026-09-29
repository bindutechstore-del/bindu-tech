import type { MetadataRoute } from "next";
import { getStoreSettings } from "@/lib/queries/settings";

/** Web app manifest: name, colours and icons for "Add to home screen". */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getStoreSettings();
  return {
    name: `${s.store_name} — ${s.store_tagline}`,
    short_name: s.store_name,
    description: s.store_description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#016952",
    lang: "en-BD",
    categories: ["shopping", "technology"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
