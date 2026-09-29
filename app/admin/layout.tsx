import Link from "next/link";
import { requireStaff, can } from "@/lib/auth/session";
import { getStoreSettings } from "@/lib/queries/settings";
import { countPendingManualPayments, countNewProductRequests } from "@/lib/queries/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The real gate. Middleware also redirects, but that is UX — this is the
  // check that decides whether admin data is fetched at all.
  const user = await requireStaff();

  // Independent reads, so in parallel. The pending count is only worth
  // making for someone who can act on it.
  const [settings, pendingPayments, newRequests] = await Promise.all([
    getStoreSettings(),
    can(user, "payments") ? countPendingManualPayments() : Promise.resolve(0),
    can(user, "products") ? countNewProductRequests() : Promise.resolve(0),
  ]);

  return (
    <div className="flex min-h-dvh bg-surface-sunken">
      <AdminNav
        permissions={user.permissions}
        storeName={settings.store_name}
        pendingPayments={pendingPayments}
        newRequests={newRequests}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:px-6">
          <div className="lg:hidden" />
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-ink-muted hover:text-ink"
              target="_blank"
            >
              View store ↗
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-ink">
                {user.profile?.full_name ?? user.email}
              </p>
              <p className="text-[11px] capitalize text-ink-muted">{user.role}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
