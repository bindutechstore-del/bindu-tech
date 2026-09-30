import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing here is secret — RLS handles that — but a crawler indexing a
      // checkout page or an admin route is pure waste.
      disallow: ["/admin", "/account", "/checkout", "/cart", "/api/", "/order/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
