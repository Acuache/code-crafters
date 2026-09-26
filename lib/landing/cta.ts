export type LandingLink = { label: string; href: string };

export type LandingCtas = {
  header: LandingLink;
  primary: LandingLink;
};

const GO_TO_DASHBOARD: LandingLink = { label: "Ir a mi panel", href: "/dashboard" };

// Los botones de la landing según haya sesión. El primario lleva al cuestionario después del login
// (el `next` lo valida parseNextPath, spec 15); "Entrar" deja el destino por defecto, el dashboard.
export function landingCtas(isSignedIn: boolean): LandingCtas {
  if (isSignedIn) {
    return { header: GO_TO_DASHBOARD, primary: GO_TO_DASHBOARD };
  }

  return {
    header: { label: "Entrar", href: "/login" },
    primary: { label: "Arma tu ruta", href: "/login?next=/quiz" },
  };
}
