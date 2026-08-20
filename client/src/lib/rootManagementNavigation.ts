import { BookOpenCheck, BriefcaseBusiness, ContactRound, UsersRound, type LucideIcon } from "lucide-react";

export type RootManagementSection = "business" | "students" | "contents" | "contacts";

export type RootManagementSectionDefinition = {
  id: RootManagementSection;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const rootManagementSections: RootManagementSectionDefinition[] = [
  {
    id: "business",
    label: "Negócios",
    description: "Planos, cupons, pedidos e transações.",
    icon: BriefcaseBusiness,
  },
  {
    id: "students",
    label: "Alunos",
    description: "Contas, cursos, matrículas e auditoria.",
    icon: UsersRound,
  },
  {
    id: "contents",
    label: "Conteúdos",
    description: "Disciplinas, aulas e banco de questões.",
    icon: BookOpenCheck,
  },
  {
    id: "contacts",
    label: "Contatos",
    description: "E-mail e Telegram exibidos a todos os usuários.",
    icon: ContactRound,
  },
];
