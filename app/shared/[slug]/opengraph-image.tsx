import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";

import { authorLabel, describePathSize, loadSharedPath } from "@/lib/sharing/shared-path";

export const alt = "Ruta de aprendizaje compartida en DevPathlles";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori no decodifica WebP: la tarjeta usa una copia en PNG de public/logo.webp.
const LOGO_WIDTH = 360;
const LOGO_HEIGHT = 128;
const logoData = await readFile(join(process.cwd(), "public/og-logo.png"), "base64");
const logoSrc = `data:image/png;base64,${logoData}`;

// Los tokens de app/globals.css en hex: en ImageResponse no hay clases ni variables CSS.
const BRAND_GRADIENT = "linear-gradient(135deg, #3a14c4 0%, #5a16c1 100%)"; // --primary → --primary-end
const LOGO_BACKDROP = "#171027"; // --logo-backdrop
const TEXT_COLOR = "#f0eeff"; // --foreground del tema oscuro
const MUTED_TEXT_COLOR = "rgba(240, 238, 255, 0.8)";

// Un título más largo no entra en tres líneas a este tamaño.
const MAX_TITLE_LENGTH = 90;

function fitTitle(title: string): string {
  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }

  return `${title.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}

type OpenGraphImageProps = {
  params: Promise<{ slug: string }>;
};

// La tarjeta que muestra Discord al pegar el link (spec 15).
export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { slug } = await params;
  const sharedPath = await loadSharedPath(slug);

  if (!sharedPath) {
    notFound();
  }

  const byline = `${authorLabel(sharedPath.author)} · ${describePathSize(sharedPath.steps)}`;

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
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.1 }}>
          {fitTitle(sharedPath.title)}
        </div>
        <div style={{ display: "flex", fontSize: 32, color: MUTED_TEXT_COLOR }}>{byline}</div>
      </div>
    </div>,
    { ...size },
  );
}
