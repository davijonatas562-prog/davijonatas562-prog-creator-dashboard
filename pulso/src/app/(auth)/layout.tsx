import { Logo } from "@/components/shell/logo";
import { ShieldCheck, Activity, Radar } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-in fade-in-0 slide-in-from-bottom-2 duration-500">{children}</div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground lg:text-left">
          © 2026 PULSO · Monitoramos apenas conteúdo público, conforme a LGPD.
        </p>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-border bg-card lg:block">
        <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]" aria-hidden />
        <div className="absolute -right-32 -top-32 size-[520px] rounded-full bg-primary/15 blur-[120px]" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Inteligência de reputação digital</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight">
              Saiba o que estão falando antes que vire manchete.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              O PULSO reúne menções públicas de redes sociais e da imprensa, classifica o sentimento em português do Brasil e
              mostra para a sua equipe onde agir primeiro.
            </p>
          </div>
          {/* ilustração decorativa (não são dados) */}
          <svg viewBox="0 0 520 140" className="w-full max-w-lg text-primary" aria-hidden>
            <defs>
              <linearGradient id="pulse-fade" x1="0" x2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                <stop offset="0.5" stopColor="currentColor" stopOpacity="1" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path d="M0 90 H140 L165 40 L195 120 L225 20 L255 100 L275 75 H520" fill="none" stroke="url(#pulse-fade)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <ul className="grid max-w-md gap-4 text-sm">
            {[
              [Activity, "Pulso de Reputação de 0 a 100, com metodologia transparente"],
              [Radar, "Radar de crises que separa crítica comum de risco real"],
              [ShieldCheck, "Dados isolados por organização e controle de acesso por papel"],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof Activity;
              return (
                <li key={i} className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background/60">
                    <I className="size-4 text-primary" />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
