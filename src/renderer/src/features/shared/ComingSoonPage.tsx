import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NAV_ITEMS } from '@/lib/permissions'

export function ComingSoonPage(): React.JSX.Element {
  const { pathname } = useLocation()
  const label = NAV_ITEMS.find((n) => n.path === pathname)?.label ?? 'هذه الصفحة'

  return (
    <Card className="max-w-lg">
      <CardHeader className="flex flex-row items-center gap-3">
        <Construction className="size-8 text-muted-foreground" />
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          هذه الشاشة قيد التطوير في المرحلة القادمة. البنية الخلفية (API) جاهزة.
        </p>
      </CardContent>
    </Card>
  )
}
