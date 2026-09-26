import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, ShareNetworkIcon, SignInIcon, UserIcon } from "@phosphor-icons/react/ssr";

import { AiBadge } from "@/components/brand/ai-badge";
import { Eyebrow } from "@/components/brand/eyebrow";
import type { PathView } from "@/components/paths/path-step";
import { CopyPathButton } from "@/components/sharing/copy-path-button";
import { SharedPathSteps } from "@/components/sharing/shared-path-steps";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  authorHandle,
  authorLabel,
  describePathSize,
  loadSharedPath,
  type SharedPath,
} from "@/lib/sharing/shared-path";
import { createClient } from "@/lib/supabase/server";

type SharedPathPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ vista?: string | string[] }>;
};

// loadSharedPath va con `cache`: esta consulta y la de la página son una sola.
export async function generateMetadata({ params }: SharedPathPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sharedPath = await loadSharedPath(slug);

  if (!sharedPath) {
    notFound();
  }

  const title = `${sharedPath.title} · DevPathlles`;
  const fallbackDescription = `Una ruta de aprendizaje ${authorLabel(sharedPath.author)}: ${describePathSize(sharedPath.steps)}.`;
  const description = sharedPath.summary ?? fallbackDescription;

  // La imagen la agrega opengraph-image.tsx; acá van los textos de la tarjeta de Discord.
  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "DevPathlles" },
    twitter: { card: "summary_large_image", title, description },
    // El link es para compartir, no para buscadores.
    robots: { index: false },
  };
}

function AuthorLine({ author }: { author: SharedPath["author"] }) {
  const initial = authorHandle(author.username)?.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm">
        {author.avatarUrl ? <AvatarImage src={author.avatarUrl} alt="" /> : null}
        <AvatarFallback>{initial ?? <UserIcon aria-hidden="true" />}</AvatarFallback>
      </Avatar>
      <span>{authorLabel(author)}</span>
    </div>
  );
}

type PrimaryActionProps = {
  slug: string;
  isSignedIn: boolean;
  viewer: SharedPath["viewer"];
};

// Qué puede hacer quien mira: ir a su ruta, ir a su copia, iniciar sesión o copiarla.
function PrimaryAction({ slug, isSignedIn, viewer }: PrimaryActionProps) {
  if (viewer.isOwner && viewer.ownPathId) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium">Es tu ruta</p>
        <Button
          variant="brand"
          render={<Link href={`/paths/${viewer.ownPathId}`} />}
          nativeButton={false}
        >
          Ir a mi ruta
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    );
  }

  if (viewer.ownPathId) {
    return (
      <Button
        variant="brand"
        render={<Link href={`/paths/${viewer.ownPathId}`} />}
        nativeButton={false}
      >
        Ir a mi copia
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
    );
  }

  if (!isSignedIn) {
    return (
      <Button
        variant="brand"
        render={<Link href={`/login?next=/shared/${slug}`} />}
        nativeButton={false}
      >
        <SignInIcon data-icon="inline-start" />
        Inicia sesión para hacer esta ruta
      </Button>
    );
  }

  return <CopyPathButton slug={slug} />;
}

export default async function SharedPathPage({ params, searchParams }: SharedPathPageProps) {
  const { slug } = await params;
  // El mapa es la vista por defecto, como en /paths/[id].
  const { vista } = await searchParams;
  const initialView: PathView = vista === "lista" ? "lista" : "mapa";

  const sharedPath = await loadSharedPath(slug);
  if (!sharedPath) {
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const hasSteps = sharedPath.steps.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link
        href="/"
        aria-label="Ir al inicio de DevPathlles"
        className="self-start rounded-2xl bg-logo-backdrop px-4 py-2"
      >
        <Image src="/logo.webp" alt="DevPathlles" width={160} height={61} priority />
      </Link>

      <header className="relative flex items-center gap-6 overflow-hidden rounded-3xl border brand-gradient-soft p-6 shadow-brand sm:p-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Eyebrow className="flex items-center gap-2">
                <ShareNetworkIcon />
                Ruta compartida
              </Eyebrow>
              {sharedPath.isPersonalized ? <AiBadge /> : null}
            </div>
            <h1 className="text-title text-balance">{sharedPath.title}</h1>
            {sharedPath.summary ? (
              <p className="max-w-prose text-pretty text-muted-foreground">{sharedPath.summary}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <AuthorLine author={sharedPath.author} />
            <span className="tabular-nums">{describePathSize(sharedPath.steps)}</span>
          </div>

          {hasSteps ? (
            <PrimaryAction slug={slug} isSignedIn={isSignedIn} viewer={sharedPath.viewer} />
          ) : null}
        </div>
        {/* Decorativa: el título de la ruta ya está al lado. */}
        <Image
          src="/astronauta.webp"
          alt=""
          width={144}
          height={144}
          className="hidden shrink-0 drop-shadow-xl sm:block"
        />
      </header>

      {hasSteps ? (
        <SharedPathSteps steps={sharedPath.steps} initialView={initialView} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShareNetworkIcon />
            </EmptyMedia>
            <EmptyTitle>Esta ruta no tiene cursos activos</EmptyTitle>
            <EmptyDescription>Todos los cursos de esta ruta se quitaron.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  );
}
