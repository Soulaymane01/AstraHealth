import {
  Activity,
  ClipboardCheck,
  Coffee,
  Flame,
  Gift,
  Moon,
  PhoneCall,
  Trophy,
  Users,
  UtensilsCrossed,
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

const REWARD_ICONS: Record<string, LucideIcon> = {
  phone: PhoneCall,
  utensils: UtensilsCrossed,
  moon: Moon,
  coffee: Coffee,
};

export function achievementIcon(icon: string): LucideIcon {
  return ACHIEVEMENT_ICONS[icon] ?? Trophy;
}

export function rewardIcon(icon: string): LucideIcon {
  return REWARD_ICONS[icon] ?? Gift;
}
