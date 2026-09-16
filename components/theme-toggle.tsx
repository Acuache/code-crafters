"use client"

import { MoonIcon, SunIcon } from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"

const subscribeToMount = () => () => {}

/**
 * next-themes solo conoce el tema real después de montar en el cliente
 * (antes de eso podría desincronizarse del script que ya corrió sobre el
 * <html>). useSyncExternalStore, no un efecto con setState, es la forma
 * recomendada de detectar "ya estamos en el cliente" sin cascada de renders.
 */
function useIsMounted() {
  return useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isMounted = useIsMounted()

  if (!isMounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Cambiar tema">
        <SunIcon />
      </Button>
    )
  }

  const isDarkTheme = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDarkTheme ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
    >
      {isDarkTheme ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export { ThemeToggle }
