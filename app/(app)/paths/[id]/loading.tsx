import { Skeleton } from "@/components/ui/skeleton";

export default function PathLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6"
      aria-busy="true"
    >
      <span className="sr-only">Cargando tu ruta…</span>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="mx-auto h-9 w-48" />
      <Skeleton className="h-96 w-full rounded-3xl" />
    </div>
  );
}
