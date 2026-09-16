import { paletaTokens, type ColorToken } from "@/app/sistema-diseno/_data/tokens"
import { SwatchGrid } from "./swatch-grid"

type PaletteGroup = {
  title: string
  description?: string
  tokens: ColorToken[]
}

const PALETTE_GROUPS: PaletteGroup[] = [
  { title: "Superficies", description: "De hundido a control, en orden de lightness.", tokens: paletaTokens.superficies },
  { title: "Texto", tokens: paletaTokens.texto },
  { title: "Marca", description: "El violeta de DevTalles y sus variantes de contraste.", tokens: paletaTokens.marca },
  { title: "Nivel de curso", description: "Vocabulario semántico ya usado en docs/investigacion/opcion-c.html.", tokens: paletaTokens.niveles },
  { title: "IA", tokens: paletaTokens.ia },
  { title: "Charts", description: "Para el mapa de la ruta (React Flow).", tokens: paletaTokens.charts },
  { title: "Estado", tokens: paletaTokens.estado },
]

function PaletteSection() {
  return (
    <div className="flex flex-col gap-10">
      {PALETTE_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <div>
            <h3 className="font-heading text-lg font-medium">{group.title}</h3>
            {group.description ? (
              <p className="text-muted-foreground text-sm">{group.description}</p>
            ) : null}
          </div>
          <SwatchGrid tokens={group.tokens} />
        </div>
      ))}
    </div>
  )
}

export { PaletteSection }
