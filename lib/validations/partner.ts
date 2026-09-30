/**
 * Partnership types for "Become a partner". Shared by the form (a client
 * component), the server action and the admin list, and mirrored by the
 * CHECK on partner_applications.partner_type (0029).
 */
export const PARTNER_TYPES = ["retail", "corporate", "affiliate", "other"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_TYPE_INFO: Record<PartnerType, { label: string; hint: string }> = {
  retail: { label: "Retail / reseller", hint: "Stock our products in your shop or online store" },
  corporate: { label: "Corporate supply", hint: "Buy for a company, school or NGO on a purchase order" },
  affiliate: { label: "Affiliate", hint: "Earn commission for customers you send us" },
  other: { label: "Something else", hint: "Tell us below" },
};
