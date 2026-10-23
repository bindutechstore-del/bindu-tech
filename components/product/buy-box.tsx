"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Zap, Heart, Share2, Check } from "lucide-react";
import type { Product, ProductVariant } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { addToCart } from "@/lib/actions/cart";
import { toggleWishlist } from "@/lib/actions/account";
import { formatTaka, discountPercent } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

/**
 * Price, variant picker, quantity, and the four actions on a PDP.
 *
 * The price shown here is display-only. A variant's price is read from the
 * variant row (falling back to the product), exactly as `effective_price()`
 * does in SQL — but the server re-derives it on add-to-cart regardless, so a
 * disagreement between the two is a cosmetic bug, never a pricing one.
 */
export function BuyBox({
  product,
  variants,
  lowStockThreshold,
  signedIn,
}: {
  product: Product;
  variants: ProductVariant[];
  lowStockThreshold: number;
  signedIn: boolean;
}) {
  // With several sizes the shopper picks one themselves — a pre-selected "S"
  // is how wrong sizes get ordered. A single option is simply chosen.
  const [variantId, setVariantId] = useState<string | null>(
    variants.length === 1 && variants[0].stock > 0 ? variants[0].id : null,
  );
  // "Size" when every option is a size, otherwise the generic word.
  const optionWord = variants.length > 0 && variants.every((v) => v.attributes?.size) ? "size" : "option";
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [buying, startBuying] = useTransition();
  const [wishing, startWishing] = useTransition();
  const router = useRouter();

  const variant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId],
  );

  const price = variant?.price_paisa ?? product.price_paisa;
  const compareAt = variant?.compare_at_paisa ?? product.compare_at_paisa;
  const stock = variant ? variant.stock : product.stock;
  const off = discountPercent(price, compareAt);
  const inStock = stock > 0;
  const needsChoice = variants.length > 0 && !variant;
  const maxQty = Math.min(stock, 99);

  function buyNow() {
    startBuying(async () => {
      const result = await addToCart({
        productId: product.id,
        variantId,
        quantity: qty,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not start checkout.");
        return;
      }
      if (result.notice) toast.warning(result.notice);
      router.push("/checkout");
    });
  }

  function onWishlist() {
    startWishing(async () => {
      const result = await toggleWishlist(product.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not update your wishlist.");
        return;
      }
      setWishlisted(Boolean(result.wishlisted));
      toast.success(result.wishlisted ? "Saved to wishlist" : "Removed from wishlist");
    });
  }

  async function share() {
    const url = window.location.href;
    // Native share sheet on mobile, clipboard everywhere else.
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch {
        // User dismissed the sheet — fall through to copying.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="tabular text-3xl font-bold tracking-tight text-ink">
          {formatTaka(price)}
        </span>
        {compareAt ? (
          <span className="tabular text-base text-ink-faint line-through">
            {formatTaka(compareAt)}
          </span>
        ) : null}
        {off ? <Badge tone="sale">Save {off}%</Badge> : null}
      </div>

      <p className="mt-1.5 text-sm">
        {inStock ? (
          <span
            className={cn(
              "font-medium",
              stock <= lowStockThreshold ? "text-warning" : "text-success",
            )}
          >
            {stock <= lowStockThreshold ? `Only ${stock} left` : "In stock"}
          </span>
        ) : (
          <span className="font-medium text-danger">Out of stock</span>
        )}
      </p>

      {variants.length > 0 ? (
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-ink-soft">
            {optionWord === "size" ? "Size" : "Choose an option"}
            {needsChoice ? (
              <span className="ml-2 text-xs font-normal text-warning">Choose a {optionWord}</span>
            ) : null}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((v) => {
              const disabled = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setVariantId(v.id);
                    setQty(1);
                  }}
                  disabled={disabled}
                  aria-pressed={v.id === variantId}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors",
                    v.id === variantId
                      ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                      : "border-line-strong text-ink-soft hover:border-ink-faint",
                    disabled && "cursor-not-allowed opacity-40 line-through",
                  )}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm font-medium text-ink-soft">Quantity</span>
        <div className="flex items-center rounded-lg border border-line-strong">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1 || !inStock}
            className="inline-flex size-9 items-center justify-center text-ink-soft disabled:opacity-30 enabled:hover:bg-surface-sunken"
            aria-label="Decrease quantity"
          >
            <Minus size={15} />
          </button>
          <span className="w-10 text-center text-sm font-medium tabular" aria-live="polite">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty || !inStock}
            className="inline-flex size-9 items-center justify-center text-ink-soft disabled:opacity-30 enabled:hover:bg-surface-sunken"
            aria-label="Increase quantity"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <AddToCartButton
          productId={product.id}
          variantId={variantId}
          quantity={qty}
          disabled={!inStock || needsChoice}
          disabledLabel={needsChoice && inStock ? `Choose a ${optionWord}` : undefined}
          size="lg"
          variant="outline"
          block
        />
        <Button
          onClick={buyNow}
          disabled={!inStock || needsChoice}
          loading={buying}
          size="lg"
          block
        >
          {!buying ? <Zap /> : null}
          Buy now
        </Button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          onClick={onWishlist}
          loading={wishing}
          variant="ghost"
          size="sm"
          title={signedIn ? undefined : "Sign in to save items"}
        >
          {!wishing ? (
            <Heart
              size={16}
              className={wishlisted ? "fill-danger text-danger" : undefined}
            />
          ) : null}
          {wishlisted ? "Saved" : "Save for later"}
        </Button>

        <Button onClick={share} variant="ghost" size="sm">
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          {copied ? "Copied" : "Share"}
        </Button>
      </div>
    </div>
  );
}
