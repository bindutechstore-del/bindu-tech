/**
 * Static content pages.
 *
 * Kept as data rather than a dozen near-identical page files. Anything that
 * varies by store (phone number, return window, delivery fees) is interpolated
 * from `settings` / `delivery_zones` at render time — do not hardcode those
 * here.
 *
 * Write the shop's name as {{store}}. It is replaced with the name set in
 * /admin/settings, so renaming the shop does not leave "About <old name>"
 * behind on the About page.
 */

export interface PageSection {
  heading?: string;
  /** Paragraphs. */
  body?: string[];
  /** Rendered as a ticked list. */
  points?: string[];
  /** Rendered as an accordion — used by the FAQ. */
  faqs?: { q: string; a: string }[];
}

export interface ContentPage {
  slug: string;
  title: string;
  description: string;
  intro?: string;
  sections: PageSection[];
  /** Renders the live delivery_zones table into the page. */
  showDeliveryTable?: boolean;
}

export const CONTENT_PAGES: ContentPage[] = [
  {
    slug: "about",
    title: "About {{store}}",
    description:
      "Who we are, what we stock, and why we will not sell you a refurbished unit as new.",
    intro:
      "{{store}} is a Dhaka-based retailer of consumer electronics and gadgets. We started because buying a power bank in this country involves too much guesswork — capacities that are not real, warranties nobody honours, and prices that change depending on how you ask.",
    sections: [
      {
        heading: "What we actually do",
        body: [
          "We stock a deliberately narrow range: earbuds and headphones, power banks, mini UPS units, projectors, lighting, mobile and gaming accessories, smart gadgets, and charging gear. Narrow because we would rather know ten products properly than list a thousand we have never opened.",
          "Everything we sell is sourced through official channels or authorised importers. If a unit is refurbished or open-box, the listing says so before you add it to your cart — never after it arrives.",
        ],
      },
      {
        heading: "How we price",
        points: [
          "One price for everyone. No haggling, no different number over the phone.",
          "Delivery is charged by zone and shown before you place the order.",
          "Discounts come from coupons you can see, not from a markup we quietly removed.",
        ],
      },
      {
        heading: "What you can hold us to",
        points: [
          "Cash on delivery nationwide, so you pay when the box is in your hands.",
          "Official warranty, claimable at the brand's Bangladesh service centre.",
          "A 7-day replacement window for anything dead on arrival or not as described.",
          "We re-issue your invoice from your account any time you need it for a claim.",
        ],
      },
    ],
  },

  {
    slug: "shipping",
    title: "Shipping policy",
    description:
      "Delivery charges by district, how long it takes, and what happens if you are not home.",
    intro:
      "We deliver to all 64 districts through Steadfast and Pathao. Charges depend on which zone your district falls into, and are always shown at checkout before you commit.",
    showDeliveryTable: true,
    sections: [
      {
        heading: "How long it takes",
        body: [
          "Orders confirmed before 4pm are usually handed to the courier the same working day. Friday is a non-working day for dispatch, though couriers still deliver.",
          "The estimate you see at checkout is the courier's window, counted in working days from dispatch — not from the moment you place the order.",
        ],
      },
      {
        heading: "If you are not home",
        points: [
          "The courier calls before delivery. Keep the number you gave us reachable.",
          "They will attempt delivery up to three times over three days.",
          "After three failed attempts the parcel returns to us and the order is cancelled.",
          "Repeated refusal of cash-on-delivery parcels may mean we ask for advance payment next time.",
        ],
      },
      {
        heading: "Checking your parcel",
        body: [
          "You may open the box and check the item in front of the courier. If the wrong item arrived, or the unit is visibly damaged, refuse the parcel — that is far simpler than arranging a return afterwards.",
        ],
      },
    ],
  },

  {
    slug: "delivery",
    title: "Delivery charges",
    description: "What delivery costs to each part of Bangladesh, and how long it takes.",
    intro:
      "Delivery is priced by zone. Your district decides the zone, and the charge is calculated automatically at checkout.",
    showDeliveryTable: true,
    sections: [
      {
        heading: "Free delivery",
        body: [
          "Each zone has an order value above which delivery is free. It applies automatically — there is no code to enter. The threshold is shown in the table above.",
        ],
      },
      {
        heading: "Bulky items",
        body: [
          "Projectors and mini UPS units are heavier than the courier's standard slab. Where a product carries a surcharge, the product page says so before you order.",
        ],
      },
    ],
  },

  {
    slug: "returns",
    title: "Return & refund policy",
    description:
      "When you can return something, how long it takes, and how the money comes back.",
    intro:
      "If something arrives broken, wrong, or not as described, that is our problem to fix — not yours to argue about.",
    sections: [
      {
        heading: "What we replace or refund",
        points: [
          "Dead on arrival — the unit does not power on or function at all.",
          "Wrong item, wrong variant, or wrong quantity delivered.",
          "Physical damage that was present when the box was opened.",
          "A material difference between the listing and what arrived.",
        ],
      },
      {
        heading: "What we cannot take back",
        points: [
          "Change of mind on earphones, earbuds and other in-ear products, once the seal is broken. This is a hygiene rule, not a preference.",
          "Damage caused after delivery — drops, liquid, power surges, unauthorised repair.",
          "Missing accessories, manuals or original packaging.",
          "Items reported outside the return window.",
        ],
      },
      {
        heading: "How to start a return",
        body: [
          "Message us on WhatsApp or call, with your order number and a photo or short video of the problem. We will tell you within one working day whether it is a replacement, a repair through the service centre, or a refund.",
          "Approved returns are collected by the same courier network at our cost. Refunds go back by bKash or bank transfer within 5–7 working days of the unit reaching us and passing inspection.",
        ],
      },
    ],
  },

  {
    slug: "warranty",
    title: "Warranty policy",
    description:
      "What the warranty covers, who honours it, and what voids it.",
    intro:
      "Warranty length varies by product and is stated on every product page. It is honoured through the brand's authorised Bangladesh service centre, not by us reselling you a new unit.",
    sections: [
      {
        heading: "What is covered",
        points: [
          "Manufacturing defects and component failure under normal use.",
          "Battery capacity falling well below the rated figure within the warranty period.",
          "Charging circuitry, ports and switches failing without physical damage.",
        ],
      },
      {
        heading: "What voids it",
        points: [
          "Physical damage, liquid ingress or a burnt board.",
          "Opening the unit or repairs by anyone other than the service centre.",
          "Damage from a non-standard charger or an unstable mains supply.",
          "A removed, defaced or unreadable serial number.",
        ],
      },
      {
        heading: "Making a claim",
        body: [
          "Start with us. We log the claim, give you the service centre reference, and chase it if it stalls. You will need the invoice — sign in and download it from your order page, or ask us and we will re-issue it.",
          "Turnaround at the service centre is typically 7–15 working days. We will tell you if a particular brand is slower than that.",
        ],
      },
    ],
  },

  {
    slug: "authenticity",
    title: "Genuine stock only",
    description: "How we source, and why we will not sell refurbished units as new.",
    intro:
      "The grey market in Bangladesh is large and it is not always obvious you are in it. Here is how we stay out of it.",
    sections: [
      {
        heading: "Sourcing",
        points: [
          "We buy from authorised importers and brand distributors, not from open-market wholesalers.",
          "Every batch is checked against the distributor's invoice before it goes on sale.",
          "Serial numbers are verifiable. Ask before you pay and we will read one out.",
        ],
      },
      {
        heading: "Open-box and refurbished",
        body: [
          "Occasionally we sell a returned or open-box unit. When we do, the listing says so in the title, the price reflects it, and the warranty terms are stated explicitly. We have never sold one as new and we do not intend to start.",
        ],
      },
    ],
  },

  {
    slug: "payments",
    title: "Payment methods",
    description: "How you can pay, and what happens with cash on delivery.",
    intro:
      "Cash on delivery is available on every order nationwide. Online payment options appear at checkout when they are configured.",
    sections: [
      {
        heading: "Cash on delivery",
        body: [
          "You pay the courier when the parcel reaches you. Nothing is charged in advance and no card details are needed.",
          "Above a threshold set in our settings (currently shown at checkout), we ask for a partial advance before dispatch. High-value parcels that come back unpaid are expensive for a small retailer, and this is the compromise that keeps COD available at all.",
        ],
      },
      {
        heading: "Online payment",
        body: [
          "Where bKash, Nagad or card payment is enabled, you are redirected to the provider's own secure page. We never see or store your PIN, OTP or card number — the gateway handles that end to end and returns only a transaction reference.",
          "If a payment fails or is abandoned, the order is cancelled automatically and the reserved stock goes straight back on the shelf.",
        ],
      },
      {
        heading: "Your invoice",
        body: [
          "Every order gets an invoice you can view from your account at any time. You will need it for a warranty claim, so we keep it available rather than emailing it once and hoping you filed it.",
        ],
      },
    ],
  },

  {
    slug: "faq",
    title: "Frequently asked questions",
    description: "The questions we get asked most, answered plainly.",
    sections: [
      {
        faqs: [
          {
            q: "Do I have to pay before delivery?",
            a: "No. Cash on delivery is available on every order across Bangladesh — you pay the courier when the parcel arrives. Above the threshold shown at checkout we ask for a partial advance, because unpaid high-value returns are difficult for a small retailer to absorb.",
          },
          {
            q: "Can I check the product before paying?",
            a: "Yes. Open the box in front of the courier and check the item. If it is the wrong product or visibly damaged, refuse the parcel — that is much simpler than arranging a return later.",
          },
          {
            q: "How long does delivery take?",
            a: "Inside Dhaka, 1–2 working days. Dhaka suburbs 2–3 days, divisional cities 2–4 days, and the rest of the country 3–5 days. The estimate is counted from dispatch, not from when you place the order.",
          },
          {
            q: "Is the warranty real?",
            a: "Yes, and it is claimed through the brand's authorised Bangladesh service centre. We log the claim for you and chase it if it stalls. Keep the invoice — or download it again from your order page whenever you need it.",
          },
          {
            q: "Are your products original?",
            a: "We source through authorised importers and brand distributors. Serial numbers are verifiable before you pay. If a unit is open-box or refurbished, the listing says so in the title and the price reflects it.",
          },
          {
            q: "Can I return an item if I simply changed my mind?",
            a: "For most products, within the return window and unopened, yes. In-ear products — earbuds and earphones — cannot be returned once the seal is broken, for hygiene reasons.",
          },
          {
            q: "How do I track my order?",
            a: "Use the Track page with your order number and the mobile number on the order. No account needed. If you have an account, every order is listed under My Orders with a live status timeline.",
          },
          {
            q: "Do you have a physical shop?",
            a: "Yes — our counter address is in the footer, and demo units for audio products are available there. Call ahead to make sure the specific model you want is on the shelf.",
          },
          {
            q: "Do you deliver outside Bangladesh?",
            a: "Not currently. We ship to all 64 districts within Bangladesh only.",
          },
          {
            q: "Can I cancel after ordering?",
            a: "Yes, while the order is still Placed or Confirmed — cancel it yourself from your order page and the stock is released immediately. Once it is Processing or has shipped, call us and we will do what we can.",
          },
        ],
      },
    ],
  },

  {
    slug: "privacy",
    title: "Privacy policy",
    description: "What we collect, why, and what we never do with it.",
    intro:
      "Short version: we collect what is needed to deliver your order and nothing else, and we do not sell it.",
    sections: [
      {
        heading: "What we collect",
        points: [
          "Your name, mobile number and delivery address — needed to ship the order.",
          "Your email, if you give one — used for your invoice and order updates.",
          "Your order history, so you and our support team can see what you bought.",
          "Basic technical data (browser, approximate location) for security and fraud prevention.",
        ],
      },
      {
        heading: "What we do not do",
        points: [
          "We do not sell or rent your data to anyone.",
          "We do not see or store card numbers, PINs or OTPs — the payment gateway handles those.",
          "We do not send marketing email unless you ticked the box, and every one has an unsubscribe link.",
        ],
      },
      {
        heading: "Who we share with",
        body: [
          "Courier partners receive your name, address and phone number, because that is how a parcel reaches you. Payment gateways receive the amount and an order reference. Nobody else receives anything.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can see and correct your details from your account at any time. If you want your account and personal data deleted, contact us and we will do it — order records required for accounting and warranty claims are retained, with personal identifiers removed where the law allows.",
        ],
      },
    ],
  },

  {
    slug: "terms",
    title: "Terms & conditions",
    description: "The rules that apply when you order from us.",
    sections: [
      {
        heading: "Orders",
        body: [
          "Placing an order is an offer to buy. It becomes a contract when we confirm it — usually by phone. We may decline an order if stock has run out, the price was listed in error, or the delivery address cannot be served.",
          "Prices and delivery charges are those shown at the moment you place the order. Your total is calculated on our server from live prices; a figure changed in your browser has no effect on what is charged.",
        ],
      },
      {
        heading: "Pricing errors",
        body: [
          "If a product is listed at an obviously wrong price, we will contact you before dispatch and either honour the correct price with your agreement or cancel the order and refund any advance in full.",
        ],
      },
      {
        heading: "Your responsibilities",
        points: [
          "Give an accurate address and a reachable phone number.",
          "Be available, or arrange someone to receive the parcel, during the delivery window.",
          "Do not use the site to place fraudulent orders or resell under our name.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Our liability for any order is limited to the amount you paid for it. We are not liable for indirect losses — lost work, lost data, missed opportunities — arising from a delayed or defective product.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "These terms are governed by the laws of Bangladesh, and disputes fall under the jurisdiction of the courts of Dhaka.",
        ],
      },
    ],
  },

  {
    slug: "group-buy",
    title: "Group buy",
    description:
      "Buy as a group — offices, hostels, clubs and resellers — at a tier price instead of retail.",
    intro:
      "If you are buying the same item several times over, you should not be paying the same price as someone buying one. Group buy is for offices kitting out a floor, hostels buying in bulk, clubs, gift lists and small resellers testing a line.",
    sections: [
      {
        heading: "How it works",
        points: [
          "Tell us the item and the quantity. Five units is the minimum for a tier price.",
          "We confirm stock and quote you a per-unit price within one working day.",
          "You pay a 20% advance to lock the tier, and the balance on delivery.",
          "Everything ships as one consignment to one address, with one invoice.",
        ],
      },
      {
        heading: "What you get",
        points: [
          "A lower per-unit price than the listed retail price, in writing before you commit.",
          "The same official warranty as a single retail purchase, per unit.",
          "One named contact for the whole order instead of the general support queue.",
          "A consolidated invoice suitable for company reimbursement.",
        ],
      },
      {
        heading: "Before you ask",
        body: [
          "Tier prices depend on what we can source, so they are quoted per enquiry rather than published as a fixed table. We will tell you plainly if an item cannot be discounted at your quantity instead of padding the quote.",
          "Group orders are not eligible for coupon codes — the tier price already reflects the discount.",
        ],
      },
      {
        heading: "Start an enquiry",
        body: [
          "Call or WhatsApp us with the item, the quantity and your delivery district. Quotes are valid for seven days.",
        ],
      },
    ],
  },

  {
    slug: "dropship",
    title: "Dropshipping",
    description:
      "Sell our catalogue from your own page — we hold the stock, pack it and deliver it under your name.",
    intro:
      "If you already have an audience — a Facebook page, an Instagram shop, a marketplace listing — you do not need to buy stock to start selling. You take the order, we ship it to your customer in your packaging slip.",
    sections: [
      {
        heading: "How it works",
        points: [
          "Apply with your page or shop link. We check it is a real, active storefront.",
          "You get a dropship price list, refreshed weekly, and live stock counts.",
          "You forward orders to us with your customer's address; we pack and dispatch.",
          "The parcel goes out under your shop's name — we do not include our marketing.",
        ],
      },
      {
        heading: "Money and settlement",
        points: [
          "You keep the difference between your listed price and the dropship price.",
          "Cash on delivery is settled weekly, minus the dropship price and delivery.",
          "Prepaid orders are settled within two working days of dispatch.",
          "Returns follow the same 7-day replacement window as retail orders.",
        ],
      },
      {
        heading: "What we expect",
        points: [
          "Advertise the specification we publish, not a better one. Misdescribed items come back to us.",
          "Pass warranty claims through to us rather than handling them yourself.",
          "Do not list below the dropship price — it undercuts every other partner.",
        ],
      },
      {
        heading: "Apply",
        body: [
          "Message us with your page link and roughly how many orders a month you handle. Most applications are answered within two working days.",
        ],
      },
    ],
  },
  // "be-partner" is its own route with an application form: app/(storefront)/be-partner.
];

export function getContentPage(slug: string): ContentPage | undefined {
  return CONTENT_PAGES.find((p) => p.slug === slug);
}

/**
 * The page with every {{store}} replaced by the shop's configured name.
 * Round-trips through JSON so every string field — title, intro, paragraphs,
 * FAQ answers — is covered without listing them, and the name is escaped as a
 * JSON string so a quote in it cannot break the parse.
 */
export function withStoreName(page: ContentPage, storeName: string): ContentPage {
  const escaped = JSON.stringify(storeName).slice(1, -1);
  return JSON.parse(JSON.stringify(page).replaceAll("{{store}}", escaped));
}
