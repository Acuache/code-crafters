import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const CONFIGURATION_ERROR =
  "Falta la configuración administrativa de Supabase en el servidor.";

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(CONFIGURATION_ERROR);
  }

  return createClient<Database>(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
