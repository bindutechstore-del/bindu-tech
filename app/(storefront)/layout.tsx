import { Suspense } from "react";
import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { SupportWidget } from "@/components/storefront/support-widget";
import { NavProgress } from "@/components/ui/nav-progress";
import { getStoreSettings } from "@/lib/queries/settings";
import { getRequestCartQuote } from "@/lib/cart/quote";
import { MobileTabBar } from "@/components/storefront/mobile-tab-bar";
import { RequestProductDialog } from "@/components/storefront/request-product";
import { getSessionUser } from "@/lib/auth/session";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The chat bubble used to read these from environment variables only, so
  // changing the phone or WhatsApp number in Settings changed the footer but
  // not the button customers actually tap. Settings first; the old variables
  // stay as a fallback. (Same cached read the header and footer make.)
  // getSessionUser is cached per request; the header already calls it.
  const [settings, quote, user] = await Promise.all([
    getStoreSettings(),
    getRequestCartQuote(),
    getSessionUser(),
  ]);

  return (
    // Bottom padding on phones so the fixed navbar never covers the footer.
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      {/* Navigation progress bar — fires instantly on every internal link click */}
      <Suspense>
        <NavProgress />
      </Suspense>

      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileTabBar cartCount={quote.item_count} />
      <RequestProductDialog
        defaultName={user?.profile?.full_name ?? ""}
        defaultEmail={user?.email ?? ""}
        defaultPhone={user?.profile?.phone ?? ""}
      />
      <SupportWidget
        phone={settings.support_phone || process.env.NEXT_PUBLIC_SUPPORT_PHONE}
        whatsapp={settings.support_whatsapp || process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP}
        messenger={settings.social_links.messenger || process.env.NEXT_PUBLIC_SUPPORT_MESSENGER}
        email={
          settings.support_email.includes("@")
            ? settings.support_email
            : process.env.NEXT_PUBLIC_SUPPORT_EMAIL
        }
      />
    </div>
  );
}
