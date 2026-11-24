import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Check, LayoutDashboard, Link2, Search, UserPlus, UserRound } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { Card } from "@/components/ui/card";
import { getSessionContext } from "@/lib/data/session";
import { cn } from "@/lib/utils";
import { CURRENT_PHASE } from "@/lib/nav";
import { OrgForm } from "./org-form";

export const metadata: Metadata = { title: "Primeiros passos" };
export const dynamic = "force-dynamic";

const STEPS = [
  { icon: UserRound, title: "Criar conta", text: "Seu acesso pessoal, protegido por senha.", phase: 1 },
  { icon: Building2, title: "Cadastrar organização", text: "O espaço da sua equipe. Os dados de uma organização nunca aparecem para outra.", phase: 1 },
  { icon: UserPlus, title: "Adicionar político", text: "Nome, cargo, município e apelidos da pessoa pública monitorada.", phase: 2 },
  { icon: Search, title: "Escolher termos", text: "Palavras que identificam o perfil e termos para excluir homônimos.", phase: 2 },
  { icon: Link2, title: "Conectar fontes", text: "Redes e sites públicos via APIs oficiais e autorizadas.", phase: 3 },
  { icon: LayoutDashboard, title: "Visualizar dashboard", text: "Indicadores, sentimento e alertas a partir das menções reais.", phase: 1 },
];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ nova?: string }> }) {
  const { nova } = await searchParams;
  const ctx = await getSessionContext();
  if (ctx.org && !nova) redirect("/painel");

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] glow-primary" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <form action="/auth/sair" method="post">
            <button className="text-xs text-muted-foreground hover:text-foreground">Sair</button>
          </form>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Primeiros passos</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Olá{ctx.user.fullName ? `, ${ctx.user.fullName.split(" ")[0]}` : ""}. Vamos preparar seu monitoramento.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              São seis etapas. Você não precisa entender de tecnologia: explicamos cada uma no caminho.
            </p>
            <ol className="mt-8 grid gap-1">
              {STEPS.map((s, i) => {
                const state = i === 0 ? "done" : i === 1 ? "current" : "todo";
                const Icon = s.icon;
                return (
                  <li key={s.title} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < STEPS.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-28px)] w-px bg-border" aria-hidden />}
                    <span
                      className={cn(
                        "relative flex size-9 shrink-0 items-center justify-center rounded-full border",
                        state === "done" && "border-positive/40 bg-positive/10 text-positive",
                        state === "current" && "border-primary bg-primary/15 text-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent)]",
                        state === "todo" && "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {state === "done" ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </span>
                    <div className="pt-1.5">
                      <p className={cn("text-sm font-medium", state === "todo" && "text-muted-foreground")}>
                        {i + 1}. {s.title}
                        {s.phase > CURRENT_PHASE && <span className="ml-2 rounded border border-border px-1.5 py-px text-[10px] font-normal text-muted-foreground">Fase {s.phase}</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <Card className="h-fit p-6">
            <p className="text-xs text-muted-foreground">Etapa 2 de 6</p>
            <h2 className="mt-1 text-lg font-semibold">Cadastre sua organização</h2>
            <p className="mb-6 mt-1.5 text-sm text-muted-foreground">
              Você será o proprietário e poderá convidar a equipe com permissões de administrador, analista ou leitor.
            </p>
            <OrgForm />
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Quer ver antes como funciona?{" "}
              <Link href="/demo" className="text-primary hover:underline">
                Abrir demonstração
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
