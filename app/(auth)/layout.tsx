import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStoreSettings } from "@/lib/queries/settings";
import type { Metadata } from "next";

// Sign-in, sign-up and password pages have nothing to rank for.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();

  return (
    <div className="flex min-h-dvh flex-col bg-surface-sunken">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tracking-tight text-ink">
              {settings.store_name}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={15} />
            Back to shop
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-line py-5 text-center text-xs text-ink-muted">
        © {new Date().getFullYear()} {settings.store_name} · {settings.support_phone}
      </footer>
    </div>
  );
}
