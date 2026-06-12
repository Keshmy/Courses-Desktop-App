import { useEffect, useState } from 'react'

import { useSearchParams } from 'react-router-dom'

import { Banknote, UserCog, Wallet } from 'lucide-react'

import { FinancesPage } from '@/features/finances/FinancesPage'

import { SalariesPage } from '@/features/salaries/SalariesPage'

import { EmployeesPage } from '@/features/employees/EmployeesPage'

import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'



type ManagementTab = 'finances' | 'salaries' | 'employees'



const TABS: { id: ManagementTab; label: string; icon: typeof Wallet }[] = [

  { id: 'finances', label: 'المالية', icon: Wallet },

  { id: 'salaries', label: 'الرواتب', icon: Banknote },

  { id: 'employees', label: 'الموظفون', icon: UserCog }

]



function parseTab(value: string | null): ManagementTab {

  if (value === 'salaries' || value === 'employees') return value

  return 'finances'

}



export function ManagementPage(): React.JSX.Element {

  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState<ManagementTab>(() => parseTab(searchParams.get('tab')))



  useEffect(() => {

    setTab(parseTab(searchParams.get('tab')))

  }, [searchParams])



  function selectTab(next: ManagementTab): void {

    setTab(next)

    setSearchParams({ tab: next }, { replace: true })

  }



  return (

    <div className="space-y-6">

      <div>

        <h2 className="page-title">المالية والموظفين</h2>

        <p className="page-subtitle">إدارة القيود المالية والرواتب وحسابات المستخدمين في مكان واحد</p>

      </div>



      <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-[var(--shadow-card)]">

        {TABS.map(({ id, label, icon: Icon }) => (

          <Button

            key={id}

            type="button"

            variant={tab === id ? 'default' : 'ghost'}

            className={cn(

              'h-10 flex-1 gap-2 rounded-xl sm:flex-none sm:px-5',

              tab !== id && 'text-muted-foreground hover:text-foreground'

            )}

            onClick={() => selectTab(id)}

          >

            <Icon className="size-4" />

            {label}

          </Button>

        ))}

      </div>



      {tab === 'finances' ? <FinancesPage embedded /> : null}

      {tab === 'salaries' ? <SalariesPage embedded /> : null}

      {tab === 'employees' ? <EmployeesPage embedded /> : null}

    </div>

  )

}

