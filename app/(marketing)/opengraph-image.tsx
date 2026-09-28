import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "DevPathlles: deja de adivinar qué curso de DevTalles sigue";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori no decodifica WebP: la tarjeta usa la copia en PNG del logo (spec 15).
const LOGO_WIDTH = 360;
const LOGO_HEIGHT = 128;
const logoData = await readFile(join(process.cwd(), "public/og-logo.png"), "base64");
const logoSrc = `data:image/png;base64,${logoData}`;

// Los tokens de app/globals.css en hex: en ImageResponse no hay clases ni variables CSS.
const BRAND_GRADIENT = "linear-gradient(135deg, #3a14c4 0%, #5a16c1 100%)"; // --primary → --primary-end
const LOGO_BACKDROP = "#171027"; // --logo-backdrop
const TEXT_COLOR = "#f0eeff"; // --foreground del tema oscuro
const HIGHLIGHT_COLOR = "#c0b9fc"; // --chart-2 del tema oscuro, el lavanda del título del hero
const MUTED_TEXT_COLOR = "rgba(240, 238, 255, 0.8)";

// La tarjeta que muestra Discord al pegar el link de la landing. Solo aplica a `/`: vive en el
// route group, así que /login y /sistema-diseno no la heredan.
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: BRAND_GRADIENT,
        color: TEXT_COLOR,
      }}
    >
      <div style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            padding: "16px 24px",
            borderRadius: 24,
            background: LOGO_BACKDROP,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse no admite next/image */}
          <img src={logoSrc} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="" />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* El mismo título que el hero de la landing: el link y la página cuentan lo mismo. */}
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.05 }}>
          <span>Deja de adivinar</span>
          <span style={{ color: HIGHLIGHT_COLOR }}>qué curso sigue</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: MUTED_TEXT_COLOR }}>
          Seis preguntas · Cursos reales de DevTalles · A tu ritmo
        </div>
      </div>
    </div>,
    { ...size },
  );
}
