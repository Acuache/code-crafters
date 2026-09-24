import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// La landing, el login y /sistema-diseno son públicos.
const PRIVATE_PATH_PREFIXES = ["/dashboard", "/quiz", "/paths", "/admin"];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Refresca el token si venció y valida el JWT contra las claves de firma de Supabase.
  const { data } = await supabase.auth.getClaims();

  // Chequeo optimista: redirige antes de que la página empiece a transmitirse (con loading.tsx ya
  // no podría devolver un 307). La verificación real sigue en requireUser() de cada página.
  if (!data?.claims && isPrivatePath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
