/**
 * Catalog seed data — the single source of truth for demo content.
 *
 * Schema and store configuration live in supabase/migrations/*.sql. This file
 * is CONTENT: categories, brands and products an operator is expected to
 * replace with their own via /admin. It is applied by scripts/seed-catalog.mjs
 * through PostgREST with the service-role key, because catalog rows are data,
 * not DDL.
 *
 * Every price is integer paisa (1 BDT = 100 paisa) — matching the database.
 * Prices reflect what these products actually retail for in Dhaka in 2026.
 */

const img = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/**
 * Photographs uploaded to our own `product-images` bucket by
 * scripts/upload-seed-images.mjs. Used where no correct stock photo was
 * available. They are lower resolution than the stock imagery and are meant to
 * be replaced with real product photography from /admin before launch.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://padfvqjdmtcmowajqrhu.supabase.co";
const local = (name) =>
  `${SUPABASE_URL}/storage/v1/object/public/product-images/seed/${name}.jpg`;

export const CATEGORIES = [
  {
    slug: "best-sellers",
    name: "Best Sellers",
    icon: "TrendingUp",
    description:
      "What Nazmul customers buy most, refreshed as the numbers move.",
    position: 1,
    is_featured: true,
  },
  {
    slug: "deals-of-the-day",
    name: "Deals of the Day",
    icon: "Percent",
    description:
      "Today's markdowns. Prices return to normal at midnight.",
    position: 2,
    is_featured: true,
  },
  {
    slug: "ups-for-pc",
    name: "UPS For PC",
    icon: "BatteryCharging",
    description:
      "Desktop UPS units that keep a PC alive through a load-shedding cut.",
    position: 3,
    is_featured: true,
  },
  {
    slug: "toy-car",
    name: "Toy car",
    icon: "Car",
    description:
      "Remote-control and die-cast cars for younger buyers.",
    position: 4,
    is_featured: false,
  },
  {
    slug: "summer-sale",
    name: "Summer Sale",
    icon: "Sun",
    description:
      "Seasonal clearance across fans, coolers and cooling gear.",
    position: 5,
    is_featured: true,
  },
  {
    slug: "smart-ring",
    name: "Smart Ring",
    icon: "CircleDot",
    description:
      "Fitness and sleep tracking without a watch on your wrist.",
    position: 6,
    is_featured: false,
  },
  {
    slug: "presentation-clicker",
    name: "Presentation Clicker",
    icon: "Presentation",
    description:
      "Wireless presenters with laser pointers and slide control.",
    position: 7,
    is_featured: false,
  },
  {
    slug: "powerstrip",
    name: "Powerstrip",
    icon: "PlugZap",
    description:
      "Multi-plug extensions with surge protection and USB ports.",
    position: 8,
    is_featured: false,
  },
  {
    slug: "pc-cooler-and-fan",
    name: "PC Cooler and Fan",
    icon: "Fan",
    description:
      "CPU coolers, case fans and laptop cooling pads.",
    position: 9,
    is_featured: false,
  },
  {
    slug: "pendrive-flash-drive",
    name: "Pendrive / Flash Drive",
    icon: "Usb",
    description:
      "USB 2.0, 3.0 and Type-C flash storage.",
    position: 10,
    is_featured: false,
  },
  {
    slug: "monitor",
    name: "Monitor",
    icon: "Monitor",
    description:
      "IPS, VA and gaming panels from 19 to 32 inches.",
    position: 11,
    is_featured: true,
  },
  {
    slug: "mousepad",
    name: "Mousepad",
    icon: "Mouse",
    description:
      "Cloth, hard and extended RGB desk mats.",
    position: 12,
    is_featured: false,
  },
  {
    slug: "location-tracker",
    name: "Location Tracker",
    icon: "MapPin",
    description:
      "GPS and Bluetooth trackers for keys, bags and vehicles.",
    position: 13,
    is_featured: false,
  },
  {
    slug: "mixer",
    name: "Mixer",
    icon: "Blend",
    description:
      "Blenders, grinders and kitchen mixers.",
    position: 14,
    is_featured: false,
  },
  {
    slug: "humidifier",
    name: "Humidifier",
    icon: "Droplets",
    description:
      "Cool-mist humidifiers and aroma diffusers.",
    position: 15,
    is_featured: false,
  },
  {
    slug: "ips",
    name: "IPS",
    icon: "Zap",
    description:
      "Instant power supply units for home and small office.",
    position: 16,
    is_featured: true,
  },
  {
    slug: "hair-dryer",
    name: "Hair Dryer",
    icon: "Wind",
    description:
      "Ionic and travel dryers with cool-shot settings.",
    position: 17,
    is_featured: false,
  },
  {
    slug: "hubs-and-docks",
    name: "Hubs & Docks",
    icon: "Cable",
    description:
      "USB-C hubs and docking stations for laptops.",
    position: 18,
    is_featured: false,
  },
  {
    slug: "electric-iron-and-steamer",
    name: "Electric Iron & Steamer",
    icon: "Shirt",
    description:
      "Dry irons, steam irons and handheld garment steamers.",
    position: 19,
    is_featured: false,
  },
  {
    slug: "gamepad",
    name: "Gamepad",
    icon: "Gamepad2",
    description:
      "Wired and wireless controllers for PC and console.",
    position: 20,
    is_featured: true,
  },
  {
    slug: "arm-stand",
    name: "Arm Stand",
    icon: "LampDesk",
    description:
      "Monitor arms, laptop risers and phone stands.",
    position: 21,
    is_featured: false,
  },
  {
    slug: "card-reader",
    name: "Card Reader",
    icon: "MemoryStick",
    description:
      "SD, microSD and multi-format readers.",
    position: 22,
    is_featured: false,
  },
  {
    slug: "smart-home-iot",
    name: "Smart Home IOT",
    icon: "Wifi",
    description:
      "Smart bulbs, plugs, cameras and sensors.",
    position: 23,
    is_featured: true,
  },
  {
    slug: "adapter",
    name: "Adapter",
    icon: "Plug",
    description:
      "Chargers, power adapters and conversion plugs.",
    position: 24,
    is_featured: false,
  },
  {
    slug: "personal-care",
    name: "Personal Care",
    icon: "Sparkles",
    description:
      "Trimmers, shavers and everyday grooming tools.",
    position: 25,
    is_featured: false,
  },
  {
    slug: "kitchen-and-home-appliances",
    name: "Kitchen and Home Appliances",
    icon: "CookingPot",
    description:
      "Small appliances for the kitchen and around the house.",
    position: 26,
    is_featured: false,
  },
  {
    slug: "keyboard-and-mouse",
    name: "Keyboard & Mouse",
    icon: "Keyboard",
    description:
      "Mechanical and membrane keyboards, wired and wireless mice.",
    position: 27,
    is_featured: true,
  },
  {
    slug: "bags-and-accessories",
    name: "Bags and Accessories",
    icon: "Backpack",
    description:
      "Laptop bags, backpacks and carry cases.",
    position: 28,
    is_featured: false,
  },
  {
    slug: "consumer-electronics",
    name: "Consumer Electronics",
    icon: "Tv",
    description:
      "Everyday electronics that do not sit in a narrower aisle.",
    position: 29,
    is_featured: false,
  },
  {
    slug: "health-fashion-and-grooming",
    name: "Health, Fashion & Grooming",
    icon: "HeartPulse",
    description:
      "Health monitors, grooming kits and fashion accessories.",
    position: 30,
    is_featured: false,
  },
  {
    slug: "watches-collection",
    name: "Watches Collection",
    icon: "Watch",
    description:
      "Smartwatches and classic timepieces.",
    position: 31,
    is_featured: true,
  },
  {
    slug: "mobile-accessories",
    name: "Mobile Accessories",
    icon: "Smartphone",
    description:
      "Cases, glass protectors, holders, power banks and cables.",
    position: 32,
    is_featured: true,
  },
  {
    slug: "youtube-studio-gears",
    name: "YouTube Studio Gears",
    icon: "Video",
    description:
      "Ring lights, microphones, tripods and capture gear.",
    position: 33,
    is_featured: true,
  },
  {
    slug: "solar-and-wind-energy",
    name: "Solar and Wind Energy",
    icon: "Sunrise",
    description:
      "Solar panels, charge controllers and small wind kits.",
    position: 34,
    is_featured: false,
  },
  {
    slug: "office-supplies",
    name: "Office Supplies",
    icon: "Paperclip",
    description:
      "Stationery and desk essentials for the office.",
    position: 35,
    is_featured: false,
  },
  {
    slug: "headphone-and-earphone",
    name: "Headphone & Earphone",
    icon: "Headphones",
    description:
      "Earbuds, over-ear headphones and wired earphones.",
    position: 36,
    is_featured: true,
  },
  {
    slug: "computer-and-office",
    name: "Computer & Office",
    icon: "Laptop",
    description:
      "Laptops, desktops, printers and office computing.",
    position: 37,
    is_featured: true,
  },
];


export const BRANDS = [
  "Anker", "Baseus", "UGREEN", "Xiaomi", "Soundcore", "JBL", "Havit",
  "Joyroom", "Remax", "Awei", "Fantech", "A4Tech", "Edifier", "Tronsmart",
  "Yeelight", "Logitech", "Wiwu", "Realme",
].map((name) => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
}));

/**
 * Products.
 *
 * `stock` is the on-hand count; products with `variants` let the
 * sync_product_stock trigger derive it from the variant rows instead.
 */
export const PRODUCTS = [
  // ── Earbuds & Headphones ─────────────────────────────────────────────────
  {
    slug: "soundcore-p40i-tws",
    name: "Soundcore P40i True Wireless Earbuds",
    sku: "SC-P40I",
    brand: "soundcore",
    category: "headphone-and-earphone",
    price_paisa: 519000,
    compare_at_paisa: 650000,
    cost_paisa: 410000,
    stock: 42,
    is_featured: true,
    is_best_seller: true,
    short_description:
      "Hybrid ANC, 60-hour total playtime and a case that doubles as a phone stand.",
    description:
      "The P40i is the pair we recommend to anyone spending under six thousand taka. Hybrid active noise cancellation actually cuts bus and generator noise rather than just muffling it, and the 12mm drivers have enough low end for the bass-forward mixes most people listen to here.\n\nThe charging case props your phone up at a viewing angle, which sounds like a gimmick until you have used it on a long journey. IPX5 means sweat and Dhaka drizzle are both fine.",
    features: [
      "Hybrid ANC cuts up to 98% of ambient noise",
      "12 hours per bud, 60 hours with the case",
      "Case doubles as an adjustable phone stand",
      "IPX5 water resistant",
      "Bluetooth 5.3 with multi-point pairing",
    ],
    specifications: [
      { label: "Driver", value: "12mm dynamic" },
      { label: "Battery (buds)", value: "12 hours ANC off" },
      { label: "Battery (total)", value: "60 hours" },
      { label: "Bluetooth", value: "5.3" },
      { label: "Charging", value: "USB-C, 10 min = 5 hours" },
      { label: "Water resistance", value: "IPX5" },
    ],
    warranty: "1 year official warranty",
    images: ["1590658268037-6bf12165a8df", "1606220945770-b5b6c2c55bf1", "1572536147248-ac59a8abfa4b"],
    variants: [
      { name: "Black", sku: "SC-P40I-BK", stock: 18, attributes: { color: "Black" } },
      { name: "Navy", sku: "SC-P40I-NV", stock: 14, attributes: { color: "Navy" } },
      { name: "White", sku: "SC-P40I-WH", stock: 10, attributes: { color: "White" } },
    ],
  },
  {
    slug: "havit-tw945-earbuds",
    name: "Havit TW945 Wireless Earbuds",
    sku: "HV-TW945",
    brand: "havit",
    category: "headphone-and-earphone",
    price_paisa: 139000,
    compare_at_paisa: 180000,
    cost_paisa: 105000,
    stock: 88,
    is_best_seller: true,
    short_description: "The budget pair that keeps getting reordered — 30 hours and ENC calls.",
    description:
      "Under fifteen hundred taka, the TW945 is hard to argue with. Environmental noise cancellation on the mics means the person on the other end of the call can actually hear you on a rickshaw.",
    features: [
      "30 hours total playback",
      "ENC noise reduction on calls",
      "Touch controls",
      "Bluetooth 5.3",
    ],
    specifications: [
      { label: "Driver", value: "10mm" },
      { label: "Battery (total)", value: "30 hours" },
      { label: "Bluetooth", value: "5.3" },
      { label: "Charging", value: "USB-C" },
    ],
    warranty: "6 months warranty",
    images: ["1606400082777-ef05f3c5cde2", "1600294037681-c80b4cb5b434"],
  },
  {
    slug: "jbl-tune-520bt",
    name: "JBL Tune 520BT Wireless Headphones",
    sku: "JBL-T520",
    brand: "jbl",
    category: "headphone-and-earphone",
    price_paisa: 585000,
    compare_at_paisa: 690000,
    cost_paisa: 470000,
    stock: 24,
    is_featured: true,
    short_description: "57 hours of JBL Pure Bass on a single charge. Folds flat.",
    description:
      "On-ear, foldable, and genuinely 57 hours — we tested it. Pure Bass tuning is warm rather than clinical, which suits most listening.",
    features: ["57 hours battery", "JBL Pure Bass sound", "Foldable design", "Multi-point connection"],
    specifications: [
      { label: "Driver", value: "33mm" },
      { label: "Battery", value: "57 hours" },
      { label: "Fast charge", value: "5 min = 3 hours" },
      { label: "Weight", value: "160g" },
    ],
    warranty: "1 year official warranty",
    images: ["1583394838336-acd977736f90", "1484704849700-f032a568e944"],
    variants: [
      { name: "Black", sku: "JBL-T520-BK", stock: 12, attributes: { color: "Black" } },
      { name: "Blue", sku: "JBL-T520-BL", stock: 7, attributes: { color: "Blue" } },
      { name: "Purple", sku: "JBL-T520-PR", stock: 5, attributes: { color: "Purple" } },
    ],
  },
  {
    slug: "edifier-w820nb-plus",
    name: "Edifier W820NB Plus Hybrid ANC Headphones",
    sku: "ED-W820NB",
    brand: "edifier",
    category: "headphone-and-earphone",
    price_paisa: 649000,
    compare_at_paisa: 780000,
    cost_paisa: 520000,
    stock: 16,
    short_description: "49 dB hybrid ANC and LDAC hi-res audio for under seven thousand.",
    description:
      "LDAC support at this price is unusual. If you listen on a service that streams hi-res, this is the cheapest way to actually hear it.",
    features: ["49 dB hybrid ANC", "LDAC hi-res certified", "49 hours playback", "Fast charge"],
    specifications: [
      { label: "Driver", value: "40mm" },
      { label: "ANC depth", value: "49 dB" },
      { label: "Codecs", value: "LDAC, AAC, SBC" },
      { label: "Battery", value: "49 hours (ANC off)" },
    ],
    warranty: "1 year official warranty",
    images: ["1487215078519-e21cc028cb29", "1546435770-a3e426bf472b"],
  },

  // ── Power Bank ────────────────────────────────────────────────────────────
  {
    slug: "anker-powercore-20000-pd",
    name: "Anker PowerCore 20,000mAh 22.5W Power Bank",
    sku: "AK-PC20K",
    brand: "anker",
    category: "mobile-accessories",
    price_paisa: 429000,
    compare_at_paisa: 520000,
    cost_paisa: 340000,
    stock: 35,
    is_featured: true,
    is_best_seller: true,
    short_description:
      "Genuine 20,000mAh — charges an iPhone 15 nearly four times, a laptop once.",
    description:
      "The capacity printed on a cheap power bank and the capacity inside it are usually different numbers. Anker is one of the few brands where they match. 22.5W output means your phone actually fast-charges rather than trickling.",
    features: [
      "Genuine 20,000mAh cells",
      "22.5W USB-C PD in and out",
      "Charges three devices at once",
      "Recharges itself in 4.5 hours",
      "MultiProtect safety system",
    ],
    specifications: [
      { label: "Capacity", value: "20,000mAh / 74Wh" },
      { label: "Max output", value: "22.5W" },
      { label: "Ports", value: "1× USB-C, 2× USB-A" },
      { label: "Recharge time", value: "4.5 hours" },
      { label: "Weight", value: "343g" },
    ],
    warranty: "18 months official warranty",
    localImages: ["a74"],
  },
  {
    slug: "baseus-bipow-10000",
    name: "Baseus Bipow 10,000mAh 20W Power Bank",
    sku: "BS-BP10K",
    brand: "baseus",
    category: "mobile-accessories",
    price_paisa: 189000,
    compare_at_paisa: 245000,
    cost_paisa: 145000,
    stock: 62,
    is_best_seller: true,
    short_description: "Pocketable 10,000mAh with a built-in cable — nothing extra to carry.",
    description:
      "The built-in USB-C cable is the whole point: the one thing you always forget is the cable, and this one is attached.",
    features: ["Built-in USB-C cable", "20W PD fast charge", "Digital battery display", "Slim profile"],
    specifications: [
      { label: "Capacity", value: "10,000mAh" },
      { label: "Max output", value: "20W" },
      { label: "Ports", value: "USB-C (built-in cable), USB-C, USB-A" },
      { label: "Weight", value: "218g" },
    ],
    warranty: "1 year warranty",
    localImages: ["a74"],
  },
  {
    slug: "xiaomi-redmi-power-bank-20000",
    name: "Xiaomi Redmi 20,000mAh 18W Power Bank",
    sku: "XM-RB20K",
    brand: "xiaomi",
    category: "mobile-accessories",
    price_paisa: 259000,
    compare_at_paisa: 320000,
    cost_paisa: 205000,
    stock: 47,
    short_description: "The reliable workhorse. Two-way 18W charging, dual output.",
    description:
      "Not the fastest and not the lightest, but it has been the default recommendation in Bangladesh for years for good reason: it just keeps working.",
    features: ["18W two-way fast charge", "Dual USB-A output", "Low-power mode for earbuds", "12 layers of circuit protection"],
    specifications: [
      { label: "Capacity", value: "20,000mAh" },
      { label: "Max output", value: "18W" },
      { label: "Ports", value: "USB-C, Micro-USB, 2× USB-A" },
      { label: "Weight", value: "440g" },
    ],
    warranty: "6 months warranty",
    localImages: ["a74"],
  },

  // ── Mini UPS ──────────────────────────────────────────────────────────────
  {
    slug: "mini-ups-router-10400",
    name: "Mini UPS for Router & ONU — 10,400mAh",
    sku: "MU-10400",
    brand: "havit",
    category: "ups-for-pc",
    price_paisa: 289000,
    compare_at_paisa: 350000,
    cost_paisa: 220000,
    stock: 54,
    is_featured: true,
    is_best_seller: true,
    short_description:
      "Keeps your router and ONU online for 6–8 hours through a load-shedding cut.",
    description:
      "When the power goes, your broadband does not have to. This sits between the wall and your router, switches over in under 10 milliseconds — no dropped Zoom call — and runs a typical router-plus-ONU pair for six to eight hours.\n\nOutputs are 5V, 9V and 12V, which covers essentially every router and ONU sold in Bangladesh. Check the barrel size against the included tips before ordering.",
    features: [
      "6–8 hours of router + ONU backup",
      "Switchover in under 10ms — no dropped connection",
      "5V / 9V / 12V DC outputs",
      "Includes 4 barrel tips",
      "Overcharge and short-circuit protection",
    ],
    specifications: [
      { label: "Capacity", value: "10,400mAh / 38.5Wh" },
      { label: "Outputs", value: "5V 2A, 9V 1A, 12V 1A DC + USB 5V" },
      { label: "Switchover", value: "< 10ms" },
      { label: "Backup time", value: "6–8 hours (router + ONU)" },
      { label: "Recharge", value: "5–6 hours" },
    ],
    warranty: "1 year warranty",
    delivery_note: "Bulky item — charged at the standard zone rate.",
    localImages: ["a70"],
  },
  {
    slug: "mini-ups-15600-dc",
    name: "Mini UPS 15,600mAh with LCD Display",
    sku: "MU-15600",
    brand: "havit",
    category: "ups-for-pc",
    price_paisa: 419000,
    compare_at_paisa: 495000,
    cost_paisa: 330000,
    stock: 21,
    short_description: "Bigger pack, 10–12 hours, and an LCD that tells you what is left.",
    description:
      "The step up from the 10,400mAh unit. The LCD showing remaining percentage and load is genuinely useful during a long outage.",
    features: ["10–12 hours backup", "LCD load and charge display", "5V/9V/12V DC", "PoE output for some ONUs"],
    specifications: [
      { label: "Capacity", value: "15,600mAh / 57.7Wh" },
      { label: "Outputs", value: "5V, 9V, 12V DC + USB" },
      { label: "Display", value: "LCD percentage + load" },
      { label: "Backup time", value: "10–12 hours" },
    ],
    warranty: "1 year warranty",
    localImages: ["a70"],
  },

  // ── Projector ─────────────────────────────────────────────────────────────
  {
    slug: "wanbo-t2-max-projector",
    name: "Wanbo T2 Max Portable Projector — Native 1080p",
    sku: "WB-T2MAX",
    brand: "xiaomi",
    category: "consumer-electronics",
    price_paisa: 1890000,
    compare_at_paisa: 2250000,
    cost_paisa: 1550000,
    stock: 12,
    is_featured: true,
    short_description:
      "Native 1080p, auto keystone, and light enough to carry between rooms.",
    description:
      "Native 1080p matters — most projectors at this price are 720p panels upscaling a 1080p signal, and it shows on text. Auto keystone and auto focus mean setup is genuinely thirty seconds.\n\nBright enough for a curtained room, not for daylight. Pair it with a cheap 100-inch pull-down screen and you have a better picture than most televisions in this price band.",
    features: [
      "Native 1920×1080 resolution",
      "Auto keystone and auto focus",
      "Built-in dual speakers",
      "Screen mirroring from Android and iOS",
      "HDMI, USB and 3.5mm out",
    ],
    specifications: [
      { label: "Native resolution", value: "1920 × 1080" },
      { label: "Brightness", value: "450 ANSI lumens" },
      { label: "Projection size", value: "40–150 inches" },
      { label: "Throw ratio", value: "1.2:1" },
      { label: "Ports", value: "HDMI, USB-A, 3.5mm" },
      { label: "Weight", value: "1.2kg" },
    ],
    warranty: "1 year warranty",
    delivery_note: "Fragile — packed in a double box.",
    images: ["1478720568477-152d9b164e26"],
  },
  {
    slug: "portable-mini-projector-720p",
    name: "Mini LED Projector 720p — Home & Outdoor",
    sku: "PJ-M720",
    brand: "havit",
    category: "consumer-electronics",
    price_paisa: 745000,
    compare_at_paisa: 950000,
    cost_paisa: 600000,
    stock: 18,
    short_description: "A first projector that will not disappoint. 720p native, 100-inch picture.",
    description:
      "Good for films and football in a dark room. Do not expect to read a spreadsheet on it.",
    features: ["1280×720 native", "Up to 100-inch picture", "HDMI + USB + AV", "Built-in speaker"],
    specifications: [
      { label: "Native resolution", value: "1280 × 720" },
      { label: "Brightness", value: "220 ANSI lumens" },
      { label: "Projection size", value: "32–100 inches" },
      { label: "Lamp life", value: "50,000 hours" },
    ],
    warranty: "6 months warranty",
    images: ["1478720568477-152d9b164e26"],
  },

  // ── Lighting ──────────────────────────────────────────────────────────────
  {
    slug: "yeelight-smart-bulb-w4",
    name: "Yeelight Smart LED Bulb W4 — 16M Colours",
    sku: "YL-W4",
    brand: "yeelight",
    category: "smart-home-iot",
    price_paisa: 129000,
    compare_at_paisa: 165000,
    cost_paisa: 98000,
    stock: 76,
    is_best_seller: true,
    short_description: "Wi-Fi bulb with 16 million colours. Works with Alexa and Google.",
    description:
      "Screws into a normal E27 holder. Set schedules so the lights come on before you get home, or change the colour from your phone without getting up.",
    features: ["16 million colours", "Alexa & Google Assistant", "No hub required", "Schedules and scenes"],
    specifications: [
      { label: "Base", value: "E27" },
      { label: "Power", value: "9W (60W equivalent)" },
      { label: "Brightness", value: "806 lumens" },
      { label: "Connectivity", value: "Wi-Fi 2.4GHz" },
    ],
    warranty: "1 year warranty",
    localImages: ["a71"],
  },
  {
    slug: "rgb-led-strip-5m",
    name: "RGB LED Strip Light 5m with Remote & App",
    sku: "LS-RGB5M",
    brand: "havit",
    category: "smart-home-iot",
    price_paisa: 79000,
    compare_at_paisa: 110000,
    cost_paisa: 55000,
    stock: 120,
    is_best_seller: true,
    short_description: "5 metres of colour behind your desk or TV. Music sync included.",
    description:
      "Adhesive backing, cut every 3 LEDs, and a music-sync mode that reacts to the room rather than the phone. The single cheapest way to make a room look considered.",
    features: ["5 metres, cuttable", "Music sync via built-in mic", "App and IR remote", "Adhesive 3M backing"],
    specifications: [
      { label: "Length", value: "5 metres" },
      { label: "LEDs", value: "150 × 5050 SMD" },
      { label: "Power", value: "24W, 12V adapter included" },
      { label: "Control", value: "App, remote, music sync" },
    ],
    warranty: "6 months warranty",
    localImages: ["a46"],
  },
  {
    slug: "ring-light-10-inch",
    name: "10-inch Ring Light with Tripod & Phone Holder",
    sku: "RL-10T",
    brand: "havit",
    category: "youtube-studio-gears",
    price_paisa: 119000,
    compare_at_paisa: 160000,
    cost_paisa: 85000,
    stock: 44,
    short_description: "Three colour temperatures, ten brightness steps, 2.1m tripod.",
    description:
      "For video calls, reels and product photography. The tripod extends to 2.1 metres, which is enough to shoot standing.",
    features: ["3 light modes, 10 brightness levels", "2.1m extendable tripod", "360° phone holder", "USB powered"],
    specifications: [
      { label: "Diameter", value: "10 inches / 26cm" },
      { label: "Colour temperature", value: "3000K–6000K" },
      { label: "Tripod height", value: "50cm–210cm" },
      { label: "Power", value: "USB 5V" },
    ],
    warranty: "6 months warranty",
    localImages: ["a47"],
  },

  // ── Mobile Accessories ────────────────────────────────────────────────────
  {
    slug: "baseus-magnetic-car-mount",
    name: "Baseus Magnetic Car Phone Mount",
    sku: "BS-CM01",
    brand: "baseus",
    category: "mobile-accessories",
    price_paisa: 69000,
    compare_at_paisa: 95000,
    cost_paisa: 48000,
    stock: 95,
    short_description: "Six N52 magnets. Holds through a case, over Dhaka speed bumps.",
    description:
      "The test for a car mount in this city is whether the phone stays put over a speed breaker. This one does.",
    features: ["6× N52 neodymium magnets", "Works through cases up to 2mm", "360° rotation", "Air-vent and dashboard mounts included"],
    specifications: [
      { label: "Mount type", value: "Air vent + adhesive dashboard" },
      { label: "Magnets", value: "6 × N52" },
      { label: "Rotation", value: "360°" },
    ],
    warranty: "6 months warranty",
    localImages: ["a16"],
  },
  {
    slug: "tempered-glass-9h",
    name: "9H Tempered Glass Screen Protector (2-pack)",
    sku: "TG-9H2",
    brand: "wiwu",
    category: "mobile-accessories",
    price_paisa: 29000,
    compare_at_paisa: 45000,
    cost_paisa: 16000,
    stock: 240,
    is_best_seller: true,
    short_description: "Two in the box, plus the alignment frame that makes fitting foolproof.",
    description:
      "The alignment frame is the difference between a clean fit and a crooked one with dust under it. Two sheets, so the first mistake is free.",
    features: ["9H hardness", "Alignment frame included", "Oleophobic coating", "Case-friendly 2.5D edge"],
    specifications: [
      { label: "Hardness", value: "9H" },
      { label: "Thickness", value: "0.33mm" },
      { label: "Quantity", value: "2 pieces" },
    ],
    warranty: "No warranty on glass",
    images: ["1512499617640-c74ae3a79d37", "1592286927505-1def25115558"],
  },
  {
    slug: "joyroom-selfie-stick-tripod",
    name: "Joyroom Selfie Stick Tripod with Bluetooth Remote",
    sku: "JR-SS01",
    brand: "joyroom",
    category: "mobile-accessories",
    price_paisa: 89000,
    compare_at_paisa: 120000,
    cost_paisa: 62000,
    stock: 68,
    short_description: "Extends to 1.5m, folds to pocket size, detachable remote.",
    description:
      "Doubles as a stable tripod for time-lapses. The remote clips into the handle so it does not get lost.",
    features: ["Extends to 1.5 metres", "Detachable Bluetooth remote", "Folds to 20cm", "Aluminium build"],
    specifications: [
      { label: "Extended length", value: "1.5m" },
      { label: "Folded length", value: "20cm" },
      { label: "Remote range", value: "10m" },
      { label: "Max phone width", value: "9cm" },
    ],
    warranty: "6 months warranty",
    localImages: ["a16"],
  },

  // ── Gaming Accessories ────────────────────────────────────────────────────
  {
    slug: "fantech-maxfit61-keyboard",
    name: "Fantech MAXFIT61 Mechanical Keyboard — 60%",
    sku: "FT-MF61",
    brand: "fantech",
    category: "keyboard-and-mouse",
    price_paisa: 449000,
    compare_at_paisa: 560000,
    cost_paisa: 350000,
    stock: 26,
    is_featured: true,
    short_description: "Hot-swappable 60% board with RGB and genuine Outemu switches.",
    description:
      "Hot-swappable sockets mean you can change switches without a soldering iron — worth having on your first mechanical board, because your first switch choice is rarely your last.",
    features: ["Hot-swappable switches", "Per-key RGB", "60% layout, detachable USB-C", "Double-shot PBT keycaps"],
    specifications: [
      { label: "Layout", value: "61 keys (60%)" },
      { label: "Switches", value: "Outemu Blue / Red / Brown" },
      { label: "Keycaps", value: "Double-shot PBT" },
      { label: "Cable", value: "Detachable USB-C" },
    ],
    warranty: "1 year warranty",
    images: ["1587829741301-dc798b83add3", "1541140532154-b024d705b90a"],
    variants: [
      { name: "Blue switches", sku: "FT-MF61-BL", stock: 10, attributes: { switch: "Blue" } },
      { name: "Red switches", sku: "FT-MF61-RD", stock: 9, attributes: { switch: "Red" } },
      { name: "Brown switches", sku: "FT-MF61-BR", stock: 7, attributes: { switch: "Brown" } },
    ],
  },
  {
    slug: "logitech-g102-mouse",
    name: "Logitech G102 Lightsync Gaming Mouse",
    sku: "LG-G102",
    brand: "logitech",
    category: "keyboard-and-mouse",
    price_paisa: 249000,
    compare_at_paisa: 310000,
    cost_paisa: 195000,
    stock: 51,
    is_best_seller: true,
    short_description: "8,000 DPI, 85g, and the sensor that made this the default budget pick.",
    description:
      "Still the mouse to buy under three thousand taka. The shape suits almost every grip, and the sensor has no acceleration or smoothing.",
    features: ["8,000 DPI sensor", "6 programmable buttons", "Lightsync RGB", "85g weight"],
    specifications: [
      { label: "Sensor", value: "Mercury, 8,000 DPI" },
      { label: "Buttons", value: "6 programmable" },
      { label: "Polling rate", value: "1000Hz" },
      { label: "Weight", value: "85g" },
    ],
    warranty: "2 years official warranty",
    images: ["1527864550417-7fd91fc51a46", "1615663245857-ac93bb7c39e7"],
  },
  {
    slug: "fantech-mh86-headset",
    name: "Fantech MH86 Gaming Headset with Mic",
    sku: "FT-MH86",
    brand: "fantech",
    category: "headphone-and-earphone",
    price_paisa: 189000,
    compare_at_paisa: 250000,
    cost_paisa: 140000,
    stock: 39,
    short_description: "50mm drivers, detachable mic, and earcups you can wear for six hours.",
    description:
      "Comfort is what separates a usable headset from one that sits on the shelf. The memory-foam cups here are the reason people keep this one.",
    features: ["50mm drivers", "Detachable noise-cancelling mic", "Memory foam earcups", "3.5mm + USB for RGB"],
    specifications: [
      { label: "Driver", value: "50mm" },
      { label: "Frequency", value: "20Hz–20kHz" },
      { label: "Connection", value: "3.5mm audio + USB (RGB only)" },
      { label: "Cable", value: "2 metres braided" },
    ],
    warranty: "1 year warranty",
    images: ["1599669454699-248893623440"],
  },

  // ── Smart Gadgets ─────────────────────────────────────────────────────────
  {
    slug: "xiaomi-smart-band-9",
    name: "Xiaomi Smart Band 9",
    sku: "XM-SB9",
    brand: "xiaomi",
    category: "watches-collection",
    price_paisa: 449000,
    compare_at_paisa: 550000,
    cost_paisa: 360000,
    stock: 58,
    is_featured: true,
    is_new_arrival: true,
    short_description: "21 days of battery, a 1.62-inch AMOLED, and 150 sport modes.",
    description:
      "The band that does not need charging every night. Three weeks of real use between charges, and the AMOLED is bright enough to read in Dhaka sun.",
    features: ["1.62-inch AMOLED, 1200 nits", "Up to 21 days battery", "150+ sport modes", "SpO2 and sleep tracking", "5ATM water resistant"],
    specifications: [
      { label: "Display", value: '1.62" AMOLED, 60Hz' },
      { label: "Battery", value: "21 days typical" },
      { label: "Water resistance", value: "5ATM" },
      { label: "Sensors", value: "PPG heart rate, SpO2, accelerometer" },
    ],
    warranty: "1 year official warranty",
    images: ["1523275335684-37898b6baf30", "1508685096489-7aacd43bd3b1"],
    variants: [
      { name: "Black", sku: "XM-SB9-BK", stock: 24, attributes: { color: "Black" } },
      { name: "Ivory", sku: "XM-SB9-IV", stock: 18, attributes: { color: "Ivory" } },
    ],
  },
  {
    slug: "smart-wifi-plug",
    name: "Smart Wi-Fi Plug with Energy Monitoring",
    sku: "SP-WF01",
    brand: "yeelight",
    category: "smart-home-iot",
    price_paisa: 99000,
    compare_at_paisa: 140000,
    cost_paisa: 68000,
    stock: 82,
    is_new_arrival: true,
    short_description: "Switch anything on from your phone — and see what it costs to run.",
    description:
      "Useful for the water pump, the geyser, or anything you keep forgetting to turn off. Energy monitoring tells you which appliance is quietly eating your bill.",
    features: ["16A rated", "Energy monitoring", "Schedules and timers", "Alexa & Google Assistant"],
    specifications: [
      { label: "Max load", value: "16A / 3520W" },
      { label: "Connectivity", value: "Wi-Fi 2.4GHz" },
      { label: "Socket", value: "3-pin BD standard" },
    ],
    warranty: "1 year warranty",
    images: ["1558002038-1055907df827", "1585771724684-38269d6639fd"],
  },

  // ── Chargers & Cables ─────────────────────────────────────────────────────
  {
    slug: "anker-nano-ii-65w-gan",
    name: "Anker Nano II 65W GaN Charger",
    sku: "AK-N65",
    brand: "anker",
    category: "adapter",
    price_paisa: 379000,
    compare_at_paisa: 460000,
    cost_paisa: 300000,
    stock: 44,
    is_featured: true,
    is_best_seller: true,
    short_description:
      "Charges a MacBook Air at full speed from something the size of a matchbox.",
    description:
      "GaN is why this is a third the size of the charger that came with your laptop while delivering the same 65 watts. One charger for the laptop, the phone and the earbuds.",
    features: ["65W USB-C PD output", "GaN II — 58% smaller than standard", "Charges laptops, phones and tablets", "ActiveShield temperature monitoring"],
    specifications: [
      { label: "Output", value: "65W USB-C PD" },
      { label: "Input", value: "100–240V" },
      { label: "Size", value: "43 × 42 × 36mm" },
      { label: "Weight", value: "112g" },
    ],
    warranty: "18 months official warranty",
    images: ["1583863788434-e58a36330cf0"],
  },
  {
    slug: "ugreen-usb-c-cable-100w",
    name: "UGREEN 100W USB-C to USB-C Braided Cable — 2m",
    sku: "UG-C100-2M",
    brand: "ugreen",
    category: "mobile-accessories",
    price_paisa: 89000,
    compare_at_paisa: 120000,
    cost_paisa: 60000,
    stock: 156,
    is_best_seller: true,
    short_description: "100W and 480Mbps over nylon braid rated for 25,000 bends.",
    description:
      "Cables are where people economise and then replace three times. This one is rated for 25,000 bends and carries the full 100W a modern laptop asks for.",
    features: ["100W (20V/5A) power delivery", "Nylon braided, 25,000-bend rated", "E-marker chip for safe fast charging", "2 metres"],
    specifications: [
      { label: "Power", value: "100W (20V 5A)" },
      { label: "Data", value: "480Mbps (USB 2.0)" },
      { label: "Length", value: "2 metres" },
      { label: "Jacket", value: "Nylon braid" },
    ],
    warranty: "1 year warranty",
    localImages: ["a74"],
    variants: [
      { name: "1 metre", sku: "UG-C100-1M", price_paisa: 69000, stock: 60, attributes: { length: "1m" } },
      { name: "2 metres", sku: "UG-C100-2M-V", stock: 58, attributes: { length: "2m" } },
      { name: "3 metres", sku: "UG-C100-3M", price_paisa: 119000, stock: 38, attributes: { length: "3m" } },
    ],
  },
  {
    slug: "baseus-car-charger-30w",
    name: "Baseus 30W Dual-Port Car Charger",
    sku: "BS-CC30",
    brand: "baseus",
    category: "adapter",
    price_paisa: 79000,
    compare_at_paisa: 110000,
    cost_paisa: 52000,
    stock: 88,
    short_description: "USB-C PD plus USB-A, so the driver and the passenger both charge fast.",
    description:
      "Metal body rather than plastic, which matters in a car parked in the sun all day.",
    features: ["30W total (20W PD + 10W USB-A)", "Aluminium alloy body", "Fits 12V and 24V sockets", "LED indicator"],
    specifications: [
      { label: "Output", value: "USB-C 20W PD + USB-A 10W" },
      { label: "Input", value: "12–24V DC" },
      { label: "Body", value: "Aluminium alloy" },
    ],
    warranty: "1 year warranty",
    localImages: ["a74"],
  },
];

export const IMG = img;
export const LOCAL = local;
