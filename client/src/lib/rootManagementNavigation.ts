import { BellRing, BookOpenCheck, BriefcaseBusiness, ContactRound, HardDriveDownload, Palette, Trophy, UsersRound, type LucideIcon } from "lucide-react";
export type RootManagementSection = "business" | "students" | "courses" | "contents" | "alerts" | "contacts" | "settings" | "competition" | "backup";

export type RootManagementSectionDefinition = {
  id: RootManagementSection;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "Operação" | "Ensino" | "Comunicação" | "Sistema";
};

export const rootManagementSections: RootManagementSectionDefinition[] = [
  {
    id: "business",
    group: "Operação",
    label: "Negócios",
    description: "Planos, cupons, pedidos e transações.",
    icon: BriefcaseBusiness,
  },
  {
    id: "students",
    group: "Operação",
    label: "Usuários",
    description: "Contas, matrículas, acessos e auditoria.",
    icon: UsersRound,
  },
  {
    id: "courses",
    group: "Ensino",
    label: "Catálogo de cursos",
    description: "Cursos, capas, tipo e disponibilidade.",
    icon: BookOpenCheck,
  },
  {
    id: "contents",
    group: "Ensino",
    label: "Conteúdos",
    description: "Disciplinas, aulas e banco de questões.",
    icon: BookOpenCheck,
  },
  {
    id: "alerts",
    group: "Comunicação",
    label: "Alertas",
    description: "Comunicados para todos ou por curso.",
    icon: BellRing,
  },
  {
    id: "contacts",
    group: "Comunicação",
    label: "Contatos",
    description: "E-mail e Telegram exibidos a todos os usuários.",
    icon: ContactRound,
  },
  {
    id: "settings",
    group: "Sistema",
    label: "Configurações",
    description: "Logo, frases e cores da identidade visual.",
    icon: Palette,
  },
  {
    id: "competition",
    group: "Ensino",
    label: "Competição",
    description: "Ranking, pontuação e regras do quiz.",
    icon: Trophy,
  },
  {
    id: "backup",
    group: "Sistema",
    label: "Backup",
    description: "Exporte uma cópia segura dos dados da plataforma.",
    icon: HardDriveDownload,
  },
];

export const rootManagementGroups = (["Operação", "Ensino", "Comunicação", "Sistema"] as const).map(label => ({
  label,
  sections: rootManagementSections.filter(section => section.group === label),
}));
