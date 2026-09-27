"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

/**
 * Permanent delete, next to the reversible Archive.
 *
 * The confirmation spells out what goes and what stays, because "delete" in
 * a shop is ambiguous: an operator worries about old invoices, and those are
 * safe — order lines keep their own copy of the product.
 */
export function DeleteProductButton({
  id,
  name,
  variant = "icon",
}: {
  id: string;
  name: string;
  /** "icon" for a table row, "button" for the product's own page. */
  variant?: "icon" | "button";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const remove = () => {
    const sure = confirm(
      `Delete “${name}” permanently?\n\n` +
        "Its pictures, reviews and quantity discounts are removed, any bundle " +
        "it is part of is deleted, and it disappears from every cart and " +
        "wishlist. Past orders keep their record.\n\n" +
        "This cannot be undone. To hide it but keep it, use Archive instead.",
    );
    if (!sure) return;

    start(async () => {
      let result: Awaited<ReturnType<typeof deleteProduct>>;
      try {
        result = await deleteProduct(id);
      } catch {
        toast.error("Could not reach the server. Try again.");
        return;
      }
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete the product.");
        return;
      }
      toast.success(result.message ?? "Product deleted.");
      if (variant === "button") router.push("/admin/products");
      else router.refresh();
    });
  };

  if (variant === "button") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={remove} loading={pending}
        className="text-danger hover:bg-danger-soft"
      >
        <Trash2 size={14} />
        Delete
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
      title="Delete permanently"
      aria-label={`Delete ${name} permanently`}
    >
      <Trash2 size={15} />
    </button>
  );
}
