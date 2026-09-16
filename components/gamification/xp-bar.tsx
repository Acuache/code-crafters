import { Progress, ProgressLabel } from "@/components/ui/progress"

type XpBarProps = {
  nivel: number
  xpActual: number
  xpSiguienteNivel: number
}

/**
 * Barra de progreso de XP para el dashboard (docs/ROADMAP.md: "mis rutas +
 * XP + insignias"). El porcentaje se calcula sobre el umbral del
 * siguiente nivel, no sobre un máximo fijo.
 *
 * XpBar es un Server Component. Progress ya es "use client" (Base UI), pero
 * el valor se muestra con un <span> propio en vez del render-prop de
 * ProgressValue: una función no se puede pasar como children de un Server a
 * un Client Component.
 */
function XpBar({ nivel, xpActual, xpSiguienteNivel }: XpBarProps) {
  const progressPercentage = Math.min(100, Math.round((xpActual / xpSiguienteNivel) * 100))

  return (
    <Progress value={progressPercentage} className="flex-col items-stretch gap-1.5">
      <div className="flex items-center justify-between">
        <ProgressLabel>Nivel {nivel}</ProgressLabel>
        <span className="text-muted-foreground ml-auto text-sm tabular-nums">
          {xpActual} / {xpSiguienteNivel} XP
        </span>
      </div>
    </Progress>
  )
}

export { XpBar }
