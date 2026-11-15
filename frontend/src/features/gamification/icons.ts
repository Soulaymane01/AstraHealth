import {
  Activity,
  ClipboardCheck,
  Droplets,
  Dumbbell,
  Flame,
  Moon,
  Sparkles,
  Star,
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
  dumbbell: Dumbbell,
  droplets: Droplets,
  sparkles: Sparkles,
  star: Star,
};


export function achievementIcon(icon: string): LucideIcon {
  return ACHIEVEMENT_ICONS[icon] ?? Trophy;
}
