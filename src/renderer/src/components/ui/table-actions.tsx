import { Link } from 'react-router-dom'
import { Button } from './button'
import { cn } from '@/lib/utils'

export type TableAction = {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  href?: string
  tone?: 'default' | 'primary' | 'danger' | 'success'
  disabled?: boolean
}

type Props = {
  actions: TableAction[]
  className?: string
}

const toneClass: Record<NonNullable<TableAction['tone']>, string> = {
  default: 'border-border/80 bg-background hover:bg-muted/50',
  primary: 'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10',
  danger: 'border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10',
  success: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10'
}

export function TableActions({ actions, className }: Props): React.JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-xl border border-border/50 bg-muted/25 p-1',
        className
      )}
      role="group"
      aria-label="إجراءات الصف"
    >
      {actions.map((action) => {
        const tone = action.tone ?? 'default'
        const buttonClass = cn(
          'h-8 gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-none',
          toneClass[tone]
        )

        if (action.href) {
          return (
            <Button key={action.label} variant="ghost" size="sm" className={buttonClass} asChild>
              <Link to={action.href} title={action.label}>
                {action.icon}
                <span>{action.label}</span>
              </Link>
            </Button>
          )
        }

        return (
          <Button
            key={action.label}
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass}
            title={action.label}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
