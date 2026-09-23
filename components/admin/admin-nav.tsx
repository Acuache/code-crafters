"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BooksIcon, TreeStructureIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

// Cliente solo para saber qué sección está activa: el layout del panel no se vuelve a renderizar
// al navegar entre sus páginas, así que no puede calcularlo él.
export function AdminNav() {
  const pathname = usePathname();
  const isProgramsSection = pathname.startsWith("/admin/programs");

  return (
    <nav aria-label="Secciones del panel" className="flex flex-wrap gap-2">
      <Button
        variant={isProgramsSection ? "ghost" : "secondary"}
        render={<Link href="/admin" aria-current={isProgramsSection ? undefined : "page"} />}
        nativeButton={false}
      >
        <BooksIcon data-icon="inline-start" />
        Cursos
      </Button>
      <Button
        variant={isProgramsSection ? "secondary" : "ghost"}
        render={
          <Link href="/admin/programs" aria-current={isProgramsSection ? "page" : undefined} />
        }
        nativeButton={false}
      >
        <TreeStructureIcon data-icon="inline-start" />
        Programas
      </Button>
    </nav>
  );
}
