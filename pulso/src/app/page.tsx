import Link from "next/link";
import { ArrowRight, Gauge, MessagesSquare, Radar, ShieldCheck, Sparkles, Waypoints } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Gauge, title: "Pulso de Reputação", text: "Índice de 0 a 100 com metodologia aberta, comparado entre períodos." },
  { icon: MessagesSquare, title: "Sentimento em pt-BR", text: "Classificação que entende gíria, ironia e regionalismos — e admite dúvida." },
  { icon: Radar, title: "Radar de crises", text: "Separa crítica comum de repercussão anormal, com nível de confiança." },
  { icon: Waypoints, title: "Fontes autorizadas", text: "APIs oficiais e conteúdo público. Sem scraping de áreas privadas." },
  { icon: Sparkles, title: "Recomendações", text: "Leituras objetivas baseadas nas menções reais, sem inventar fatos." },
  { icon: ShieldCheck, title: "LGPD desde o início", text: "Isolamento por organização, auditoria e política de retenção." },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] glow-primary" aria-hidden />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/demo">Demonstração</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/cadastro">Criar conta</Link>
          </Button>
        </nav>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" /> Para mandatos, gestores públicos e agências de comunicação
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            A reputação digital do seu político, <span className="text-primary">em tempo real</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            O PULSO monitora o que é dito publicamente nas redes e na imprensa, mede o sentimento e mostra onde a equipe deve agir
            primeiro.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/demo">
                Ver demonstração <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </div>

        <ul className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="group bg-card p-6 transition-colors hover:bg-accent/40">
              <Icon className="size-5 text-primary" />
              <p className="mt-4 text-sm font-semibold">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          O índice representa a percepção observada nas fontes monitoradas e não é pesquisa eleitoral.{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-foreground">
            Privacidade e LGPD
          </Link>
        </p>
      </main>
    </div>
  );
}
