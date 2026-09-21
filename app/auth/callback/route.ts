import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");

  if (!code) {
    const errorCode =
      providerError === "access_denied" ? "oauth_denied" : "oauth_callback_failed";
    return NextResponse.redirect(`${origin}/login?error=${errorCode}`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
  }

  // En local no hay balanceador delante, así que el origin de la request ya es
  // el definitivo; en Vercel sí lo hay y el host original llega en x-forwarded-host.
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
