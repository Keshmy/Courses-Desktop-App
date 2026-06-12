import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './ProtectedRoute'

import { AuthLayout } from '@/layouts/AuthLayout'

import { AppShell } from '@/layouts/AppShell'

import { RoleSelectPage } from '@/features/auth/RoleSelectPage'

import { LoginPage } from '@/features/auth/LoginPage'

import { DashboardPage } from '@/features/dashboard/DashboardPage'

import { StudentsPage } from '@/features/students/StudentsPage'

import { StudentDetailPage } from '@/features/students/StudentDetailPage'

import { SubjectsPage } from '@/features/subjects/SubjectsPage'

import { TeachersPage } from '@/features/teachers/TeachersPage'

import { GroupsPage } from '@/features/groups/GroupsPage'

import { GroupDetailPage } from '@/features/groups/GroupDetailPage'

import { PaymentsPage } from '@/features/payments/PaymentsPage'

import { ManagementPage } from '@/features/management/ManagementPage'

import { ActivityLogPage } from '@/features/activity/ActivityLogPage'

import { SettingsPage } from '@/features/settings/SettingsPage'



export function AppRoutes(): React.JSX.Element {

  return (

    <Routes>

      <Route path="/" element={<Navigate to="/login" replace />} />



      <Route element={<AuthLayout />}>

        <Route path="/login" element={<RoleSelectPage />} />

        <Route path="/login/credentials" element={<LoginPage />} />

      </Route>



      <Route

        path="/app"

        element={

          <ProtectedRoute>

            <AppShell />

          </ProtectedRoute>

        }

      >

        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="students" element={<StudentsPage />} />

        <Route path="students/:id" element={<StudentDetailPage />} />

        <Route path="teachers" element={<TeachersPage />} />

        <Route path="subjects" element={<SubjectsPage />} />

        <Route path="groups" element={<GroupsPage />} />

        <Route path="groups/:id" element={<GroupDetailPage />} />

        <Route path="payments" element={<PaymentsPage />} />

        <Route path="management" element={<ManagementPage />} />
        <Route path="activity" element={<ActivityLogPage />} />

        <Route path="finances" element={<Navigate to="/app/management?tab=finances" replace />} />

        <Route path="salaries" element={<Navigate to="/app/management?tab=salaries" replace />} />

        <Route path="employees" element={<Navigate to="/app/management?tab=employees" replace />} />

        <Route path="settings" element={<SettingsPage />} />

      </Route>



      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>

  )

}

