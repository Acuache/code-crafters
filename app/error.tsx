"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// En producción, el error de un Server Component llega sin mensaje: el `digest` es lo que permite
// encontrarlo en los logs del servidor.
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10 sm:px-6">
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia>
            <Image src="/astronauta.webp" alt="" width={128} height={128} />
          </EmptyMedia>
          <EmptyTitle>Algo salió mal</EmptyTitle>
          <EmptyDescription>
            No pudimos cargar esta pantalla. Prueba de nuevo en unos segundos.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center">
          <Button variant="brand" onClick={retry}>
            Intentar de nuevo
          </Button>
          <Button variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
            Ir a mis rutas
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
