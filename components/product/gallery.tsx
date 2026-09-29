"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Play } from "lucide-react";
import type { ProductImage } from "@/types/database";
import { cn } from "@/lib/utils/cn";

/**
 * Product gallery. The main image is `priority` because it is almost always the
 * LCP element on a PDP.
 */
export function Gallery({
  images,
  thumbnail,
  videoUrl,
  alt,
}: {
  images: ProductImage[];
  thumbnail: string | null;
  videoUrl: string | null;
  alt: string;
}) {
  // Thumbnail first, then gallery rows, de-duplicated.
  const urls = [
    ...(thumbnail ? [thumbnail] : []),
    ...images.map((i) => i.url),
  ].filter((u, i, arr) => arr.indexOf(u) === i);

  const [active, setActive] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  if (urls.length === 0 && !videoUrl) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-line bg-surface-sunken text-ink-faint">
        <ImageOff size={40} />
      </div>
    );
  }

  return (
    <div className="lg:sticky lg:top-32">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface">
        {showVideo && videoUrl ? (
          <iframe
            src={videoUrl}
            title={`${alt} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            allowFullScreen
            className="h-full w-full"
          />
        ) : urls[active] ? (
          <Image
            src={urls[active]!}
            alt={alt}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-contain"
          />
        ) : null}
      </div>

      {(urls.length > 1 || videoUrl) && (
        <div className="rail mt-3 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={url}
              onClick={() => {
                setActive(i);
                setShowVideo(false);
              }}
              aria-label={`View image ${i + 1}`}
              aria-current={!showVideo && i === active}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-surface transition-colors",
                !showVideo && i === active
                  ? "border-brand-600"
                  : "border-line hover:border-line-strong",
              )}
            >
              <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}

          {videoUrl ? (
            <button
              onClick={() => setShowVideo(true)}
              aria-label="Play product video"
              aria-current={showVideo}
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-lg border-2 bg-ink text-white transition-colors",
                showVideo ? "border-brand-600" : "border-line",
              )}
            >
              <Play size={20} fill="currentColor" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
