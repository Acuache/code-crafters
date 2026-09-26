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

// Inexistente, privada o con formato inválido se ven igual: no se distingue una de otra (spec 15).
export default function SharedPathNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10 sm:px-6">
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia>
            <Image src="/astronauta.webp" alt="" width={128} height={128} />
          </EmptyMedia>
          <EmptyTitle>Este link no existe o su autor dejó de compartirlo</EmptyTitle>
          <EmptyDescription>
            Pídele a quien te lo pasó un link nuevo, o arma tu propia ruta en DevPathlles.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="brand" render={<Link href="/" />} nativeButton={false}>
            Ir al inicio
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
