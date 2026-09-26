import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { GithubLogoIcon } from "@phosphor-icons/react/ssr";

const REPOSITORY_URL = "https://github.com/Acuache/code-crafters";

const LINK_CLASS =
  "inline-flex items-center gap-1.5 rounded-sm py-1 text-muted-foreground underline-offset-4 transition-colors outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {children}
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* El texto del logo es blanco, como el wordmark: mismo fondo fijo en los dos temas. */}
          <div className="w-fit rounded-xl bg-logo-backdrop px-4 py-3">
            <Image
              src="/code-quest.webp"
              alt="Code Quest 2026, desafío de programación"
              width={144}
              height={62}
            />
          </div>
          <p className="max-w-sm text-sm text-pretty text-muted-foreground">
            Hecho por el equipo Code Crafters para Code Quest 2026, el desafío de programación de
            DevTalles.
          </p>
        </div>

        <nav aria-label="Enlaces del proyecto">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <ExternalLink href={REPOSITORY_URL}>
                <GithubLogoIcon aria-hidden="true" />
                Código en GitHub
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href="https://cursos.devtalles.com">Cursos de DevTalles</ExternalLink>
            </li>
            <li>
              <Link href="/sistema-diseno" className={LINK_CLASS}>
                Sistema de diseño
              </Link>
            </li>
            <li>
              <ExternalLink href={`${REPOSITORY_URL}/blob/master/LICENSE`}>
                Licencia MIT
              </ExternalLink>
            </li>
          </ul>
        </nav>
      </div>
      <p className="px-4 pb-8 text-center text-xs text-muted-foreground">
        Proyecto independiente de la comunidad. Los cursos y la marca DevTalles pertenecen a
        DevTalles.
      </p>
    </footer>
  );
}
