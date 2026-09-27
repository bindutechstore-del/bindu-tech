import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductForm } from "@/components/admin/product-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import type { Brand, Category, ProductAdmin } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("products");
  const db = createAdminClient();

  // Service role, so `cost_paisa` comes back — it is revoked for both client
  // roles at the column level in migration 0011.
  const [{ data: product }, { data: categories }, { data: brands }, { data: gallery }] =
    await Promise.all([
      db.from("products").select("*").eq("id", id).maybeSingle(),
      db.from("categories").select("*").order("position"),
      db.from("brands").select("*").order("name"),
      // Without these the form would open with only the main picture, and the
      // next save would quietly delete the rest of the gallery.
      db.from("product_images").select("url").eq("product_id", id).order("position"),
    ]);

  if (!product) notFound();
  const p = product as ProductAdmin;

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} />
        All products
      </Link>

      <PageHeader
        title={p.name}
        description={`SKU ${p.sku} · ${p.units_sold} sold`}
        actions={
          <div className="flex flex-wrap gap-2">
            {p.status === "active" ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/products/${p.slug}`} target="_blank">
                  View live
                  <ExternalLink size={14} />
                </Link>
              </Button>
            ) : null}
            <DeleteProductButton id={p.id} name={p.name} variant="button" />
          </div>
        }
      />

      <ProductForm
        product={p}
        images={((gallery ?? []) as { url: string }[]).map((g) => g.url)}
        categories={(categories ?? []) as Category[]}
        brands={(brands ?? []) as Brand[]}
      />
    </>
  );
}
