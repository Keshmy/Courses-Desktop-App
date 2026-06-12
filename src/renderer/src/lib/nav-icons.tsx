import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
  UsersRound,
  Wallet
} from 'lucide-react'
import type { NavIconKey } from './permissions'

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  students: Users,
  teachers: GraduationCap,
  subjects: BookOpen,
  groups: UsersRound,
  payments: CreditCard,
  management: Wallet,
  activity: ScrollText,
  settings: Settings
}

export function NavIcon({ icon, className }: { icon: NavIconKey; className?: string }): React.JSX.Element {
  const Icon = NAV_ICONS[icon]
  return <Icon className={className} />
}
