import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { LandingLink } from "@/lib/landing/cta";

const SECTION_LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#preguntas", label: "Preguntas" },
];

export function LandingHeader({ cta }: { cta: LandingLink }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 rounded-xl bg-logo-backdrop px-2.5 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {/* 144 × 55 respeta la proporción del archivo (720 × 275); el CSS lo lleva a 120 px. */}
          <Image
            src="/logo.webp"
            alt="DevPathlles"
            width={144}
            height={55}
            loading="eager"
            className="h-auto w-30"
          />
        </Link>

        <nav aria-label="Principal" className="ml-auto hidden sm:block">
          <ul className="flex items-center gap-1">
            {SECTION_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <ThemeToggle />
          <Button render={<Link href={cta.href} />} nativeButton={false}>
            {cta.label}
          </Button>
        </div>
      </div>
    </header>
  );
}
