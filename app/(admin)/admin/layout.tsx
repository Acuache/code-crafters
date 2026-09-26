import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

import { AdminNav } from "@/components/admin/admin-nav";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";

// Solo estructura visual. El chequeo de rol NO va acá: un layout no se vuelve a renderizar al
// navegar y no impide que se ejecuten sus páginas ni las server actions (guía de autenticación de
// Next, "Layouts and auth checks"). Cada página y cada action llama a requireAdmin().
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 rounded-3xl border brand-gradient-soft p-6 shadow-brand sm:p-8">
        <div>
          <Button variant="ghost" render={<Link href="/dashboard" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Volver al dashboard
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <Eyebrow>Administración</Eyebrow>
          <h1 className="text-title">Panel de administración</h1>
        </div>
        <AdminNav />
      </header>

      {children}
    </div>
  );
}
