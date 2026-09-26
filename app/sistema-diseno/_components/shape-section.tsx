import { escalaRadios, escalaSombras } from "@/app/sistema-diseno/_data/tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function ShapeSection() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Radios</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {escalaRadios.map((radius) => (
            <div key={radius.className} className="flex flex-col items-center gap-2">
              <div className={cn("size-16 border bg-primary", radius.className)} />
              <code className="text-xs">{radius.label}</code>
              <span className="text-center text-xs text-muted-foreground">{radius.cssValue}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Sombras</h3>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {escalaSombras.map((shadow) => (
            <div key={shadow.className} className="flex flex-col items-center gap-2">
              <div className={cn("size-16 rounded-lg bg-card", shadow.className)} />
              <code className="text-xs">{shadow.label}</code>
              <span className="text-center text-xs text-muted-foreground">{shadow.cssValue}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Gradientes</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex h-32 items-center justify-center rounded-lg border border-border brand-gradient-soft">
            <code className="text-xs">brand-gradient-soft</code>
          </div>
          <div className="flex h-32 items-center justify-center rounded-lg">
            <Button variant="brand" size="lg">
              CTA con gradiente y glow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ShapeSection };
