import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { AuthHeading } from "../auth-heading";
import { ConfigNotice } from "../config-notice";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  link: "O link de acesso é inválido ou expirou. Solicite um novo.",
  config: "Configure o Supabase para acessar o painel.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  return (
    <>
      <AuthHeading title="Entrar no PULSO" description="Acompanhe a reputação digital dos perfis da sua organização." />
      <ConfigNotice />
      {erro && ERRORS[erro] && erro !== "config" && (
        <p role="alert" className="mb-4 rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">
          {ERRORS[erro]}
        </p>
      )}
      <SignInForm next={next} disabled={!isSupabaseConfigured()} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
      <div className="mt-8 border-t border-border pt-6">
        <Button asChild variant="outline" className="w-full">
          <Link href="/demo">
            Explorar a demonstração <ArrowRight />
          </Link>
        </Button>
      </div>
    </>
  );
}
