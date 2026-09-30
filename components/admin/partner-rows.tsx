"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, Mail, MessageCircle, Trash2, MapPin, UserCheck } from "lucide-react";
import {
  setPartnerStatus,
  deletePartnerApplication,
  type PartnerStatus,
} from "@/lib/actions/partners";
import { PARTNER_TYPE_INFO, type PartnerType } from "@/lib/validations/partner";
import { Card, Badge } from "@/components/ui/primitives";

export interface PartnerRow {
  id: string;
  user_id: string | null;
  store_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  partner_type: PartnerType;
  city: string | null;
  message: string | null;
  status: PartnerStatus;
  created_at: string;
}

const STATUS: Record<PartnerStatus, { label: string; tone: "brand" | "warning" | "success" | "neutral" }> = {
  new: { label: "New", tone: "brand" },
  contacted: { label: "Contacted", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "neutral" },
};

const when = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function PartnerRows({ rows }: { rows: PartnerRow[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Could not update.");
      else router.refresh();
    });

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const wa = r.phone ? `https://wa.me/88${r.phone.replace(/^\+?88/, "")}` : null;
        return (
          <li key={r.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{r.store_name}</span>
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                    <Badge tone="neutral">{PARTNER_TYPE_INFO[r.partner_type]?.label ?? r.partner_type}</Badge>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-muted tabular">
                    <span>{when.format(new Date(r.created_at))}</span>
                    {r.city ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} />
                        {r.city}
                      </span>
                    ) : null}
                    {r.user_id ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <UserCheck size={12} />
                        Has an account
                      </span>
                    ) : null}
                  </p>
                  {r.message ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{r.message}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium text-ink">
                      {r.first_name} {r.last_name}
                    </span>
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700">
                      <Mail size={14} />
                      {r.email}
                    </a>
                    {r.phone ? (
                      <>
                        <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700">
                          <Phone size={14} />
                          {r.phone}
                        </a>
                        {wa ? (
                          <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-success hover:opacity-80">
                            <MessageCircle size={14} />
                            WhatsApp
                          </a>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={r.status}
                    disabled={pending}
                    onChange={(e) => run(() => setPartnerStatus(r.id, e.target.value as PartnerStatus))}
                    aria-label={`Status of ${r.store_name}`}
                    className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm focus:border-brand-600 focus:outline-none"
                  >
                    {(Object.keys(STATUS) as PartnerStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS[s].label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete the application from “${r.store_name}”?`)) return;
                      run(() => deletePartnerApplication(r.id));
                    }}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                    aria-label={`Delete the application from ${r.store_name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
