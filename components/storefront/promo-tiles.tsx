import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Banner } from "@/types/database";

/**
 * Tall image tiles with the headline burned into the artwork and a caption
 * block underneath — the format Bangladeshi electronics retailers use for
 * seasonal pushes.
 *
 * Driven by `banners` rows with placement = 'category_tile', so the whole rail
 * is admin-editable: artwork, Bangla headline, caption, link and accent colour.
 *
 * The headline (`eyebrow`) is expected to be Bangla. It is set in the Bengali
 * face automatically — see the two-family font stack in globals.css.
 */
export function PromoTiles({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:gap-4">
      {banners.map((b, i) => {
        const accent = b.accent_hex ?? "#016952";

        return (
          <Link
            key={b.id}
            href={b.cta_href ?? "/products"}
            className="group relative aspect-[3/4] w-56 shrink-0 overflow-hidden rounded-2xl bg-ink sm:w-64 lg:w-72"
          >
            {b.image_url ? (
              <Image
                src={b.image_url}
                alt=""
                fill
                // Four tiles are visible at desktop width, one and a bit on a phone.
                sizes="(min-width: 1024px) 288px, (min-width: 640px) 256px, 224px"
                loading={i < 2 ? "eager" : "lazy"}
                fetchPriority={i < 2 ? "high" : "auto"}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}

            {/*
              Two overlays: a brand wash that keeps the tiles reading as one set
              even when the photographs disagree, and a bottom scrim that earns
              the caption its contrast without dimming the subject's face.
            */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, ${accent}59 0%, ${accent}14 42%, transparent 62%)`,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/90 via-ink/55 to-transparent" />

            {b.eyebrow ? (
              <p className="absolute inset-x-0 top-0 px-4 pt-4 text-center text-[19px] font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-[21px]">
                {b.eyebrow}
              </p>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="text-base font-bold leading-tight text-white sm:text-lg">
                {b.title}
              </h3>
              {b.subtitle ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-white/75">
                  {b.subtitle}
                </p>
              ) : null}
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white">
                {b.cta_label ?? "Discover"}
                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
