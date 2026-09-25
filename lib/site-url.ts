// La URL pública del sitio, para las URLs absolutas de la metadata (og:image). Usa el dominio de
// producción de Vercel y no el de cada despliegue: ese puede estar protegido por Vercel
// Authentication, y Discord no podría bajar la tarjeta (spec 15).
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return "http://localhost:3000";
}
