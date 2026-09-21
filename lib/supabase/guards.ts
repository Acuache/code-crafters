import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// El rol sale de profiles, no del JWT: claims.role es el rol de Postgres
// (authenticated/anon), no el rol de la app (user/admin).
export type SessionUser = {
  userId: string;
  email: string | undefined;
  username: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
};

export async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, role")
    .eq("id", claims.sub)
    .single();

  return {
    userId: claims.sub,
    email: claims.email,
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? "user",
  };
}

export async function requireAdmin(): Promise<SessionUser & { role: "admin" }> {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  // Repetir `role` no es redundante: el early return ya lo angostó a "admin" y
  // así ese tipo sobrevive al spread, que lo ensancharía a "user" | "admin".
  return { ...user, role: user.role };
}
