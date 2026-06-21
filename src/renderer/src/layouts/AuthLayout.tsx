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
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-3xl border border-border/50 bg-white p-3 shadow-xl ring-1 ring-primary/10">
            <CenterLogo
              className="h-36 w-36 rounded-2xl object-contain sm:h-40 sm:w-40"
              showFallback
              fallbackClassName="size-36 sm:size-40 rounded-2xl"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
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
