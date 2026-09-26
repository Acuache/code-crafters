// --accent casi no se veía sobre el fondo, y en claro --primary es igual a --primary-bright.
const THEME_COLOR_TOKENS = ["--primary-bright", "--chart-2", "--primary-end"];

// Si el navegador no entiende el color, fillStyle conserva este valor.
const UNPARSED_SENTINEL = "#010203";

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

// canvas-confetti solo acepta HEX: se pinta un píxel con el color OKLCH y se lee en RGB.
function cssColorToHex(context: CanvasRenderingContext2D, color: string): string | null {
  context.fillStyle = UNPARSED_SENTINEL;
  context.fillStyle = color;
  if (context.fillStyle === UNPARSED_SENTINEL) {
    return null;
  }

  context.clearRect(0, 0, 1, 1);
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;

  return `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`;
}

function readThemeColors(): string[] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return [];
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const hexColors: string[] = [];

  for (const token of THEME_COLOR_TOKENS) {
    const cssColor = rootStyle.getPropertyValue(token).trim();
    const hexColor = cssColor ? cssColorToHex(context, cssColor) : null;
    if (hexColor) {
      hexColors.push(hexColor);
    }
  }

  return hexColors;
}

export async function launchConfetti(): Promise<void> {
  const { default: confetti } = await import("canvas-confetti");
  const colors = readThemeColors();

  await confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: colors.length > 0 ? colors : undefined,
    disableForReducedMotion: true,
  });
}
