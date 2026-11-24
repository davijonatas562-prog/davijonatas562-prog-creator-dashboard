import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { AuthHeading } from "../auth-heading";
import { ConfigNotice } from "../config-notice";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <>
      <AuthHeading title="Criar sua conta" description="Passo 1 de 6 · Em seguida você cadastra a organização e o primeiro perfil." />
      <ConfigNotice />
      <SignUpForm disabled={!isSupabaseConfigured()} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
