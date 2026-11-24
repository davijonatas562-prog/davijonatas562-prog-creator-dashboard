import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AuthHeading } from "../auth-heading";
import { ConfigNotice } from "../config-notice";
import { ResetForm } from "../auth-forms";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPage() {
  const configured = isSupabaseConfigured();
  let hasSession = false;
  if (configured) {
    const supabase = await createClient();
    hasSession = !!(await supabase.auth.getUser()).data.user;
  }
  return (
    <>
      <AuthHeading title="Definir nova senha" description="Escolha uma senha forte que você não use em outros serviços." />
      <ConfigNotice />
      {configured && !hasSession ? (
        <div className="grid gap-4">
          <p className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
            O link de redefinição é inválido ou expirou.
          </p>
          <Button asChild variant="outline">
            <Link href="/recuperar-senha">Solicitar novo link</Link>
          </Button>
        </div>
      ) : (
        <ResetForm disabled={!configured} />
      )}
    </>
  );
}
