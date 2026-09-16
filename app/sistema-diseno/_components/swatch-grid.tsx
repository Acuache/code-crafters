import { cn } from "@/lib/utils"
import type { ColorToken } from "@/app/sistema-diseno/_data/tokens"

/**
 * Grilla de chips de color. Cada chip usa la clase Tailwind del token tal
 * cual (ver _data/tokens.ts): no lee el valor computado por JS, así que
 * cambia de color solo con el toggle de tema, sin ningún cliente.
 */
function SwatchGrid({ tokens }: { tokens: ColorToken[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((token) => (
        <div
          key={token.variable}
          className="border-border flex flex-col gap-3 rounded-lg border p-4"
        >
          <div className={cn("h-16 w-full rounded-md border border-foreground/10", token.className)} />
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-heading text-sm font-medium">{token.label}</span>
              <code className="text-muted-foreground text-xs">{token.variable}</code>
            </div>
            <p className="text-muted-foreground font-mono text-xs">Oscuro: {token.darkValue}</p>
            <p className="text-muted-foreground font-mono text-xs">Claro: {token.lightValue}</p>
            <p className="text-sm">{token.usage}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export { SwatchGrid }
