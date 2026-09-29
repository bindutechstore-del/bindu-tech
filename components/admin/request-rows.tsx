"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, Mail, MessageCircle, Trash2 } from "lucide-react";
import {
  setProductRequestStatus,
  deleteProductRequest,
  type RequestStatus,
} from "@/lib/actions/requests";
import { Card, Badge } from "@/components/ui/primitives";
import { formatTaka } from "@/lib/utils/money";

export interface ProductRequestRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  quantity: number;
  product_name: string;
  description: string | null;
  expected_price_paisa: number | null;
  status: RequestStatus;
  created_at: string;
}

const STATUS: Record<RequestStatus, { label: string; tone: "brand" | "warning" | "success" | "neutral" }> = {
  new: { label: "New", tone: "brand" },
  contacted: { label: "Contacted", tone: "warning" },
  sourced: { label: "Sourced", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

const when = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function RequestRows({ rows }: { rows: ProductRequestRow[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
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
                    <span className="font-semibold text-ink">{r.product_name}</span>
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted tabular">
                    Qty {r.quantity}
                    {r.expected_price_paisa != null
                      ? ` · expects ${formatTaka(r.expected_price_paisa)}`
                      : ""}
                    {" · "}
                    {when.format(new Date(r.created_at))}
                  </p>
                  {r.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{r.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium text-ink">{r.name}</span>
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
                    onChange={(e) =>
                      run(() => setProductRequestStatus(r.id, e.target.value as RequestStatus))
                    }
                    aria-label={`Status of ${r.product_name}`}
                    className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm focus:border-brand-600 focus:outline-none"
                  >
                    {(Object.keys(STATUS) as RequestStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS[s].label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete the request for “${r.product_name}”?`)) return;
                      run(() => deleteProductRequest(r.id));
                    }}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                    aria-label={`Delete the request for ${r.product_name}`}
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
