"""
Seed brand logos and descriptions.

    py scripts/seed-brands.py          # fill brands that have no logo / description
    py scripts/seed-brands.py --dry    # show what would change

Every brand needs a picture for the homepage "Our brands" row and the brand
pages, and the catalogue import left all of them without one. This draws a
clean wordmark for each (the brand's name in its colour, transparent
background), uploads it to the product-images bucket under brands/seed/, and
writes a short description.

It ONLY fills gaps: a brand that already has a logo or a description keeps
it, so running this after the admin has uploaded real logos changes nothing.
Official logos can replace these any time from admin → Brands.
"""
import io
import json
import os
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry" in sys.argv

env = {}
for name in (".env.local", ".env"):
    path = os.path.join(ROOT, name)
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"'))

URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

# slug → (wordmark colour, description). Descriptions stick to what each
# maker is broadly known for; the shop can rewrite them in admin → Brands.
BRANDS = {
    "anker": ("#00A0E9", "Anker makes charging gear people rely on every day: power banks, fast wall chargers and durable cables.\n\nIts GaN chargers pack laptop-level power into a pocket-sized plug, and its power banks are a staple for long days away from a socket."),
    "baseus": ("#1A1A1A", "Baseus designs everyday accessories for phones, laptops and cars: chargers, cables, power banks, car mounts and hubs.\n\nClean design at a sensible price is what the brand is known for."),
    "edifier": ("#111111", "Edifier has been making speakers and headphones since 1996 — from bookshelf speakers to noise-cancelling headphones.\n\nA favourite for people who want good sound without paying for a big name."),
    "fantech": ("#E4002B", "Fantech makes gaming gear for every budget: mechanical keyboards, mice, headsets and mouse pads.\n\nSolid build, RGB lighting and prices that let you upgrade your whole setup."),
    "havit": ("#D7141A", "Havit makes consumer electronics and gaming accessories: earbuds, headsets, keyboards, mice and speakers.\n\nPractical, well-priced gear for work, study and play."),
    "jbl": ("#FF5A00", "JBL has been an audio name since 1946, known for powerful portable speakers and headphones with its signature bass.\n\nFrom pocket speakers to over-ear headphones, built to be taken everywhere."),
    "joyroom": ("#E60012", "Joyroom makes mobile accessories: cables, chargers, earbuds, car mounts and phone holders.\n\nEveryday essentials that keep your phone powered and in reach."),
    "logitech": ("#00B8FC", "Logitech has made mice, keyboards and webcams since 1981, for offices, studios and gaming setups alike.\n\nComfortable, reliable peripherals that simply work."),
    "remax": ("#1A1A1A", "Remax makes mobile accessories: power banks, earphones, chargers and cables.\n\nAffordable gear for the phone in your pocket."),
    "soundcore": ("#00A7E1", "Soundcore is Anker's audio brand: true wireless earbuds, headphones and Bluetooth speakers.\n\nKnown for strong battery life and sound tuned for everyday listening."),
    "tronsmart": ("#1A1A1A", "Tronsmart makes Bluetooth speakers and wireless earbuds with big sound for their size.\n\nOutdoor-ready speakers and earbuds at friendly prices."),
    "ugreen": ("#1FB25A", "UGREEN makes connectivity gear: USB-C cables, chargers, hubs and adapters.\n\nThe small parts that connect everything else — built to last."),
    "walton": ("#E31E24", "Walton is a Bangladeshi electronics and appliance brand, making everything from televisions and fridges to phones and accessories.\n\nMade for Bangladeshi homes, with local service."),
    "wiwu": ("#1A1A1A", "WiWU makes accessories for phones and laptops: bags, sleeves, hubs, stands and cases.\n\nNeat, practical designs for work on the move."),
    "xiaomi": ("#FF6900", "Xiaomi makes smartphones, wearables, power banks and smart-home devices, all designed to work together.\n\nFeature-packed technology at honest prices."),
    "yeelight": ("#1A1A1A", "Yeelight makes smart lighting: LED bulbs, light strips and lamps you control from your phone or by voice.\n\nMillions of colours and scenes for every room."),
}

FONT = next(
    (p for p in (r"C:\Windows\Fonts\seguibl.ttf", r"C:\Windows\Fonts\arialbd.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf") if os.path.exists(p)),
    None,
)
if not FONT:
    sys.exit("No bold font found to draw the wordmarks.")


def wordmark(name: str, colour: str) -> bytes:
    """The name centred on a transparent 900x360 canvas, as WebP."""
    w, h = 900, 360
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    size = 200
    while size > 20:
        font = ImageFont.truetype(FONT, size)
        box = draw.textbbox((0, 0), name, font=font)
        if box[2] - box[0] <= w * 0.82 and box[3] - box[1] <= h * 0.55:
            break
        size -= 4
    box = draw.textbbox((0, 0), name, font=font)
    x = (w - (box[2] - box[0])) / 2 - box[0]
    y = (h - (box[3] - box[1])) / 2 - box[1]
    draw.text((x, y), name, font=font, fill=colour)
    out = io.BytesIO()
    img.save(out, "WEBP", quality=90)
    return out.getvalue()


def call(method: str, path: str, body=None, headers=None):
    # Three tries with a timeout: a slow link once left an upload hanging.
    # Every write here is idempotent (upsert / fill-if-empty), so a retry is safe.
    for attempt in range(3):
        req = urllib.request.Request(
            f"{URL}{path}",
            data=body,
            method=method,
            headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", **(headers or {})},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                text = res.read().decode("utf-8")
                return json.loads(text) if text else None
        except (TimeoutError, OSError):
            if attempt == 2:
                raise
            print(f"    retrying {method} {path.split('?')[0]}")


brands = call("GET", "/rest/v1/brands?select=id,name,slug,logo_url,description&order=name")
for b in brands:
    colour, description = BRANDS.get(b["slug"], ("#1A1A1A", None))
    patch = {}

    if not b["logo_url"]:
        path = f"brands/seed/{b['slug']}.webp"
        if not DRY:
            call("POST", f"/storage/v1/object/product-images/{path}", wordmark(b["name"], colour),
                 {"Content-Type": "image/webp", "x-upsert": "true", "cache-control": "max-age=31536000"})
        patch["logo_url"] = f"{URL}/storage/v1/object/public/product-images/{path}"

    if not b["description"] and description:
        patch["description"] = description

    if not patch:
        print(f"  {b['name']:<12} already has a logo and description — left alone")
        continue
    print(f"  {b['name']:<12} + {', '.join(patch)}")
    if not DRY:
        call("PATCH", f"/rest/v1/brands?id=eq.{b['id']}", json.dumps(patch).encode(),
             {"Content-Type": "application/json", "Prefer": "return=minimal"})

print("dry run — nothing written" if DRY else "done")
