"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Estados que no se ven bien en un screenshot fijo: hay que poder
 * alternarlos. El resto (focus-visible, hover) se prueba con teclado o
 * mouse directo sobre los controles.
 */
function StateGallery() {
  const [isInvalid, setIsInvalid] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Recorré esta fila con <kbd className="rounded border px-1 py-0.5 text-xs">Tab</kbd> para ver
          el anillo de foco (borde sólido + halo lavanda).
        </p>
        <div className="flex flex-wrap gap-3">
          <Button>Enfocable</Button>
          <Button variant="outline">Enfocable</Button>
          <Button variant="brand">Enfocable</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsInvalid((previous) => !previous)}>
          {isInvalid ? "Marcar como válido" : "Marcar como inválido"}
        </Button>
        <Field data-invalid={isInvalid} className="max-w-sm">
          <FieldLabel htmlFor="email-demo">Correo</FieldLabel>
          <Input id="email-demo" type="email" aria-invalid={isInvalid} defaultValue="no-es-un-correo" />
          {isInvalid ? <FieldError>Ese correo no es válido.</FieldError> : null}
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm">Shimmer, para &ldquo;generando ruta&rdquo; (utilidad de shadcn/tailwind.css).</p>
        <span className="shimmer text-muted-foreground text-sm">Pensando…</span>
      </div>
    </div>
  )
}

export { StateGallery }
