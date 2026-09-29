import type { StoreSettings } from "@/lib/queries/settings";
import { siteUrl } from "@/lib/utils/site-url";

/**
 * Search-engine helpers: the keyword list, description trimming and the
 * schema.org objects Google reads (organisation, site search box,
 * breadcrumbs). Page-specific JSON-LD (Product) stays with its page.
 *
 * "Bindu Tech" is the primary keyword, so the store name leads every title
 * and the organisation carries the spellings people actually type.
 */

/** Other ways people write the name — searched as-is, so all are declared. */
export const NAME_VARIANTS = ["BinduTech", "Bindu Tech BD", "bindu.tech", "বিন্দু টেক"];

/** The shop-level keywords: brand first, then what Bangladeshi shoppers search for. */
export const SITE_KEYWORDS = [
  "Bindu Tech",
  ...NAME_VARIANTS,
  "gadget shop in Bangladesh",
  "online gadget shop BD",
  "electronics shop in Bangladesh",
  "tech shop in Dhaka",
  "buy gadgets online in Bangladesh",
  "gadget price in Bangladesh",
  "charger price in Bangladesh",
  "power bank price in Bangladesh",
  "headphone and earphone price in Bangladesh",
  "smart watch price in Bangladesh",
  "keyboard and mouse price in BD",
  "UPS for PC price in Bangladesh",
  "monitor price in BD",
  "smart home gadgets Bangladesh",
  "mobile accessories Bangladesh",
  "tech accessories Bangladesh",
  "cash on delivery Bangladesh",
];

/** A meta description: whitespace collapsed, cut on a word near `max` characters. */
export function metaDescription(text: string | null | undefined, max = 158): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/** An absolute URL on this site. */
export function absoluteUrl(path = "/"): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

const ORG_ID = () => absoluteUrl("/#organization");

/**
 * The shop as an organisation. OnlineStore is the most specific type Google
 * accepts for this; it is what lets the name, logo and contact details show
 * beside the site in results.
 */
export function organizationJsonLd(s: StoreSettings) {
  const phone = s.support_phone?.trim();
  const email = s.support_email?.includes("@") ? s.support_email.trim() : undefined;
  const sameAs = Object.values(s.social_links ?? {}).filter(
    (u): u is string => typeof u === "string" && /^https:\/\//.test(u),
  );
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": ORG_ID(),
    name: s.store_name,
    alternateName: NAME_VARIANTS,
    url: absoluteUrl("/"),
    logo: s.logo_url || absoluteUrl("/icon-512.png"),
    image: absoluteUrl("/opengraph-image"),
    description: s.store_description,
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    address: {
      "@type": "PostalAddress",
      ...(s.showroom_address?.trim() ? { addressRegion: s.showroom_address.trim() } : {}),
      addressCountry: "BD",
    },
    areaServed: { "@type": "Country", name: "Bangladesh" },
    currenciesAccepted: "BDT",
    paymentAccepted: "Cash on delivery, bKash, Nagad",
    ...(phone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            telephone: phone,
            areaServed: "BD",
            availableLanguage: ["English", "Bengali"],
          },
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/**
 * The site itself, with the search action that lets Google offer a search
 * box for the shop, and the name Google should show as the site name.
 */
export function websiteJsonLd(s: StoreSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: absoluteUrl("/"),
    name: s.store_name,
    alternateName: NAME_VARIANTS,
    inLanguage: "en-BD",
    publisher: { "@id": ORG_ID() },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/products")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Breadcrumb trail; the last item is the current page. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
