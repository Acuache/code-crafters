/**
 * Catálogo de tokens para la galería de /sistema-diseno.
 *
 * Los valores OKLCH de acá son una copia de lectura para mostrar en pantalla:
 * la fuente de verdad son los bloques :root / .dark de app/globals.css. Si
 * cambia un token ahí, hay que actualizar la entrada correspondiente acá.
 *
 * className está escrito como literal (no interpolado) a propósito: Tailwind
 * escanea este archivo como cualquier .ts del proyecto, así que necesita ver
 * la clase completa para generar la utilidad.
 */

type ColorToken = {
  variable: string
  className: string
  label: string
  darkValue: string
  lightValue: string
  usage: string
}

const superficies: ColorToken[] = [
  {
    variable: "--sidebar",
    className: "bg-sidebar",
    label: "Hundido",
    darkValue: "oklch(0.1796 0.0498 293.68) · #130c25",
    lightValue: "oklch(0.9556 0.0228 291.37) · #f0eeff",
    usage: "Sidebar y superficies por debajo del fondo de página.",
  },
  {
    variable: "--background",
    className: "bg-background",
    label: "Página",
    darkValue: "oklch(0.1954 0.0456 295.93) · #171027",
    lightValue: "oklch(0.9800 0.0120 291.37) · #f8f7ff",
    usage: "Fondo base de toda la aplicación.",
  },
  {
    variable: "--card",
    className: "bg-card",
    label: "Card",
    darkValue: "oklch(0.2223 0.0330 294.36) · #1c1829",
    lightValue: "oklch(1 0 0) · #ffffff",
    usage: "Tarjetas y contenedores principales de contenido.",
  },
  {
    variable: "--surface",
    className: "bg-surface",
    label: "Surface",
    darkValue: "oklch(0.2305 0.0635 291.45) · #1e1638",
    lightValue: "oklch(0.9556 0.0228 291.37) · #f0eeff",
    usage: "Superficie secundaria dentro de una card (paneles anidados).",
  },
  {
    variable: "--popover",
    className: "bg-popover",
    label: "Elevada",
    darkValue: "oklch(0.2606 0.0724 290.87) · #251c44",
    lightValue: "oklch(1 0 0) · #ffffff",
    usage: "Menús y popovers que flotan sobre una card. --muted comparte este valor en oscuro, pero en claro es oklch(0.9556 0.0228 291.37) · #f0eeff.",
  },
  {
    variable: "--accent",
    className: "bg-accent",
    label: "Hover",
    darkValue: "oklch(0.3111 0.0534 293.79) · #322b49",
    lightValue: "oklch(0.9300 0.0300 291.37) · #e7e5fb",
    usage: "Fondo de hover y de ítem seleccionado en menús. No es color de marca.",
  },
  {
    variable: "--secondary",
    className: "bg-secondary",
    label: "Control",
    darkValue: "oklch(0.3520 0.0638 294.06) · #3d3459",
    lightValue: "oklch(0.9300 0.0300 291.37) · #e7e5fb",
    usage: "Botones y controles secundarios.",
  },
]

const texto: ColorToken[] = [
  {
    variable: "--foreground",
    className: "text-foreground",
    label: "Texto principal",
    darkValue: "oklch(0.9556 0.0228 291.37) · #f0eeff",
    lightValue: "oklch(0.1954 0.0456 295.93) · #171027",
    usage: "16.12:1 en oscuro · 17.34:1 en claro contra el fondo.",
  },
  {
    variable: "--muted-foreground",
    className: "text-muted-foreground",
    label: "Texto secundario",
    darkValue: "oklch(0.6894 0.0775 291.14) · #9b93c8",
    lightValue: "oklch(0.4500 0.0700 291.34) · #564e79",
    usage: "6.11:1 en card (oscuro) · 7.61:1 en card (claro). Evitar sobre --secondary en oscuro (4.04:1).",
  },
]

const marca: ColorToken[] = [
  {
    variable: "--primary",
    className: "bg-primary",
    label: "Primary",
    darkValue: "oklch(0.4061 0.2370 277.33) · #3a14c4",
    lightValue: "oklch(0.4061 0.2370 277.33) · #3a14c4",
    usage: "Relleno de botones y CTAs con texto encima (8.85:1). Como superficie sin texto da solo 1.82:1 en oscuro: usar --primary-bright.",
  },
  {
    variable: "--primary-end",
    className: "bg-primary-end",
    label: "Primary end",
    darkValue: "oklch(0.4336 0.2291 290.82) · #5a16c1",
    lightValue: "oklch(0.4336 0.2291 290.82) · #5a16c1",
    usage: "Parada final del gradiente de los CTA (from-primary to-primary-end).",
  },
  {
    variable: "--primary-bright",
    className: "bg-primary-bright",
    label: "Primary bright",
    darkValue: "oklch(0.6279 0.1972 283.78) · #7e70f9",
    lightValue: "oklch(0.4061 0.2370 277.33) · #3a14c4",
    usage: "Enlaces (variant=\"link\") e indicadores sin texto: 4.89:1 en oscuro.",
  },
  {
    variable: "--ring",
    className: "bg-ring",
    label: "Ring",
    darkValue: "oklch(0.8151 0.0938 288.92) · #c0b9fc",
    lightValue: "oklch(0.4061 0.2370 277.33) · #3a14c4",
    usage: "Anillo de foco. El borde sólido de foco (10.16:1 / 9.52:1) es el indicador que cumple contraste, el halo a 50% es un refuerzo visual.",
  },
]

const niveles: ColorToken[] = [
  {
    variable: "--level-required",
    className: "bg-level-required",
    label: "Requerido",
    darkValue: "oklch(0.8141 0.0843 29.01) · #f4aea3",
    lightValue: "oklch(0.5700 0.1500 29.01) · #c04d40",
    usage: "Curso obligatorio en la ruta oficial. 10.03:1 / 4.52:1.",
  },
  {
    variable: "--level-recommended",
    className: "bg-level-recommended",
    label: "Recomendado",
    darkValue: "oklch(0.8680 0.1441 87.22) · #fccd56",
    lightValue: "oklch(0.5500 0.1300 87.22) · #926b00",
    usage: "Curso recomendado por DevTalles. 12.29:1 / 4.59:1.",
  },
  {
    variable: "--level-optional",
    className: "bg-level-optional",
    label: "Opcional",
    darkValue: "oklch(0.6445 0.0760 293.14) · #8f85b8",
    lightValue: "oklch(0.5550 0.0600 291.00) · #736d94",
    usage: "Curso opcional: puede saltarse. 5.45:1 / 4.55:1.",
  },
]

const ia: ColorToken[] = [
  {
    variable: "--ai",
    className: "bg-ai",
    label: "Generado con IA",
    darkValue: "oklch(0.8523 0.1945 116.50) · #c8dd09",
    lightValue: "oklch(0.5450 0.1500 116.50) · #6c7900",
    usage: "Único uso: marcar contenido que produjo la Capa 2 (IA). 12.11:1 / 4.50:1.",
  },
]

const charts: ColorToken[] = [
  { variable: "--chart-1", className: "bg-chart-1", label: "Chart 1", darkValue: "#7e70f9", lightValue: "#3a14c4", usage: "Serie 1." },
  { variable: "--chart-2", className: "bg-chart-2", label: "Chart 2", darkValue: "#c0b9fc", lightValue: "#7168b5", usage: "Serie 2." },
  { variable: "--chart-3", className: "bg-chart-3", label: "Chart 3", darkValue: "#c8dd09", lightValue: "#6c7900", usage: "Serie 3." },
  { variable: "--chart-4", className: "bg-chart-4", label: "Chart 4", darkValue: "#fccd56", lightValue: "#926b00", usage: "Serie 4." },
  { variable: "--chart-5", className: "bg-chart-5", label: "Chart 5", darkValue: "#f4aea3", lightValue: "#c04d40", usage: "Serie 5." },
]

const estado: ColorToken[] = [
  {
    variable: "--destructive",
    className: "bg-destructive",
    label: "Destructive",
    darkValue: "oklch(0.704 0.191 22.216)",
    lightValue: "oklch(0.577 0.245 27.325)",
    usage: "Errores y acciones destructivas. Sin tocar: debe distinguirse de la paleta de marca.",
  },
]

const paletaTokens = { superficies, texto, marca, niveles, ia, charts, estado }

type TypeToken = {
  className: string
  label: string
  cssValue: string
  usage: string
}

const escalaTipografica: TypeToken[] = [
  { className: "text-display", label: "Display", cssValue: "clamp(2.25rem, 1.5rem + 3.2vw, 3.75rem) · 700", usage: "H1 de landing y portadas." },
  { className: "text-title", label: "Title", cssValue: "clamp(1.75rem, 1.35rem + 1.8vw, 2.5rem)", usage: "H2 de sección." },
  { className: "text-2xl", label: "Heading", cssValue: "1.5rem", usage: "H3." },
  { className: "text-lg", label: "Lead", cssValue: "1.125rem", usage: "Párrafo destacado." },
  { className: "text-base", label: "Body", cssValue: "1rem", usage: "Texto de cuerpo." },
  { className: "text-sm", label: "Small", cssValue: "0.875rem", usage: "Texto secundario, metadatos." },
  { className: "text-eyebrow", label: "Eyebrow", cssValue: "0.75rem · tracking 0.08em", usage: "Etiqueta uppercase sobre un título." },
]

type ShapeToken = {
  className: string
  label: string
  cssValue: string
}

const escalaRadios: ShapeToken[] = [
  { className: "rounded-sm", label: "sm", cssValue: "calc(var(--radius) * 0.6) = 8.4px" },
  { className: "rounded-md", label: "md", cssValue: "calc(var(--radius) * 0.8) = 11.2px" },
  { className: "rounded-lg", label: "lg", cssValue: "var(--radius) = 14px" },
  { className: "rounded-xl", label: "xl", cssValue: "calc(var(--radius) * 1.4) = 19.6px" },
  { className: "rounded-2xl", label: "2xl", cssValue: "calc(var(--radius) * 1.8) = 25.2px" },
  { className: "rounded-3xl", label: "3xl", cssValue: "calc(var(--radius) * 2.2) = 30.8px" },
  { className: "rounded-4xl", label: "4xl", cssValue: "calc(var(--radius) * 2.6) = 36.4px" },
  { className: "rounded-full", label: "full", cssValue: "9999px — pills de CTA" },
]

const escalaSombras: ShapeToken[] = [
  { className: "shadow-xs", label: "xs", cssValue: "sombra base de shadcn" },
  { className: "shadow-md", label: "md", cssValue: "sombra base de shadcn" },
  { className: "shadow-brand", label: "brand", cssValue: "sombra violeta difusa (en oscuro suma un halo lavanda de 1px)" },
  { className: "shadow-brand-glow", label: "brand-glow", cssValue: "glow violeta para CTAs (variant=\"brand\")" },
]

export { paletaTokens, escalaTipografica, escalaRadios, escalaSombras }
export type { ColorToken, TypeToken, ShapeToken }
