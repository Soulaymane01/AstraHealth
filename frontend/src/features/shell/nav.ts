import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Dumbbell,
  HelpCircle,
  LayoutDashboard,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Flight Deck", icon: LayoutDashboard, end: true },
  { to: "/check-in", label: "Systems Check", icon: ClipboardCheck },
  { to: "/telemetry", label: "Telemetry", icon: Activity },
  { to: "/training", label: "Training", icon: Dumbbell },
  { to: "/crew", label: "Crew", icon: Users },
  { to: "/quizzes", label: "Quizzes", icon: HelpCircle },
  { to: "/log", label: "Mission Log", icon: ScrollText },
  { to: "/library", label: "Library", icon: BookOpen },
];
