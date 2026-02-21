import {
  CalendarDays,
  ChartNoAxesCombined,
  Eye,
  FileImage,
  LayoutDashboard,
  Plug2,
  Building2,
  WandSparkles,
  BrainCircuit,
} from 'lucide-react';

export const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard    },
  { href: '/calendar',     label: 'Calendar',     icon: CalendarDays       },
  { href: '/build',        label: 'Build Post',   icon: WandSparkles       },
  { href: '/review',       label: 'Review Queue', icon: Eye                },
  { href: '/analytics',    label: 'Analytics',    icon: ChartNoAxesCombined },
  { href: '/assets',       label: 'Assets',       icon: FileImage          },
  { href: '/companies',    label: 'Companies',    icon: Building2          },
  { href: '/studio',       label: 'AI Studio',    icon: BrainCircuit       },
  { href: '/integrations', label: 'Integrations', icon: Plug2              },
] as const;

