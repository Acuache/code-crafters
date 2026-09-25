import { NextResponse } from "next/server";
import { parseNextPath } from "@/lib/supabase/next-path";
import { createClient } from "@/lib/supabase/server";

// Si el login falla, `next` vuelve a /login para que el reintento no pierda el link (spec 15).
function loginErrorUrl(origin: string, errorCode: string, nextPath: string | null): string {
  const nextQuery = nextPath ? `&next=${encodeURIComponent(nextPath)}` : "";
  return `${origin}/login?error=${errorCode}${nextQuery}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const nextPath = parseNextPath(searchParams.get("next"));
  const destination = nextPath ?? "/dashboard";

  if (!code) {
    const errorCode = providerError === "access_denied" ? "oauth_denied" : "oauth_callback_failed";
    return NextResponse.redirect(loginErrorUrl(origin, errorCode, nextPath));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(loginErrorUrl(origin, "oauth_callback_failed", nextPath));
  }

  // En local no hay balanceador delante, así que el origin de la request ya es
  // el definitivo; en Vercel sí lo hay y el host original llega en x-forwarded-host.
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${destination}`);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${destination}`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
