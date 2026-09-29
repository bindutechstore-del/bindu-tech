import type { Metadata, Viewport } from "next";
import {
  Sora,
  Plus_Jakarta_Sans,
  Hind_Siliguri,
  Inter,
  Outfit,
  Space_Grotesk,
  Manrope,
} from "next/font/google";
import { getSiteTheme } from "@/lib/queries/theme";
import { themeToCss } from "@/lib/theme/schema";
import { Toaster } from "sonner";
import { getStoreSettings } from "@/lib/queries/settings";
import "./globals.css";
import { siteUrl } from "@/lib/utils/site-url";
import { SITE_KEYWORDS } from "@/lib/seo";

/**
 * Three faces, each with a job.
 *
 * Sora is the display face — geometric, slightly technical, and it gives
 * headings and prices a character Inter deliberately does not have. Plus
 * Jakarta Sans carries body and UI: humanist enough to stay readable at 11px
 * in a spec table, warmer than Inter at large sizes.
 *
 * Hind Siliguri is the Bengali face, and it is not optional. The Latin faces
 * have no Bengali glyphs, so a promo tile written in Bangla would fall back to
 * whatever the device happens to have — often nothing, which renders as tofu
 * boxes. It is designed for Devanagari-family UI rather than adapted from a
 * print face, so it holds up next to Jakarta at small sizes.
 *
 * All three are self-hosted and subset by next/font, so this costs no
 * render-blocking request to Google and no layout shift.
 */
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--f-sora",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--f-jakarta",
  display: "swap",
});

/*
 * The other four are declared so /admin/design can switch to them, but with
 * `preload: false`. next/font preloads every declared family by default, which
 * would make a store using two of these download six. Without the preload hint
 * the browser fetches a face only when rendered text actually asks for it, so
 * the unchosen ones cost a few lines of CSS and no bytes over the wire.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--f-inter",
  display: "swap",
  preload: false,
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--f-outfit",
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-space",
  display: "swap",
  preload: false,
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--f-manrope",
  display: "swap",
  preload: false,
});

/**
 * Bengali is not a choice, and is not optional.
 *
 * None of the Latin faces carry Bengali glyphs, so a promo tile written in
 * Bangla would fall back to whatever the device happens to have — often
 * nothing, which renders as tofu boxes. Hind Siliguri sits at the end of every
 * stack below and the browser reaches it only for codepoints the chosen Latin
 * face cannot draw.
 */
const bengali = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
  // Not preloaded: four files (~130 KB) that most pages never use. The
  // unicode-range in its @font-face means the browser fetches it the moment
  // Bengali text is on screen, and never otherwise — preloading it made every
  // page download it first and pushed the hero image back by ~0.7 s on 4G.
  preload: false,
});

const FONT_VARS: Record<string, string> = {
  sora: "var(--f-sora)",
  jakarta: "var(--f-jakarta)",
  inter: "var(--f-inter)",
  outfit: "var(--f-outfit)",
  space: "var(--f-space)",
  manrope: "var(--f-manrope)",
};

const ALL_FONT_CLASSES = [
  sora.variable,
  jakarta.variable,
  inter.variable,
  outfit.variable,
  spaceGrotesk.variable,
  manrope.variable,
  bengali.variable,
].join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStoreSettings();
  const site = siteUrl();

  // The store name leads the home title and ends every other one, so the
  // brand keyword is in every result Google shows.
  const homeTitle = `${s.store_name} — ${s.store_tagline}`;
  return {
    metadataBase: new URL(site),
    title: {
      default: homeTitle,
      template: `%s | ${s.store_name}`,
    },
    description: s.store_description,
    keywords: SITE_KEYWORDS,
    applicationName: s.store_name,
    publisher: s.store_name,
    creator: s.store_name,
    category: "technology",
    formatDetection: { telephone: false, address: false, email: false },
    openGraph: {
      type: "website",
      siteName: s.store_name,
      title: homeTitle,
      description: s.store_description,
      url: site,
      locale: "en_BD",
    },
    twitter: { card: "summary_large_image", title: homeTitle, description: s.store_description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    other: { "geo.region": "BD", "geo.placename": "Bangladesh" },
  };
}

export const viewport: Viewport = {
  themeColor: "#016952",
  width: "device-width",
  initialScale: 1,
};

/**
 * Async, because the theme comes from the database.
 *
 * The stored tokens are emitted as one inline `:root` block in the head. It
 * has to be inline rather than a stylesheet: an extra request here would mean
 * the first paint used the compiled-in colours and then visibly repainted in
 * the operator's.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getSiteTheme();

  const bodyStack = `${FONT_VARS[theme.bodyFont]}, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, var(--font-bengali), "Hind Siliguri", sans-serif`;
  const headingStack = `${FONT_VARS[theme.headingFont]}, ${bodyStack}`;

  return (
    <html lang="en" className={ALL_FONT_CLASSES}>
      <head>
        <style
          // Values are validated in sanitiseTheme — colours must match
          // /^#[0-9a-f]{6}$/ and the font ids are looked up in a fixed map, so
          // nothing user-supplied reaches this string verbatim.
          dangerouslySetInnerHTML={{
            __html: `${themeToCss(theme)}:root{--font-sans:${bodyStack};--font-heading:${headingStack};}`,
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster
          position="bottom-right"
          // Clear of the phone navbar (fixed, ~56px): a toast sitting on it
          // swallowed taps on Cart and Menu for four seconds.
          offset={{ bottom: 80, right: 24 }}
          mobileOffset={{ bottom: 80 }}
          toastOptions={{ style: { fontFamily: "var(--font-sans)" } }}
        />
      </body>
    </html>
  );
}
