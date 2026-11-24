import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  FileText,
  LayoutDashboard,
  MessagesSquare,
  Radar,
  Sparkles,
  UserRound,
  UsersRound,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

/**
 * Fonte única das páginas do app. `phase` indica em qual fase do roadmap a
 * página fica pronta; itens de fases futuras aparecem desabilitados e
 * identificados — nunca como telas que só aparentam funcionar.
 */
export interface NavItem {
  key: string;
  title: string;
  path: string; // relativo à base (/painel ou /demo)
  icon: LucideIcon;
  description: string;
  phase: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const CURRENT_PHASE = 1;

export const NAV: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { key: "dashboard", title: "Dashboard", path: "", icon: LayoutDashboard, description: "Panorama da reputação digital no período.", phase: 1 },
    ],
  },
  {
    label: "Monitoramento",
    items: [
      { key: "mencoes", title: "Menções", path: "/mencoes", icon: MessagesSquare, description: "Feed inteligente de tudo que foi encontrado.", phase: 2 },
      { key: "radar", title: "Radar de Crises", path: "/radar", icon: Radar, description: "Alertas de risco e repercussão anormal.", phase: 4 },
      { key: "perfis", title: "Perfis monitorados", path: "/perfis", icon: UsersRound, description: "Políticos e termos de busca.", phase: 2 },
      { key: "fontes", title: "Fontes de monitoramento", path: "/fontes", icon: Waypoints, description: "Conectores e status de sincronização.", phase: 3 },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { key: "inteligencia", title: "Inteligência", path: "/inteligencia", icon: Sparkles, description: "Relatórios analíticos e recomendações.", phase: 4 },
      { key: "assistente", title: "Assistente", path: "/assistente", icon: Bot, description: "Pergunte sobre os dados monitorados.", phase: 4 },
      { key: "relatorios", title: "Relatórios", path: "/relatorios", icon: FileText, description: "Relatórios diários, semanais e de crise.", phase: 5 },
    ],
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  { key: "organizacao", title: "Organização", path: "/organizacao", icon: Building2, description: "Equipe, permissões, plano e dados.", phase: 1 },
  { key: "conta", title: "Minha conta", path: "/conta", icon: UserRound, description: "Seus dados de acesso.", phase: 1 },
];

export const BRAND = { name: "PULSO", tagline: "Inteligência de reputação digital", icon: Activity, chart: BarChart3 };
