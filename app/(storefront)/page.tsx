import { Suspense } from "react";
import Link from "next/link";
import { Truck, ShieldCheck, MessageCircle, ArrowRight } from "lucide-react";
import {
  getBanners,
  getTopCategories,
  getRailProducts,
  getFlashSale,
  getHomeReviews,
} from "@/lib/queries/home";
import { getStoreSettings } from "@/lib/queries/settings";
import { getDeliveryOptions } from "@/lib/queries/delivery";
import { getBrands } from "@/lib/queries/catalog";
import { BrandCarousel } from "@/components/storefront/brand-carousel";
import { deliveryNoteFromOptions } from "@/lib/content/highlights";
import { formatTaka } from "@/lib/utils/money";
import { HeroCards } from "@/components/storefront/hero-cards";
import { FlashSaleSection } from "@/components/storefront/flash-sale";
import {
  Section,
  ProductGrid,
  ProductRail,
  CategoryGrid,
  OfferCards,
  WhyChooseUs,
  ReviewWall,
} from "@/components/storefront/sections";
import { RailSkeleton, GridSkeleton } from "@/components/storefront/skeletons";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import type { StoreSettings } from "@/lib/queries/settings";

// The title and description come from the root layout (store name first).
export const metadata: Metadata = { alternates: { canonical: "/" } };

// The homepage is the same for everyone; regenerate it every 5 minutes rather
// than querying Postgres on every visit. Flash-sale countdowns are client-side,
// so a slightly stale shell is still correct.
export const revalidate = 300;

/**
 * Only the hero blocks the first paint.
 *
 * Everything below it sits behind its own Suspense boundary, so each section
 * streams in as its query resolves instead of the whole page waiting on the
 * slowest one. On the free tier that is the difference between a visitor
 * seeing the shop in ~200 ms and waiting ~1.5 s for a review query they have
 * not scrolled to yet.
 */
export default async function HomePage() {
  const [banners, settings, deliveryOptions] = await Promise.all([
    getBanners(),
    getStoreSettings(),
    getDeliveryOptions(),
  ]);

  // The admin's own words if they wrote some, otherwise the live charges —
  // never a hardcoded sentence that goes stale when a charge changes.
  const deliveryNote =
    settings.home_delivery_note.trim() ||
    deliveryNoteFromOptions(deliveryOptions, formatTaka);

  return (
    <>
      {/* Who the shop is and the site search box, for Google. */}
      <JsonLd data={[organizationJsonLd(settings), websiteJsonLd(settings)]} />
      <HeroCards
        banners={[...banners.hero, ...banners.categoryTiles]}
        heading={`${settings.store_name} — ${settings.store_tagline}`}
      />

      {banners.promoStrip ? (
        <div className="bg-ink text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm">
            <Truck size={15} className="shrink-0 text-brand-300" />
            <span>{banners.promoStrip.title}</span>
            {banners.promoStrip.cta_href && banners.promoStrip.cta_label ? (
              <Link
                href={banners.promoStrip.cta_href}
                className="font-medium text-brand-300 underline-offset-2 hover:underline"
              >
                {banners.promoStrip.cta_label}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <Suspense fallback={<GridSkeleton count={6} className="h-24" />}>
        <CategoriesSection />
      </Suspense>

      {/* Products first, information after: New arrivals sits right under the
          categories, and "Why shop with us" moved down with the other
          reassurance sections instead of splitting the product rows. */}
      <Suspense fallback={<RailSkeleton title="New arrivals" />}>
        <NewArrivalsBlock />
      </Suspense>

      <Suspense fallback={null}>
        <FlashSaleBlock />
      </Suspense>

      <Suspense fallback={<RailSkeleton title="Best sellers" />}>
        <RailsBlock storeName={settings.store_name} />
      </Suspense>

      <Suspense fallback={null}>
        <BrandsBlock />
      </Suspense>

      <Suspense fallback={null}>
        <ReviewsBlock />
      </Suspense>

      {banners.offerCards.length > 0 ? (
        <Section title="Why shop with us">
          <OfferCards banners={banners.offerCards} />
        </Section>
      ) : null}

      {settings.home_highlights.length > 0 ? (
        <Section title={`Buying from ${settings.store_name}`}>
          <WhyChooseUs highlights={settings.home_highlights} />
        </Section>
      ) : null}

      {/* Delivery + warranty + contact, the three things a BD shopper checks
          before committing to cash on delivery. */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface p-6">
            <Truck className="text-brand-600" size={22} />
            <h3 className="mt-3 text-base font-semibold text-ink">Delivery</h3>
            <p className="mt-1 text-sm leading-6 text-ink-muted">{deliveryNote}</p>
            <Link
              href="/shipping"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Delivery charges <ArrowRight size={14} />
            </Link>
          </div>

          <div className="rounded-xl border border-line bg-surface p-6">
            <ShieldCheck className="text-success" size={22} />
            <h3 className="mt-3 text-base font-semibold text-ink">
              Warranty &amp; replacement
            </h3>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              {settings.warranty_note ||
                "Official warranty through the brand's Bangladesh service centre."}
            </p>
            <Link
              href="/warranty"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Read the policy <ArrowRight size={14} />
            </Link>
          </div>

          <div className="rounded-xl border border-line bg-surface p-6">
            <MessageCircle className="text-warning" size={22} />
            <h3 className="mt-3 text-base font-semibold text-ink">Talk to us</h3>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              {settings.support_hours}. Call {settings.support_phone}, or message us on
              WhatsApp for the fastest reply.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              All contact options <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <AboutStoreBlock settings={settings} />
      </Suspense>
    </>
  );
}

/**
 * A few plain sentences about the shop, with links into the main categories.
 * Search engines rank a page for words that are actually on it; the rest of
 * the homepage is product cards, so without this the words people search —
 * "gadget shop in Bangladesh" — would appear nowhere.
 */
async function AboutStoreBlock({ settings }: { settings: StoreSettings }) {
  const categories = (await getTopCategories()).slice(0, 12);
  const name = settings.store_name;
  return (
    <section aria-labelledby="about-store" className="mx-auto max-w-7xl px-4 pb-14">
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h2 id="about-store" className="text-lg font-bold tracking-tight text-ink">
          {name} — online gadget &amp; electronics shop in Bangladesh
        </h2>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          {name} (bindu.tech) is an online tech shop for customers all over Bangladesh, from
          Dhaka and Chattogram to every district. Shop gadgets, electronics and everyday tech
          accessories at fair prices, pay with cash on delivery, bKash or Nagad, and get
          home delivery nationwide.
        </p>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          Looking for the latest gadget price in Bangladesh? Every product page shows the
          current price and stock, and our team is a call away at {settings.support_phone}.
        </p>
        {categories.length > 0 ? (
          <nav aria-label="Popular categories" className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-brand-600 hover:text-brand-700"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

async function CategoriesSection() {
  const categories = await getTopCategories();
  if (categories.length === 0) return null;

  return (
    <Section
      title="Shop by category"
      subtitle="Everything we stock, sorted the way you actually shop."
      href="/categories"
    >
      <CategoryGrid categories={categories} oneRow />
    </Section>
  );
}

async function FlashSaleBlock() {
  const sale = await getFlashSale();
  if (!sale || sale.items.length === 0) return null;
  return <FlashSaleSection sale={sale} />;
}

/**
 * New arrivals, right under the categories. getRailProducts is wrapped in
 * React `cache`, so this and RailsBlock share one fetch per request.
 */
async function NewArrivalsBlock() {
  const rails = await getRailProducts();
  if (rails.newArrivals.length === 0) return null;

  return (
    <Section
      title="New arrivals"
      subtitle="Fresh stock, just published."
      // "See all" lists exactly the ticked products the rail is showing.
      href={rails.newArrivalsTicked ? "/products?new=1" : "/products?sort=newest"}
    >
      <ProductRail products={rails.newArrivals} />
    </Section>
  );
}

/** Best sellers and Handpicked — same cached fetch as New arrivals. */
async function RailsBlock({ storeName }: { storeName: string }) {
  const rails = await getRailProducts();

  if (!rails.hasAny) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <EmptyState
          title="The catalogue is still being loaded"
          description="Products will appear here as soon as they are published from the admin panel."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/products">Open admin</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      {rails.bestSellers.length > 0 ? (
        <Section
          title="Best sellers"
          subtitle={`What ${storeName} customers buy most.`}
          href="/products?sort=popular"
        >
          <ProductRail products={rails.bestSellers} />
        </Section>
      ) : null}

      {rails.featured.length > 0 ? (
        <Section title="Handpicked for you" href="/products?sort=newest">
          {/* Far below the fold: no preloads, they would compete with the hero. */}
          <ProductGrid products={rails.featured} />
        </Section>
      ) : null}
    </>
  );
}

/**
 * "Our Brands" — a row of logos, so only brands that have one. A brand added
 * without a logo (say, quick-added from the product form) joins the row the
 * moment a logo is uploaded; until then it is still on the Brands page and in
 * the filters, by name.
 */
async function BrandsBlock() {
  const withLogo = (await getBrands())
    .filter((b) => b.logo_url)
    .map((b) => ({ id: b.id, name: b.name, slug: b.slug, logo_url: b.logo_url }));
  if (withLogo.length === 0) return null;

  return (
    <Section title="Our brands" href="/brands">
      <BrandCarousel brands={withLogo} />
    </Section>
  );
}

async function ReviewsBlock() {
  const reviews = await getHomeReviews();
  if (reviews.length === 0) return null;

  return (
    <Section title="What customers say" subtitle="Only from verified, delivered orders.">
      <ReviewWall reviews={reviews} />
    </Section>
  );
}
