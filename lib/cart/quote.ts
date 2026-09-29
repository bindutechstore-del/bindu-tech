import "server-only";

import { cache } from "react";
import { getCartQuote } from "@/lib/actions/cart";

/**
 * The cart quote for this request, computed once.
 *
 * The header's cart icon and the phone navbar's cart count both need it;
 * without React `cache` each would run quote_cart() — the full pricing
 * function — separately on every page.
 */
export const getRequestCartQuote = cache(() => getCartQuote());
