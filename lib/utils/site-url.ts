/**
 * The site's public origin, without a trailing slash.
 *
 * NEXT_PUBLIC_SITE_URL when it is set (https://bindu.tech in production),
 * otherwise the Vercel project's production domain, and localhost only for
 * `next dev`. Email confirmation and password-reset links, the sitemap,
 * OpenGraph tags and payment callbacks all come from here, so a missing env
 * var can no longer send a customer's email link to localhost.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
