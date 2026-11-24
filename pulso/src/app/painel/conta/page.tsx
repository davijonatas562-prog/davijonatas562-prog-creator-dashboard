import type { Metadata } from "next";
import { getSessionContext } from "@/lib/data/session";
import { DangerConfirm, NameForm, PasswordForm } from "../settings-forms";
import { PageTitle, Section } from "../settings-section";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const ctx = await getSessionContext();
  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <PageTitle title="Minha conta" description="Seus dados de acesso. Eles não são compartilhados com outras organizações." />
      <Section title="Perfil" description="Como seu nome aparece para a equipe.">
        <div className="mb-4 text-sm">
          <p className="text-xs text-muted-foreground">E-mail de acesso</p>
          <p className="mt-0.5 font-medium">{ctx.user.email}</p>
        </div>
        <NameForm fullName={ctx.user.fullName ?? ""} />
      </Section>
      <Section title="Senha" description="Recomendamos uma senha exclusiva para o PULSO.">
        <PasswordForm />
      </Section>
      <Section title="Sessão">
        <form action="/auth/sair" method="post">
          <button className="text-sm font-medium text-primary hover:underline">Sair desta conta</button>
        </form>
      </Section>
      <Section danger title="Excluir conta" description="Direito de eliminação de dados (LGPD, art. 18). Proprietários precisam excluir suas organizações antes.">
        <DangerConfirm kind="account" expected="EXCLUIR" />
      </Section>
    </div>
  );
}
