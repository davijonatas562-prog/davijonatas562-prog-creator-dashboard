import {
  BarChart3,
  CalendarDays,
  Flame,
  Send,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

/** Fonte única de verdade para as 6 páginas (sidebar, títulos e metadata). */
export const navItems: NavItem[] = [
  { title: "Hook Vault", href: "/hook-vault", icon: Zap, description: "Todo hook viral salvo, transcrito e templatizado" },
  { title: "Analytics", href: "/analytics", icon: BarChart3, description: "Views de IG, saves, follows e os heaters da semana" },
  { title: "Concorrentes", href: "/concorrentes", icon: Users, description: "Top reels dos criadores que você segue, raspado toda semana" },
  { title: "Agendador", href: "/agendador", icon: Send, description: "Agendamento multi-plataforma em um clique com legenda auto-gerada" },
  { title: "Calendário", href: "/calendario", icon: CalendarDays, description: "Auto-preenchido pelo /script com hooks e ângulo" },
  { title: "Em Alta", href: "/em-alta", icon: Flame, description: "Notícias de IA de 12 fontes, marcadas por potencial de hook" },
];

export function getNavItem(href: string) {
  const item = navItems.find((i) => i.href === href);
  if (!item) throw new Error(`Rota sem item de navegação: ${href}`);
  return item;
}
