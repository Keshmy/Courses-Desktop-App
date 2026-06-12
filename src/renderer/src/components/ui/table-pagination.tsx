import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { Select } from './select'
import type { PageSizeOption } from '@/lib/pagination'

type Props = {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  pageSizeOptions?: readonly PageSizeOption[]
  onPageSizeChange?: (size: PageSizeOption) => void
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange
}: Props): React.JSX.Element | null {
  if (totalItems === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/15 px-4 py-3.5 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-normal text-muted-foreground">
          عرض {from}–{to} من {totalItems}
        </p>
        {onPageSizeChange && pageSizeOptions?.length ? (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-xs text-muted-foreground">
              عدد الصفوف
            </label>
            <Select
              id="page-size"
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSizeOption)}
              className="h-8 min-w-[4.5rem] py-1 text-xs"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight className="size-4" />
          السابق
        </Button>
        <span className="min-w-[4rem] text-center font-semibold text-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          التالي
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </div>
  )
}
