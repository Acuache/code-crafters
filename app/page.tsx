import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Placeholder de la landing: solo demuestra que el tema y las fuentes de
 * marca funcionan de punta a punta. La landing real (docs/ROADMAP.md,
 * P3 Frontend, día 1) se construye en otra tarea.
 */
export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-logo-backdrop rounded-2xl px-6 py-4">
        <Image src="/logo.webp" alt="DevPathlles" width={320} height={122} priority />
      </div>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-display max-w-2xl text-balance">
          Tu ruta de aprendizaje sobre el catálogo de DevTalles
        </h1>
        <p className="text-muted-foreground max-w-md text-lg">
          DevPathlles arma una ruta de cursos según tus metas y tu nivel, y la
          personaliza con IA.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          variant="brand"
          size="lg"
          render={<Link href="/sistema-diseno" />}
          nativeButton={false}
        >
          Ver el sistema de diseño
        </Button>
        <Button variant="outline" size="lg" disabled>
          Empezar el cuestionario
        </Button>
      </div>
    </div>
  );
}
