import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";

/** Aviso honesto quando o backend não está configurado — os formulários ficam desabilitados. */
export function ConfigNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
      <p className="flex items-center gap-1.5 font-semibold">
        <TriangleAlert className="size-3.5" /> Autenticação não configurada
      </p>
      <p className="mt-1 text-warning/90">
        Este ambiente ainda não tem as credenciais do Supabase. Configure <code>.env.local</code> conforme o README. Enquanto isso,
        explore a{" "}
        <Link href="/demo" className="font-medium underline underline-offset-2">
          demonstração
        </Link>
        .
      </p>
    </div>
  );
}
