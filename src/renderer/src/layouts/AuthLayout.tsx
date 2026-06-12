import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CenterLogo } from '@/components/CenterLogo'

export function AuthLayout(): React.JSX.Element {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.getSettings()
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/8 via-background to-accent/20 p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.55_0.2_260/0.15),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,oklch(0.6_0.15_170/0.12),transparent_45%)]" />
      <div className="relative z-10 w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CenterLogo
            className="h-20 w-20 rounded-2xl border border-border/60 bg-white object-contain p-2 shadow-md"
            showFallback
            fallbackClassName="size-20"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {settings?.centerName ?? 'مركز التعليم'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">نظام إدارة الدورات</p>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
