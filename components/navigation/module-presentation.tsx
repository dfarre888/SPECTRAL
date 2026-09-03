'use client'

import {
  Activity,
  ClipboardList,
  Coins,
  Crosshair,
  Database,
  FileUp,
  Flag,
  Gauge,
  GitCompare,
  Globe,
  Layers,
  Map,
  Radio,
  Satellite,
  Shield,
  ShoppingCart,
  Swords,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleIconName } from '@/lib/navigation/modules'

/** Icon name -> lucide component. Keys must match ModuleIconName exactly. */
export const MODULE_ICONS = {
  activity: Activity,
  'clipboard-list': ClipboardList,
  coins: Coins,
  crosshair: Crosshair,
  database: Database,
  'file-up': FileUp,
  flag: Flag,
  gauge: Gauge,
  'git-compare': GitCompare,
  globe: Globe,
  layers: Layers,
  map: Map,
  radio: Radio,
  satellite: Satellite,
  shield: Shield,
  'shopping-cart': ShoppingCart,
  swords: Swords,
  target: Target,
  'trending-up': TrendingUp,
} as const satisfies Record<ModuleIconName, LucideIcon>

export function moduleIcon(name: ModuleIconName): LucideIcon {
  return MODULE_ICONS[name]
}
