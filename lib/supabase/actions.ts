"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OAuthProvider = "discord" | "google" | "github";

// El orden importa: las variables de entorno van antes que headers() porque un
// Host manipulado no debe poder influir en el redirectTo que recibe Supabase.
async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  if (process.env.NODE_ENV === "development") {
    const headersList = await headers();
    const host = headersList.get("host");
    if (host) {
      return `http://${host}`;
    }
  }

  return "http://localhost:3000";
}

// `formData` no se usa, pero el parámetro es obligatorio: el proveedor viene
// pre-atado con .bind() y <form action> siempre pasa el FormData como último argumento.
export async function signInWithProvider(
  provider: OAuthProvider,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_init_failed");
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Sin esto el Router Cache puede devolver el dashboard ya renderizado
  // al volver atrás después de cerrar sesión.
  revalidatePath("/", "layout");
  redirect("/login");
}
