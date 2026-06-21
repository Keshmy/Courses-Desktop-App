import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'

import { GraduationCap, LogOut } from 'lucide-react'

import { useAuth } from '@/app/AuthContext'

import { isAdmin, navItemsForRole } from '@/lib/permissions'

import { NavIcon } from '@/lib/nav-icons'

import { Button } from '@/components/ui/button'

import { HeaderClock } from '@/components/HeaderClock'

import { cn } from '@/lib/utils'



export function AppShell(): React.JSX.Element {

  const { user, logout } = useAuth()

  const navigate = useNavigate()

  const navItems = user ? navItemsForRole(user.role) : []



  const { data: settings } = useQuery({

    queryKey: ['settings'],

    queryFn: () => window.api.settings.getSettings()

  })



  function handleLogout(): void {

    logout()

    navigate('/login', { replace: true })

  }



  return (

    <div className="flex min-h-screen bg-[#eef1f8]">

      <aside className="sidebar-panel flex w-64 shrink-0 flex-col text-white">

        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">

          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 shadow-inner">

            <GraduationCap className="size-6 text-white" />

          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-bold text-white">

              {settings?.centerName ?? 'مركز التعليم'}

            </p>

            <p className="truncate text-xs font-normal text-white/65">

              {user?.fullName} · {isAdmin(user!.role) ? 'مدير' : 'موظف'}

            </p>

          </div>

        </div>



        <nav className="flex flex-1 flex-col gap-1.5 p-3">

          {navItems.map((item) => (

            <NavLink

              key={item.path}

              to={item.path}

              className={({ isActive }) =>

                cn(

                  'sidebar-nav-item group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ease-in-out',

                  isActive

                    ? 'sidebar-nav-item-active bg-white text-primary shadow-md'

                    : 'text-white/80 hover:bg-white/10 hover:text-white'

                )

              }

            >

              {({ isActive }) => (

                <>

                  <span

                    className={cn(

                      'flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',

                      isActive ? 'bg-primary/10 text-primary' : 'bg-white/10 text-white/90 group-hover:bg-white/15'

                    )}

                  >

                    <NavIcon icon={item.icon} className="size-4" />

                  </span>

                  <span className="truncate">{item.label}</span>

                </>

              )}

            </NavLink>

          ))}

        </nav>



        <div className="border-t border-white/10 p-3">

          <Button

            variant="ghost"

            className="w-full justify-start gap-3 rounded-xl border border-transparent px-3.5 py-3 font-medium text-white/75 transition-all duration-200 ease-in-out hover:border-white/15 hover:bg-white/10 hover:text-white"

            onClick={handleLogout}

          >

            <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">

              <LogOut className="size-4" />

            </span>

            تسجيل الخروج

          </Button>

        </div>

      </aside>



      <main className="flex flex-1 flex-col overflow-hidden">

        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-white/90 px-6 shadow-sm backdrop-blur-md">

          <h1 className="text-lg font-bold tracking-tight text-foreground">نظام إدارة المركز</h1>

          <HeaderClock />

        </header>

        <div className="page-transition flex-1 overflow-auto p-6 lg:p-8">

          <Outlet />

        </div>

      </main>

    </div>

  )

}

