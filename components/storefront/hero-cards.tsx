import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroRail } from "./hero-rail";
import type { Banner } from "@/types/database";

/**
 * The hero: a row of tall campaign cards the shopper scrolls by hand.
 *
 * The card is a fixed 9:16 portrait at every breakpoint — that ratio is the
 * whole look, so it does not change between phone and desktop. Only how many
 * fit on screen changes: exactly two on a phone, four or five on a monitor.
 *
 * On a phone the two cards fill the row exactly, with no sliver of a third.
 * From `sm:` up the widths go back to leaving the next card partly visible,
 * which is the affordance that tells a mouse user the row scrolls at all.
 *
 * Content comes from `banners` — artwork, Bangla headline, caption, link and
 * accent colour are all editable at /admin/banners with no deploy. Two cards is
 * the practical minimum for the layout to read as a set; the seed ships seven.
 */
export function HeroCards({
  banners,
  heading,
}: {
  banners: Banner[];
  heading: string;
}) {
  if (banners.length === 0) return null;

  return (
    <section className="bg-surface-sunken py-2 sm:py-3" aria-label="Featured collections">
      {/*
        The cards deliberately carry no visible page heading, so the document
        still needs one for search engines and screen readers.
      */}
      <h1 className="sr-only">{heading}</h1>

      <div className="mx-auto max-w-7xl">
        {/*
          scroll-pl matches the horizontal padding. Without it `scroll-snap-align:
          start` snaps to the scroll-port edge and ignores the padding, which
          drags the first card flush against the screen edge on load.
        */}
        <HeroRail>
          {banners.map((b, i) => (
            <li
              key={b.id}
              // Phone: exactly two cards, nothing of a third.
              //
              // A flex-basis percentage resolves against the container's
              // CONTENT box, so subtracting the one 0.5rem gap between the
              // pair and halving it lands the second card's right edge exactly
              // on the content edge. That alone still leaks a sliver, because
              // the rail's own px-2 padding is *inside* the scrollport and the
              // third card starts one gap later — visible unless the gap is at
              // least as wide as that padding. gap-2 matching px-2 is what
              // pushes the third card to precisely the scrollport edge.
              //
              // From sm: up the widths go back to showing a sliver of the next
              // card, which is the only cue that the row scrolls.
              //
              // `snap-always` (scroll-snap-stop: always) covers wheel and
              // keyboard scrolling. It is NOT what bounds a touch swipe to one
              // card — real flings sailed straight past it; HeroRail does that.
              className="
                flex-none snap-always
                basis-[calc((100%-0.5rem)/2)]
                sm:basis-[38%] md:basis-[31%]
                lg:basis-[23.5%] xl:basis-[19.5%]
              "
            >
              <CampaignCard banner={b} priority={i < 3} />
            </li>
          ))}
        </HeroRail>
      </div>
    </section>
  );
}

function CampaignCard({
  banner: b,
  priority = false,
}: {
  banner: Banner;
  priority?: boolean;
}) {
  const accent = b.accent_hex ?? "#016952";

  return (
    <Link
      href={b.cta_href ?? "/products"}
      className="
        group relative block aspect-[9/16] w-full overflow-hidden rounded-xl
        bg-ink ring-1 ring-ink/5 transition-shadow duration-300
        hover:shadow-pop focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-brand-600 focus-visible:ring-offset-2
      "
    >
      {b.image_url ? (
        <Image
          src={b.image_url}
          alt=""
          fill
          sizes="(min-width: 1280px) 250px, (min-width: 1024px) 300px, (min-width: 768px) 31vw, (min-width: 640px) 38vw, 50vw"
          priority={priority}
          className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
        />
      ) : null}

      {/*
        Four passes, each doing one job:
          1. an accent wash that ties mismatched photographs into one set;
          2. a TOP scrim, because the Bangla headline is white and half these
             photographs are pale products on pale backgrounds — a drop shadow
             alone does not survive a white keyboard;
          3. a deep bottom scrim carrying the caption block;
          4. a hairline inset so the card reads as an object rather than a hole
             punched in the page.
      */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(170deg, ${accent}6b 0%, ${accent}1f 42%, transparent 64%)`,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-ink/70 via-ink/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-ink via-ink/78 to-transparent" />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />

      {/* Bangla headline, burned over the artwork like the print campaigns. */}
      {b.eyebrow ? (
        <p
          className="
            absolute inset-x-0 top-[11%] px-3 text-center font-bold
            leading-[1.35] text-white
            drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]
            text-[15px] sm:text-lg lg:text-xl
          "
        >
          {b.eyebrow}
        </p>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
        <h2 className="text-base font-bold leading-tight tracking-tight text-white sm:text-lg lg:text-xl">
          {b.title}
        </h2>

        {b.subtitle ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-white/70 sm:text-xs lg:text-[13px]">
            {b.subtitle}
          </p>
        ) : null}

        <span className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white sm:text-[13px]">
          {b.cta_label ?? "Browse"}
          <ArrowRight
            size={14}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}
