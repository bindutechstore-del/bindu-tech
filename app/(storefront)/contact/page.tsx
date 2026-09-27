import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, MessageCircle, PackageSearch } from "lucide-react";
import { getStoreSettings } from "@/lib/queries/settings";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { store_name } = await getStoreSettings();
  return {
    title: "Contact us",
    description: `Call, WhatsApp, Messenger or email ${store_name} — and where to find our counter in Dhaka.`,
  };
}

export default async function ContactPage() {
  const settings = await getStoreSettings();

  // Settings first, so what the admin types is what the buttons dial.
  const whatsapp = (settings.support_whatsapp || process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "")
    .replace(/[^0-9]/g, "");
  const messenger = settings.social_links.messenger || process.env.NEXT_PUBLIC_SUPPORT_MESSENGER;
  const email = settings.support_email.includes("@") ? settings.support_email : "";

  // Only render a channel that is actually configured — no dead buttons.
  const channels = [
    whatsapp && {
      href: `https://wa.me/${whatsapp}`,
      icon: MessageCircle,
      label: "WhatsApp",
      value: settings.support_whatsapp,
      hint: "Fastest reply — usually within minutes",
      tone: "text-success",
      external: true,
    },
    settings.support_phone && {
      href: `tel:${settings.support_phone}`,
      icon: Phone,
      label: "Phone",
      value: settings.support_phone,
      hint: settings.support_hours,
      tone: "text-brand-600",
      external: false,
    },
    messenger && {
      href: `https://m.me/${messenger}`,
      icon: MessageCircle,
      label: "Messenger",
      value: `m.me/${messenger}`,
      hint: "Chat with us on Facebook",
      tone: "text-brand-600",
      external: true,
    },
    email && {
      href: `mailto:${email}`,
      icon: Mail,
      label: "Email",
      value: email,
      hint: "For invoices, warranty paperwork and anything long",
      tone: "text-ink",
      external: false,
    },
  ].filter(Boolean) as {
    href: string;
    icon: typeof Phone;
    label: string;
    value: string;
    hint: string;
    tone: string;
    external: boolean;
  }[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Contact</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-ink">Talk to us</h1>
      <p className="mt-3 text-base leading-7 text-ink-soft">
        A real person answers every one of these. If your question is about an order
        you have already placed, have the order number ready — it makes this much
        faster.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {channels.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target={c.external ? "_blank" : undefined}
            rel={c.external ? "noopener noreferrer" : undefined}
          >
            <Card className="h-full p-5 transition-shadow hover:shadow-lift">
              <c.icon size={20} className={c.tone} />
              <h2 className="mt-2.5 text-sm font-semibold text-ink">{c.label}</h2>
              <p className="mt-0.5 break-words text-sm font-medium text-brand-600">
                {c.value}
              </p>
              <p className="mt-1 text-xs text-ink-muted">{c.hint}</p>
            </Card>
          </a>
        ))}
      </div>

      <Card className="mt-4 p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <MapPin size={15} className="text-warning" />
          Our counter
        </h2>
        <address className="mt-1.5 text-[15px] not-italic leading-7 text-ink-soft">
          {settings.showroom_address}
        </address>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
          <Clock size={14} />
          {settings.support_hours}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Demo units for audio products are available at the counter. Call ahead if you
          want a specific model on the shelf when you arrive.
        </p>
      </Card>

      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-base font-semibold text-ink">Chasing an order?</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Tracking is instant — you do not need us for it.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/track">
            <PackageSearch />
            Track your order
          </Link>
        </Button>
      </Card>
    </div>
  );
}
