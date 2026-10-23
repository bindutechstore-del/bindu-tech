"use server";

import { searchSuggestions, type SearchSuggestion } from "@/lib/queries/catalog";

/** Live results for the header search box. Bounded input, six rows out. */
export async function suggestProducts(term: string): Promise<SearchSuggestion[]> {
  if (typeof term !== "string") return [];
  return searchSuggestions(term.slice(0, 60));
}
