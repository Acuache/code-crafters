"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Envuelve el ThemeProvider de next-themes en un Client Component propio:
 * app/layout.tsx es un Server Component y no puede importar directo una
 * librería que usa contexto de React.
 */
function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export { ThemeProvider };
