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

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10 sm:px-6">
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia>
            <Image src="/astronauta.webp" alt="" width={128} height={128} />
          </EmptyMedia>
          <EmptyTitle>No encontramos esta página</EmptyTitle>
          <EmptyDescription>
            Puede que la ruta se haya eliminado o que el enlace no sea correcto.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="brand" render={<Link href="/dashboard" />} nativeButton={false}>
            Ir a mis rutas
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
