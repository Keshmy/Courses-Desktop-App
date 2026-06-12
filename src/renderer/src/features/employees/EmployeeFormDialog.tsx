import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isProtectedAdminUsername } from '../../../../shared/constants/auth'
import type {
  CreateEmployeeRequest,
  EmployeeDto,
  UpdateEmployeeRequest
} from '../../../../shared/types/employee'
import { useAuth } from '@/app/AuthContext'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: EmployeeDto | null
}

type FormState = {
  fullName: string
  username: string
  password: string
  role: 'admin' | 'employee'
}

const empty: FormState = { fullName: '', username: '', password: '', role: 'employee' }

export function EmployeeFormDialog({ open, onOpenChange, employee }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isEdit = employee != null
  const isProtectedAdmin = employee != null && isProtectedAdminUsername(employee.username)
  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (employee) {
      setForm({
        fullName: employee.fullName,
        username: employee.username,
        password: '',
        role: employee.role
      })
    } else {
      setForm(empty)
    }
  }, [open, employee])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.fullName.trim()) throw new Error('الاسم الكامل مطلوب')
      if (!form.username.trim()) throw new Error('اسم المستخدم مطلوب')
      if (!isEdit && !form.password) throw new Error('كلمة المرور مطلوبة')

      if (isEdit && employee) {
        const payload: UpdateEmployeeRequest = {
          id: employee.id,
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          role: form.role
        }
        if (form.password) {
          payload.password = form.password
        }
        return window.api.employees.update(payload, user?.id)
      }

      return window.api.employees.create({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role
      } as CreateEmployeeRequest, user?.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      onOpenChange(false)
    },
    onError: (err: Error) => setError(err.message)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? 'تعديل موظف' : 'إضافة موظف'}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <div className="space-y-2">
          <Label htmlFor="fullName">الاسم الكامل *</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">اسم المستخدم *</Label>
          <Input
            id="username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
        </div>
        {isProtectedAdmin ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
            كلمة مرور المدير الرئيسي (admin) لا يمكن تغييرها من هنا. يغيّرها المدير بنفسه من
            الإعدادات بعد تسجيل الدخول.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="password">{isEdit ? 'كلمة المرور' : 'كلمة المرور *'}</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              placeholder={isEdit ? 'اتركه فارغاً للإبقاء على كلمة المرور الحالية' : undefined}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!isEdit}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="role">الصلاحية</Label>
          <Select
            id="role"
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'employee' }))
            }
          >
            <option value="employee">موظف</option>
            <option value="admin">مدير</option>
          </Select>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'جاري الحفظ…' : isEdit ? 'حفظ' : 'إضافة'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
