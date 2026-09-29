import type { Metadata } from "next";
import { TrackForm } from "@/components/checkout/track-form";
import { getStoreSettings } from "@/lib/queries/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { store_name } = await getStoreSettings();
  return {
    title: "Track your order",
    alternates: { canonical: "/track" },
    description: `Enter your order number and mobile number to see exactly where your ${store_name} order is.`,
  };
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Track your order</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        No account needed. Your order number plus the mobile number on the order is
        enough.
      </p>
      <TrackForm defaultRef={ref ?? ""} />
    </div>
  );
}
