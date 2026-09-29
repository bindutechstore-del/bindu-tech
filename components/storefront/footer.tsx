import Link from "next/link";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { SocialIcon } from "./social-icon";
import { RequestProductButton } from "./request-product";
import { getStoreSettings, getDeliveryZones } from "@/lib/queries/settings";
import { getCategories } from "@/lib/queries/catalog";
import { NewsletterForm } from "./newsletter-form";
import { formatTaka } from "@/lib/utils/money";

export async function Footer() {
  const [settings, categories, zones] = await Promise.all([
    getStoreSettings(),
    getCategories(),
    getDeliveryZones(),
  ]);

  const policies = [
    ["/about", "About us"],
    ["/contact", "Contact us"],
    ["/faq", "FAQ"],
    ["/shipping", "Shipping policy"],
    ["/returns", "Return & refund"],
    ["/warranty", "Warranty policy"],
    ["/privacy", "Privacy policy"],
    ["/terms", "Terms & conditions"],
  ] as const;

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="border-b border-line bg-brand-50/60">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Offers, restocks and price drops
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                One email a week. No spam, unsubscribe any time.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tracking-tight">{settings.store_name}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            {settings.store_description}
          </p>
          <div className="mt-4 flex gap-2">
            {settings.social_links?.facebook ? (
              <a
                href={settings.social_links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-soft hover:bg-surface-sunken"
              >
                <SocialIcon name="facebook" />
              </a>
            ) : null}
            {settings.social_links?.instagram ? (
              <a
                href={settings.social_links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-soft hover:bg-surface-sunken"
              >
                <SocialIcon name="instagram" />
              </a>
            ) : null}
            {settings.social_links?.youtube ? (
              <a
                href={settings.social_links.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-soft hover:bg-surface-sunken"
              >
                <SocialIcon name="youtube" />
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/products" className="text-ink-muted hover:text-brand-700">
                All products
              </Link>
            </li>
            {categories.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="text-ink-muted hover:text-brand-700"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Help</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/track" className="text-ink-muted hover:text-brand-700">
                Track your order
              </Link>
            </li>
            {policies.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-ink-muted hover:text-brand-700">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <RequestProductButton className="inline-flex items-center gap-1.5 text-ink-muted hover:text-brand-700 [&_svg]:size-4" />
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Talk to us</h3>
          <ul className="mt-3 space-y-3 text-sm text-ink-muted">
            {/* Each line only when Settings has something to put on it. The
                email line needs a real address: "bindutech.com" made a
                mailto: link that opened an email to nobody. */}
            {settings.support_phone ? (
              <li className="flex gap-2">
                <Phone size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                <a href={`tel:${settings.support_phone}`} className="hover:text-brand-700">
                  {settings.support_phone}
                </a>
              </li>
            ) : null}
            {settings.support_email.includes("@") ? (
              <li className="flex gap-2">
                <Mail size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                <a href={`mailto:${settings.support_email}`} className="hover:text-brand-700">
                  {settings.support_email}
                </a>
              </li>
            ) : null}
            {settings.support_hours ? (
              <li className="flex gap-2">
                <Clock size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                <span>{settings.support_hours}</span>
              </li>
            ) : null}
            {settings.showroom_address.trim() ? (
              <li className="flex gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                <span>{settings.showroom_address}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      {/* Delivery charges are data from delivery_zones, not a hardcoded table. */}
      <div className="border-t border-line bg-surface-sunken">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Delivery charges
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {zones.map((z) => (
              <div key={z.id} className="rounded-lg border border-line bg-surface p-3">
                <p className="text-sm font-medium text-ink">{z.name}</p>
                <p className="mt-0.5 text-sm text-ink-soft tabular">
                  {formatTaka(z.fee_paisa)} · {z.min_days}–{z.max_days} days
                </p>
                {z.free_above_paisa ? (
                  <p className="mt-0.5 text-xs text-success">
                    Free over {formatTaka(z.free_above_paisa)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-ink-muted sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <p>
              © {new Date().getFullYear()} {settings.store_name}. All rights reserved.
            </p>
            <p className="text-ink-faint">Developed by Nafis Hossain Momen</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning">
              🚧 Under Development
            </span>
            <p>Cash on delivery nationwide · Official warranty</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
