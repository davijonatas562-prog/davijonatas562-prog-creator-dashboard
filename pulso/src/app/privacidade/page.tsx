import type { Metadata } from "next";
import { Logo } from "@/components/shell/logo";

export const metadata: Metadata = { title: "Privacidade e LGPD" };

const SECTIONS: [string, string][] = [
  ["Quais dados coletamos de você", "Nome, e-mail e senha (armazenada com hash pelo provedor de autenticação), organização de que participa e registros de uso necessários à segurança (auditoria)."],
  ["O que monitoramos", "Apenas conteúdo publicado de forma pública e acessível legalmente, por APIs oficiais, provedores autorizados ou feeds públicos. Não coletamos mensagens privadas, não acessamos áreas restritas e não contornamos autenticação."],
  ["O que não fazemos", "Não tentamos identificar pessoas anônimas, não criamos perfis psicológicos individuais e não vendemos dados. A análise é voltada à reputação pública e aos assuntos discutidos, não à vigilância de indivíduos."],
  ["Isolamento e acesso", "Cada organização só acessa os próprios dados, regra aplicada no banco de dados. Papéis (proprietário, administrador, analista, leitor) limitam o que cada pessoa pode fazer."],
  ["Retenção", "Cada organização define por quanto tempo as menções são guardadas (de 30 dias a 2 anos). Após esse prazo, são apagadas automaticamente."],
  ["Seus direitos", "Você pode acessar, corrigir e excluir seus dados a qualquer momento em “Minha conta”. O proprietário pode excluir a organização e todos os dados associados."],
  ["Índice de reputação", "O Pulso de Reputação reflete apenas as menções encontradas nas fontes monitoradas. Não é pesquisa de opinião nem pesquisa eleitoral."],
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
      <Logo />
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Privacidade e LGPD</h1>
      <p className="mt-3 text-sm text-muted-foreground">Versão 2026-11. Como o PULSO trata dados pessoais, em linguagem direta.</p>
      <div className="mt-10 grid gap-8">
        {SECTIONS.map(([t, d]) => (
          <section key={t}>
            <h2 className="text-sm font-semibold">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
