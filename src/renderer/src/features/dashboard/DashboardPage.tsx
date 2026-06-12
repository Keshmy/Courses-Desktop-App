import { useQuery } from '@tanstack/react-query'
import { Banknote, BookOpen, GraduationCap, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function StatCard({
  title,
  value,
  icon: Icon,
  className
}: {
  title: string
  value: string | number
  icon: typeof Users
  className?: string
}): React.JSX.Element {
  return (
    <Card className={cn('overflow-hidden border-0 text-white', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-white/90">{title}</CardTitle>
        <Icon className="size-5 text-white/80" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardPage(): React.JSX.Element {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => window.api.settings.getDashboardStats()
  })

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['dashboard-recent-payments'],
    queryFn: () => window.api.settings.getRecentPayments(8)
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">لوحة التحكم</h2>
        <p className="text-sm text-muted-foreground">نظرة عامة على المركز</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="طلاب نشطون"
          value={statsLoading ? '…' : (stats?.activeStudents ?? 0)}
          icon={Users}
          className="stat-card-1"
        />
        <StatCard
          title="مجموعات نشطة"
          value={statsLoading ? '…' : (stats?.activeGroups ?? 0)}
          icon={BookOpen}
          className="stat-card-2"
        />
        <StatCard
          title="أساتذة نشطون"
          value={statsLoading ? '…' : (stats?.activeTeachers ?? 0)}
          icon={GraduationCap}
          className="stat-card-3"
        />
        <StatCard
          title="دخل الشهر"
          value={statsLoading ? '…' : `${(stats?.monthlyIncome ?? 0).toLocaleString('ar')} د.ل`}
          icon={Banknote}
          className="stat-card-4"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل…</p>
          ) : !recent?.length ? (
            <p className="text-sm text-muted-foreground">لا توجد مدفوعات بعد.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{p.studentName}</p>
                    <p className="text-muted-foreground">
                      {p.subjectName} · {p.receiptNumber}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{p.amount.toLocaleString('ar')} د.ل</p>
                    <p className="text-xs text-muted-foreground">{p.paidAt}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
