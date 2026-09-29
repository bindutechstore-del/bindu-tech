"use client";

import { useState } from "react";

/** Text shown to four lines with a "Read more" toggle when it is longer. */
export function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  // Short enough to fit in four lines on a phone: no toggle at all.
  const long = text.length > 220;

  return (
    <div>
      <p
        className={`whitespace-pre-line text-[15px] leading-7 text-ink-soft ${
          long && !open ? "line-clamp-4" : ""
        }`}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-sm font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
          aria-expanded={open}
        >
          {open ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
