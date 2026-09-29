import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Truck, ShieldCheck, RotateCcw, Check, Sparkles } from "lucide-react";
import {
  getProductBySlug,
  getRelatedProducts,
  getProductReviews,
  averageRating,
} from "@/lib/queries/catalog";
import { getStoreSettings } from "@/lib/queries/settings";
import { getDeliveryOptions } from "@/lib/queries/delivery";
import { getQuantityBreaks, getBundlesForProduct } from "@/lib/queries/promotions";
import { ProductOffers } from "@/components/product/offers";
import { DeliveryOptionCards } from "@/components/checkout/delivery-options";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Gallery } from "@/components/product/gallery";
import { BuyBox } from "@/components/product/buy-box";
import { ReviewsSection } from "@/components/product/reviews-section";
import { RecentlyViewedTracker } from "@/components/product/recently-viewed";
import { Section, ProductRail } from "@/components/storefront/sections";
import { Rating, Badge } from "@/components/ui/primitives";
import { formatTaka } from "@/lib/utils/money";
import type { SpecItem } from "@/types/database";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, breadcrumbJsonLd, metaDescription } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };

  // "<name> price in Bangladesh" is how shoppers here search for a product,
  // so the title says exactly that; the layout template adds "| Bindu Tech".
  const { store_name } = await getStoreSettings();
  const title = `${product.name} Price in Bangladesh`;
  const price = formatTaka(product.price_paisa);
  const blurb = product.short_description ?? product.description ?? "";
  const description = metaDescription(
    `Buy ${product.name} at the best price in Bangladesh: ${price} at ${store_name}.` +
      (blurb ? ` ${blurb}` : " Warranty, cash on delivery and nationwide delivery."),
  );
  const images = product.images?.length
    ? product.images.map((i) => ({ url: i.url, alt: i.alt ?? product.name }))
    : product.thumbnail_url
      ? [{ url: product.thumbnail_url, alt: product.name }]
      : undefined;
  return {
    title,
    description,
    keywords: [
      `${product.name} price in Bangladesh`,
      `${product.name} price in BD`,
      product.name,
      ...(product.brand ? [`${product.brand.name} price in Bangladesh`] : []),
      ...(product.category ? [`${product.category.name} price in Bangladesh`] : []),
      store_name,
    ],
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: `${title} | ${store_name}`, description, url: `/products/${product.slug}`, images },
    twitter: { card: "summary_large_image", title: `${title} | ${store_name}`, description },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || product.status !== "active") notFound();

  const [related, reviews, settings, deliveryOptions, user, breaks, bundles] = await Promise.all([
    getRelatedProducts(product),
    getProductReviews(product.id),
    getStoreSettings(),
    getDeliveryOptions(),
    getSessionUser(),
    getQuantityBreaks(product.id, product.category_id),
    getBundlesForProduct(product.id),
  ]);

  // Has this customer bought and received it? Gates the review form, and RLS
  // enforces the same rule independently on insert.
  let canReview = false;
  let alreadyReviewed = false;
  if (user) {
    const supabase = await createClient();
    const [{ data: delivered }, { data: mine }] = await Promise.all([
      supabase
        .from("order_items")
        .select("id, orders!inner(status, user_id)")
        .eq("product_id", product.id)
        .eq("orders.user_id", user.id)
        .eq("orders.status", "delivered")
        .limit(1),
      supabase
        .from("reviews")
        .select("id")
        .eq("product_id", product.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    canReview = (delivered?.length ?? 0) > 0;
    alreadyReviewed = Boolean(mine);
  }

  const rating = averageRating(product);
  const inStock = product.stock > 0;
  const lowStock = inStock && product.stock <= settings.low_stock_banner_threshold;
  const specs = (product.specifications ?? []) as SpecItem[];

  // Product JSON-LD so Google can render price and availability in results.
  const productUrl = absoluteUrl(`/products/${product.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    url: productUrl,
    image: product.images?.length
      ? product.images.map((i) => i.url)
      : product.thumbnail_url
        ? [product.thumbnail_url]
        : [],
    description: product.short_description ?? product.description ?? product.name,
    sku: product.sku,
    ...(product.category ? { category: product.category.name } : {}),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "BDT",
      price: (product.price_paisa / 100).toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: settings.store_name, url: absoluteUrl("/") },
      areaServed: "BD",
    },
    aggregateRating:
      rating && product.rating_count
        ? {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: product.rating_count,
          }
        : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <JsonLd
        data={[
          jsonLd,
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
            ...(product.category
              ? [{ name: product.category.name, path: `/products?category=${product.category.slug}` }]
              : []),
            { name: product.name, path: `/products/${product.slug}` },
          ]),
        ]}
      />
      <RecentlyViewedTracker productId={product.id} signedIn={Boolean(user)} />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/products" className="hover:text-brand-700">
          Products
        </Link>
        {product.category ? (
          <>
            <span className="mx-1.5">/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-brand-700"
            >
              {product.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery
          images={product.images}
          thumbnail={product.thumbnail_url}
          videoUrl={product.video_url}
          alt={product.name}
        />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.brand ? (
              <Link
                href={`/products?brand=${product.brand.slug}`}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {product.brand.name}
              </Link>
            ) : null}
            {product.is_new_arrival ? <Badge tone="brand">New arrival</Badge> : null}
            {product.is_best_seller ? <Badge tone="warning">Best seller</Badge> : null}
          </div>

          <h1 className="mt-1.5 text-2xl font-bold leading-8 tracking-tight text-ink sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <Rating value={rating} count={product.rating_count || undefined} size={16} />
            <span className="text-xs text-ink-faint">SKU {product.sku}</span>
            {product.units_sold > 0 ? (
              <span className="text-xs text-ink-muted tabular">
                {product.units_sold} sold
              </span>
            ) : null}
          </div>

          {product.short_description ? (
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              {product.short_description}
            </p>
          ) : null}

          <BuyBox
            product={product}
            variants={product.variants}
            lowStockThreshold={settings.low_stock_banner_threshold}
            signedIn={Boolean(user)}
          />

          {/* What this purchase is worth back. Shown next to the price because
              that is where the value judgement happens, not at checkout after
              the decision is made. */}
          {product.points_per_purchase > 0 ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700">
              <Sparkles size={13} />
              Earn {product.points_per_purchase.toLocaleString()} points with this
              item
            </p>
          ) : null}

          <ProductOffers
            breaks={breaks}
            bundles={bundles}
            unitPricePaisa={product.price_paisa}
            productId={product.id}
          />

          {/* Shipping options up front, priced. A shopper deciding whether to
              buy should not have to reach checkout to learn what postage
              costs — these are the same three options and the same numbers
              the cart and checkout use. */}
          <div className="mt-6">
            <div className="mb-2.5 flex items-center gap-2">
              <Truck size={17} className="shrink-0 text-brand-600" />
              <h2 className="text-sm font-semibold text-ink">Shipping options</h2>
            </div>
            <DeliveryOptionCards options={deliveryOptions} />
            {product.delivery_note ? (
              <p className="mt-2 text-xs text-ink-muted">{product.delivery_note}</p>
            ) : null}
          </div>

          {/* Warranty and returns — the other two questions every BD shopper
              asks before agreeing to cash on delivery. */}
          <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
            <div className="flex gap-3 p-4">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" />
              <div className="text-sm">
                <p className="font-medium text-ink">
                  {product.warranty ?? "Official warranty"}
                </p>
                <p className="mt-0.5 text-ink-muted">{settings.warranty_note}</p>
              </div>
            </div>

            <div className="flex gap-3 p-4">
              <RotateCcw size={18} className="mt-0.5 shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-medium text-ink">
                  {settings.return_window_days}-day replacement
                </p>
                <p className="mt-0.5 text-ink-muted">
                  Dead-on-arrival, wrong variant or a defect — we swap it, no argument.
                </p>
              </div>
            </div>
          </div>

          {lowStock ? (
            <p className="mt-4 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
              Only {product.stock} left in stock.
            </p>
          ) : null}
        </div>
      </div>

      {product.features.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-lg font-bold tracking-tight text-ink">Key features</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {product.features.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-ink-soft">
                <Check size={16} className="mt-0.5 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {product.description ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold tracking-tight text-ink">Description</h2>
          <div className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-ink-soft">
            {product.description}
          </div>
        </section>
      ) : null}

      {specs.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold tracking-tight text-ink">
            Full specifications
          </h2>
          <div className="mt-3 max-w-3xl overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {specs.map((s, i) => (
                  <tr key={`${s.label}-${i}`} className={i % 2 ? "bg-surface" : "bg-surface-sunken"}>
                    <th
                      scope="row"
                      className="w-2/5 px-4 py-2.5 text-left font-medium text-ink-soft"
                    >
                      {s.label}
                    </th>
                    <td className="px-4 py-2.5 text-ink">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <ReviewsSection
        productId={product.id}
        reviews={reviews}
        rating={rating}
        ratingCount={product.rating_count}
        canReview={canReview}
        alreadyReviewed={alreadyReviewed}
        signedIn={Boolean(user)}
      />

      {related.length > 0 ? (
        <Section
          title="You might also like"
          href={
            product.category ? `/products?category=${product.category.slug}` : "/products"
          }
          className="!px-0"
        >
          <ProductRail products={related} />
        </Section>
      ) : null}
    </div>
  );
}
