import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The picture Facebook, WhatsApp, Messenger and X show when a Bindu Tech link
 * is shared. Pages with their own picture (a product) override it; every
 * other page inherits this one. Built once at deploy time.
 */
export const alt = "Bindu Tech — Gadget & Electronics Shop in Bangladesh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const mark = await readFile(join(process.cwd(), "public/icon-192.png"), "base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #016952 0%, #01402f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${mark}`}
            width={132}
            height={132}
            alt=""
            style={{ borderRadius: 28, background: "#ffffff", padding: 10 }}
          />
          <div style={{ display: "flex", fontSize: 104, fontWeight: 800, letterSpacing: -2 }}>
            Bindu Tech
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>
            Gadget &amp; Electronics Shop in Bangladesh
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#bfe6da" }}>
            Chargers · Power banks · Earbuds · Smart watches · Accessories
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: "#e7f4f0" }}>
          <span>bindu.tech</span>
          <span>Cash on delivery · Nationwide delivery</span>
        </div>
      </div>
    ),
    size,
  );
}
