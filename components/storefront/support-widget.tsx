"use client";

import { useState } from "react";
import { MessageCircle, Phone, X, Mail } from "lucide-react";

/**
 * Floating support launcher: WhatsApp, Messenger, phone, email.
 *
 * Every channel is a real deep link built from env values. If a channel has no
 * configured handle it is not rendered — no dead buttons (CLAUDE.md rule 6).
 */
export function SupportWidget({
  phone,
  whatsapp,
  messenger,
  email,
}: {
  phone?: string;
  whatsapp?: string;
  messenger?: string;
  email?: string;
}) {
  const [open, setOpen] = useState(false);

  const channels = [
    whatsapp && {
      href: `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`,
      label: "WhatsApp",
      hint: "Fastest reply",
      icon: <MessageCircle size={16} />,
      tone: "text-success",
    },
    messenger && {
      href: `https://m.me/${messenger}`,
      label: "Messenger",
      hint: "Chat on Facebook",
      icon: <MessageCircle size={16} />,
      tone: "text-brand-600",
    },
    phone && {
      href: `tel:${phone}`,
      label: "Call us",
      hint: phone,
      icon: <Phone size={16} />,
      tone: "text-ink",
    },
    email && {
      href: `mailto:${email}`,
      label: "Email",
      hint: email,
      icon: <Mail size={16} />,
      tone: "text-ink",
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    hint: string;
    icon: React.ReactNode;
    tone: string;
  }[];

  if (channels.length === 0) return null;

  return (
    // Above the phone navbar on phones; bottom corner from tablet width up.
    <div className="fixed bottom-20 right-4 z-40 md:bottom-4 print:hidden">
      {open ? (
        <div className="mb-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Need a hand?</p>
            <p className="text-xs text-ink-muted">We usually reply in minutes.</p>
          </div>
          <ul>
            {channels.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunken"
                >
                  <span className={c.tone}>{c.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{c.label}</span>
                    <span className="block truncate text-xs text-ink-muted">{c.hint}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close support menu" : "Open support menu"}
        className="ml-auto flex size-13 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop transition hover:bg-brand-700"
        style={{ width: 52, height: 52 }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
