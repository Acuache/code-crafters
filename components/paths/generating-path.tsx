import Image from "next/image";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

export function GeneratingPath() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <Image src="/astronauta.webp" alt="" width={160} height={160} />
        </EmptyMedia>
        <EmptyTitle>Armando tu ruta…</EmptyTitle>
        <EmptyDescription>
          Estamos combinando los programas oficiales de DevTalles con tus respuestas. Esto tarda
          unos segundos.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Spinner className="size-6" />
      </EmptyContent>
    </Empty>
  );
}
