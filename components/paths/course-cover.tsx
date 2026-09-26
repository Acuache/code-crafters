import Image from "next/image";
import type { ReactNode } from "react";
import { BookOpenTextIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

type CourseCoverProps = {
  imageUrl: string | null;
  // "" cuando el título del curso ya está al lado y la portada es decorativa.
  alt: string;
  sizes: string;
  isDimmed?: boolean;
  className?: string;
  iconClassName?: string;
  // Lo que va encima de la portada (un badge, el botón de cerrar), posicionado en absoluto.
  children?: ReactNode;
};

// La portada de un curso en la proporción de DevTalles, con un ícono si el curso no tiene imagen.
export function CourseCover({
  imageUrl,
  alt,
  sizes,
  isDimmed = false,
  className,
  iconClassName,
  children,
}: CourseCoverProps) {
  return (
    <div className={cn("relative aspect-[760/420] shrink-0 bg-muted", className)}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={sizes}
          className={cn("object-cover transition", isDimmed && "opacity-50 grayscale")}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <BookOpenTextIcon className={iconClassName} aria-hidden="true" />
        </div>
      )}
      {children}
    </div>
  );
}
