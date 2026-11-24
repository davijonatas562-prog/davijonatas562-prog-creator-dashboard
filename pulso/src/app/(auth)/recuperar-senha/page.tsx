import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { AuthHeading } from "../auth-heading";
import { ConfigNotice } from "../config-notice";
import { ForgotForm } from "../auth-forms";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPage() {
  return (
    <>
      <AuthHeading title="Recuperar senha" description="Informe o e-mail da conta. Enviaremos um link seguro para criar uma nova senha." />
      <ConfigNotice />
      <ForgotForm disabled={!isSupabaseConfigured()} />
      <Link href="/entrar" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar para o login
      </Link>
    </>
  );
}
