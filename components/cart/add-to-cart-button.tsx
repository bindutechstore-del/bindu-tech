"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/cart";

/**
 * The only way an item enters a cart.
 *
 * Note there is no price anywhere in this component. It sends ids; the server
 * decides what anything costs.
 *
 * Performance: the server action runs first, then router.refresh() happens in
 * the background via startTransition so the button doesn't stay "loading"
 * until the whole page re-renders. The user sees "Added" instantly.
 */
export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  disabled,
  label = "Add to cart",
  disabledLabel = "Out of stock",
  size = "md",
  variant = "primary",
  block,
}: {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  disabled?: boolean;
  label?: string;
  /** What a disabled button says — "Out of stock" unless told otherwise. */
  disabledLabel?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  block?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    try {
      const result = await addToCart({ productId, variantId, quantity });

      if (!result.ok) {
        toast.error(result.error ?? "Could not add that to your cart.");
        return;
      }

      if (result.notice) toast.warning(result.notice);
      else toast.success("Added to cart");

      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    } finally {
      setLoading(false);
    }

    // Refresh the page in the background so the header cart count updates
    // without blocking the button. User sees "Added" instantly.
    router.refresh();
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      size={size}
      variant={disabled ? "outline" : variant}
      block={block}
      aria-label={disabled ? disabledLabel : label}
    >
      {!loading ? added ? <Check /> : <ShoppingCart /> : null}
      {disabled ? disabledLabel : added ? "Added" : label}
    </Button>
  );
}
