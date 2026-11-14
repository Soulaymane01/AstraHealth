import {
  Activity,
  ClipboardCheck,
  Flame,
  Moon,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  clipboard: ClipboardCheck,
  flame: Flame,
  moon: Moon,
  users: Users,
  trophy: Trophy,
  activity: Activity,
};


export function achievementIcon(icon: string): LucideIcon {
  return ACHIEVEMENT_ICONS[icon] ?? Trophy;
}
