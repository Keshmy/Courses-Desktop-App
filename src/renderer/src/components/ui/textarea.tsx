import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium shadow-xs transition-all duration-200 ease-in-out outline-none placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground hover:border-primary/20 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
