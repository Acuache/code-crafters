import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_CARDS = 3;

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6"
      aria-busy="true"
    >
      <span className="sr-only">Cargando tus rutas…</span>
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
