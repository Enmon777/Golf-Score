import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key?.startsWith("sb_publishable_")
    ? createClient<Database>(url, key)
    : null;
export function database() {
  if (!supabase)
    throw new Error(
      "Configure your Supabase URL and publishable key in .env.local.",
    );
  return supabase;
}
export function errorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Something went wrong. Please try again.";
}
