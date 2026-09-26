import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_STATS = 3;
const PLACEHOLDER_ACHIEVEMENTS = 6;

export default function ProfileLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6"
      aria-busy="true"
    >
      <span className="sr-only">Cargando tu perfil…</span>
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_STATS }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_ACHIEVEMENTS }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
