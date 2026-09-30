import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gift, Wallet, Sparkles } from "lucide-react";
import { getReferralSummary, getPointsSummary } from "@/lib/queries/referral";
import { getStoreSettings } from "@/lib/queries/settings";
import { ReferralShare } from "@/components/account/referral-share";
import { Card } from "@/components/ui/primitives";
import { formatTaka } from "@/lib/utils/money";
import { siteUrl } from "@/lib/utils/site-url";

export const metadata: Metadata = { title: "Refer a friend" };
export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const [summary, settings, points] = await Promise.all([
    getReferralSummary(),
    getStoreSettings(),
    getPointsSummary(),
  ]);

  // The summary is null only when nobody is signed in; a referral code has to
  // belong to somebody.
  if (!summary) redirect("/sign-in?next=/account/referrals");

  const site = siteUrl();
  const link = summary.code ? `${site}/sign-up?ref=${summary.code}` : "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Refer a friend</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Share your link. When someone new orders through it and the parcel is
          delivered, you both get credit to spend at {settings.store_name}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-success" />
            <p className="text-xs font-medium text-ink-muted">Your credit</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular tracking-tight text-ink">
            {formatTaka(summary.balancePaisa)}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            Applied at checkout, against any order.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-brand-600" />
            <p className="text-xs font-medium text-ink-muted">Friends referred</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular tracking-tight text-ink">
            {summary.credited}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {summary.pending > 0
              ? `${summary.pending} waiting on a first delivery`
              : "Credited once their first order arrives"}
          </p>
        </Card>
      </div>

      {/* Points sit beside credit because a customer thinks of them as one
          question: "what have I got to spend?" */}
      {points && points.enabled ? (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-ink">Reward points</h2>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-2xl font-bold tabular tracking-tight text-ink">
              {points.balance.toLocaleString()}
            </p>
            <p className="text-sm text-ink-muted">
              worth {formatTaka(points.worthPaisa)} at checkout
            </p>
          </div>

          <p className="mt-1 text-xs text-ink-faint">
            Earned when an order is delivered.
            {points.minRedeemPoints > 0
              ? ` You need ${points.minRedeemPoints.toLocaleString()} to redeem.`
              : ""}
          </p>

          {points.ledger.length > 0 ? (
            <ul className="mt-3 divide-y divide-line border-t border-line text-sm">
              {points.ledger.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <span className="min-w-0">
                    <span className="block text-ink">{e.reason}</span>
                    <span className="block text-xs text-ink-faint">
                      {new Date(e.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-semibold tabular ${
                      e.delta_points > 0 ? "text-success" : "text-ink-muted"
                    }`}
                  >
                    {e.delta_points > 0 ? "+" : ""}
                    {e.delta_points.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <ReferralShare
        code={summary.code}
        link={link}
        referrerPaisa={summary.reward.referrerPaisa}
        referredPaisa={summary.reward.referredPaisa}
      />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">Credit history</h2>
        {summary.ledger.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Nothing yet. Credit appears here as soon as a referral is delivered.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {summary.ledger.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2.5">
                <span className="min-w-0">
                  <span className="block text-ink">{e.reason}</span>
                  <span className="block text-xs text-ink-faint">
                    {new Date(e.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
                <span
                  className={`shrink-0 font-semibold tabular ${
                    e.delta_paisa > 0 ? "text-success" : "text-ink-muted"
                  }`}
                >
                  {e.delta_paisa > 0 ? "+" : "−"}
                  {formatTaka(Math.abs(e.delta_paisa))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
