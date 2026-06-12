import { Plus, Trash2 } from 'lucide-react'
import { WEEK_DAYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export type ScheduleSlotInput = {
  dayOfWeek: string
  startTime: string
  endTime: string
}

type Props = {
  slots: ScheduleSlotInput[]
  onChange: (slots: ScheduleSlotInput[]) => void
}

export function ScheduleEditor({ slots, onChange }: Props): React.JSX.Element {
  function addSlot(): void {
    onChange([...slots, { dayOfWeek: WEEK_DAYS[0], startTime: '16:00', endTime: '18:00' }])
  }

  function update(index: number, patch: Partial<ScheduleSlotInput>): void {
    onChange(slots.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function remove(index: number): void {
    onChange(slots.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>جدول الأسبوع</Label>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addSlot}>
          <Plus className="size-3.5" />
          إضافة موعد
        </Button>
      </div>
      {slots.length === 0 ? (
        <p className="text-xs text-muted-foreground">لا توجد مواعيد. يمكنك إضافة موعد أو ترك الجدول فارغاً.</p>
      ) : (
        <ul className="space-y-2">
          {slots.map((slot, index) => (
            <li key={index} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
              <div className="min-w-[120px] flex-1 space-y-1">
                <Label className="text-xs">اليوم</Label>
                <Select
                  value={slot.dayOfWeek}
                  onChange={(e) => update(index, { dayOfWeek: e.target.value })}
                >
                  {WEEK_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">من</Label>
                <Input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => update(index, { startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى</Label>
                <Input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => update(index, { endTime: e.target.value })}
                />
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
