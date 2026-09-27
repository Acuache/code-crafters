"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BooksIcon, HeartIcon, TreeStructureIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

type AdminSection = "courses" | "programs" | "interests";

// /admin y /admin/courses/* son la sección de cursos.
function activeSection(pathname: string): AdminSection {
  if (pathname.startsWith("/admin/programs")) {
    return "programs";
  }
  if (pathname.startsWith("/admin/interests")) {
    return "interests";
  }
  return "courses";
}

const SECTIONS = [
  { section: "courses", href: "/admin", label: "Cursos", Icon: BooksIcon },
  { section: "programs", href: "/admin/programs", label: "Programas", Icon: TreeStructureIcon },
  { section: "interests", href: "/admin/interests", label: "Intereses", Icon: HeartIcon },
] as const;

// Cliente solo para saber qué sección está activa: el layout del panel no se vuelve a renderizar
// al navegar entre sus páginas, así que no puede calcularlo él.
export function AdminNav() {
  const current = activeSection(usePathname());

  return (
    <nav aria-label="Secciones del panel" className="flex flex-wrap gap-2">
      {SECTIONS.map(({ section, href, label, Icon }) => {
        const isCurrent = section === current;
        return (
          <Button
            key={section}
            variant={isCurrent ? "secondary" : "ghost"}
            render={<Link href={href} aria-current={isCurrent ? "page" : undefined} />}
            nativeButton={false}
          >
            <Icon data-icon="inline-start" />
            {label}
          </Button>
        );
      })}
    </nav>
  );
}
