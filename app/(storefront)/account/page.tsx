import type { Metadata } from "next";
import Link from "next/link";
import { Package, Heart, MapPin, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/account/profile-form";
import { AvatarForm } from "@/components/account/avatar-form";
import { PageHeader, Card } from "@/components/ui/primitives";
import { formatTaka } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [orders, wishlist, addresses] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, total_paisa, placed_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("placed_at", { ascending: false })
      .limit(3),
    supabase
      .from("wishlist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const recent = orders.data ?? [];

  const tiles = [
    {
      href: "/account/orders",
      icon: Package,
      label: "Orders",
      value: orders.count ?? 0,
    },
    {
      href: "/account/wishlist",
      icon: Heart,
      label: "Wishlist",
      value: wishlist.count ?? 0,
    },
    {
      href: "/account/addresses",
      icon: MapPin,
      label: "Addresses",
      value: addresses.count ?? 0,
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hello, ${user.profile?.full_name?.split(" ")[0] ?? "there"}`}
        description="Your orders, saved addresses and profile in one place."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="p-4 transition-shadow hover:shadow-lift">
              <t.icon size={18} className="text-brand-600" />
              <p className="mt-2 text-2xl font-bold tabular text-ink">{t.value}</p>
              <p className="text-sm text-ink-muted">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Recent orders</h2>
          <Link
            href="/account/orders"
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
          >
            See all <ArrowRight size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-muted">
            You have not placed an order yet.{" "}
            <Link href="/products" className="font-medium text-brand-600">
              Start shopping
            </Link>
            .
          </Card>
        ) : (
          <Card className="divide-y divide-line">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-surface-sunken"
              >
                <div>
                  <p className="text-sm font-medium tabular text-ink">
                    {o.order_number}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {new Date(o.placed_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {o.status.replace(/_/g, " ")}
                  </p>
                </div>
                <span className="tabular text-sm font-semibold text-ink">
                  {formatTaka(o.total_paisa)}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-ink">Your details</h2>
        <div className="mb-4">
          <AvatarForm userId={user.id} avatarUrl={user.profile?.avatar_url ?? null} />
        </div>
        <ProfileForm
          fullName={user.profile?.full_name ?? ""}
          phone={user.profile?.phone ?? ""}
          email={user.email ?? ""}
          marketingOptIn={user.profile?.marketing_opt_in ?? false}
        />
      </section>
    </>
  );
}
