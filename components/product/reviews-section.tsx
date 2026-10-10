import Link from "next/link";
import { BadgeCheck, MessageSquare } from "lucide-react";
import type { Review } from "@/types/database";
import { Rating, Badge, EmptyState } from "@/components/ui/primitives";
import { ReviewForm } from "./review-form";

/**
 * Reviews block: distribution histogram, the list, and the write form.
 *
 * Only approved reviews reach here (the RLS policy and the query both filter
 * on it), so the counts shown always match the `products.rating_*` rollup.
 */
export function ReviewsSection({
  productId,
  reviews,
  rating,
  ratingCount,
  canReview,
  alreadyReviewed,
  signedIn,
  inTab = false,
}: {
  productId: string;
  reviews: Review[];
  rating: number | null;
  ratingCount: number;
  canReview: boolean;
  alreadyReviewed: boolean;
  signedIn: boolean;
  /** Inside the product tabs: the tab supplies the spacing, label and anchor. */
  inTab?: boolean;
}) {
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const shown = reviews.length || 1;

  return (
    <section
      className={inTab ? undefined : "mt-12 border-t border-line pt-10"}
      id={inTab ? undefined : "reviews"}
    >
      <h2 className={inTab ? "sr-only" : "text-lg font-bold tracking-tight text-ink"}>
        Ratings & reviews
      </h2>

      <div className="mt-5 grid gap-8 lg:grid-cols-[280px_1fr]">
        <div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular text-ink">
                {rating?.toFixed(1) ?? "—"}
              </span>
              <span className="text-sm text-ink-muted">out of 5</span>
            </div>
            <Rating value={rating} size={16} className="mt-1.5" />
            <p className="mt-1 text-xs text-ink-muted tabular">
              {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
            </p>

            <div className="mt-4 space-y-1.5">
              {buckets.map((b) => (
                <div key={b.star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right tabular text-ink-muted">{b.star}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-warning"
                      style={{ width: `${(b.count / shown) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right tabular text-ink-muted">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {canReview && !alreadyReviewed ? (
            <div className="mt-4">
              <ReviewForm productId={productId} />
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-line bg-surface-sunken px-4 py-3 text-xs leading-5 text-ink-muted">
              {alreadyReviewed
                ? "You have already reviewed this product. Thanks!"
                : signedIn
                  ? "You can write a review once this product has been delivered to you."
                  : (
                    <>
                      <Link href="/sign-in" className="font-medium text-brand-600">
                        Sign in
                      </Link>{" "}
                      to review a product you have bought.
                    </>
                  )}
            </p>
          )}
        </div>

        <div>
          {reviews.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={28} />}
              title="No reviews yet"
              description="Be the first to review this product after it is delivered."
            />
          ) : (
            <ul className="divide-y divide-line">
              {reviews.map((r) => (
                <li key={r.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rating value={r.rating} size={13} />
                    {r.is_verified_purchase ? (
                      <Badge tone="success">
                        <BadgeCheck size={11} />
                        Verified purchase
                      </Badge>
                    ) : null}
                    <span className="ml-auto text-xs text-ink-faint">
                      {new Date(r.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {r.title ? (
                    <h3 className="mt-1.5 text-sm font-semibold text-ink">{r.title}</h3>
                  ) : null}
                  {r.body ? (
                    <p className="mt-1 text-sm leading-6 text-ink-soft">{r.body}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
