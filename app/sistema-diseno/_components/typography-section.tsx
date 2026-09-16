import { escalaTipografica } from "@/app/sistema-diseno/_data/tokens"
import { Eyebrow } from "@/components/brand/eyebrow"

function TypographySection() {
  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="border-border flex flex-col gap-2 rounded-lg border p-6">
          <span className="text-muted-foreground text-sm">Headings — Space Grotesk</span>
          <p className="font-heading text-3xl font-semibold">Aa Bb Cc 123</p>
        </div>
        <div className="border-border flex flex-col gap-2 rounded-lg border p-6">
          <span className="text-muted-foreground text-sm">Cuerpo — DM Sans</span>
          <p className="text-3xl">Aa Bb Cc 123</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {escalaTipografica.map((step) => (
          <div
            key={step.className}
            className="border-border flex flex-col gap-1 border-b pb-4 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <code className="text-muted-foreground text-xs">{step.className}</code>
              <span className="text-muted-foreground text-xs">{step.cssValue}</span>
            </div>
            <p className={step.className}>{step.label}: Rutas oficiales de DevTalles</p>
            <p className="text-muted-foreground text-sm">{step.usage}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>Ejemplo de eyebrow</Eyebrow>
        <p className="text-muted-foreground text-sm">
          Uppercase + tracking amplio, siempre arriba de un título de sección.
        </p>
      </div>
    </div>
  )
}

export { TypographySection }
