import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ContrastRow = {
  pair: string
  darkRatio: string
  lightRatio: string
  passes: boolean
  note?: string
}

/**
 * Ratios medidos con una conversión OKLCH → sRGB propia, no estimados.
 * Ver docs/decisiones/0002-sistema-de-diseno-devtalles.md para el detalle.
 */
const CONTRAST_ROWS: ContrastRow[] = [
  { pair: "foreground / background", darkRatio: "16.12:1", lightRatio: "17.34:1", passes: true },
  { pair: "primary-foreground / primary", darkRatio: "8.85:1", lightRatio: "8.85:1", passes: true },
  {
    pair: "primary como superficie sin texto",
    darkRatio: "1.82:1",
    lightRatio: "9.52:1",
    passes: false,
    note: "En oscuro falla: usar primary-bright (4.89:1) para indicadores sin texto.",
  },
  { pair: "muted-foreground / card", darkRatio: "6.11:1", lightRatio: "7.61:1", passes: true },
  {
    pair: "muted-foreground / secondary",
    darkRatio: "4.04:1",
    lightRatio: "6.16:1",
    passes: false,
    note: "En oscuro queda justo por debajo de 4.5:1: no usar texto muted sobre bg-secondary ahí.",
  },
  {
    pair: "ring al 50% (halo de foco)",
    darkRatio: "3.41:1",
    lightRatio: "2.89:1",
    passes: true,
    note: "El borde sólido focus-visible:border-ring (10.16:1 / 9.52:1) es el que garantiza el foco visible.",
  },
  { pair: "level-required / background", darkRatio: "10.03:1", lightRatio: "4.52:1", passes: true },
  { pair: "level-recommended / background", darkRatio: "12.29:1", lightRatio: "4.59:1", passes: true },
  { pair: "level-optional / background", darkRatio: "5.45:1", lightRatio: "4.55:1", passes: true },
  { pair: "ai / background", darkRatio: "12.11:1", lightRatio: "4.50:1", passes: true },
]

function ContrastSection() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Par</TableHead>
          <TableHead>Oscuro</TableHead>
          <TableHead>Claro</TableHead>
          <TableHead>WCAG AA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {CONTRAST_ROWS.map((row) => (
          <TableRow key={row.pair}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <code className="text-sm">{row.pair}</code>
                {row.note ? <p className="text-muted-foreground text-xs">{row.note}</p> : null}
              </div>
            </TableCell>
            <TableCell className="font-mono">{row.darkRatio}</TableCell>
            <TableCell className="font-mono">{row.lightRatio}</TableCell>
            <TableCell>
              <Badge variant={row.passes ? "recommended" : "required"}>
                {row.passes ? "cumple" : "atención"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { ContrastSection }
