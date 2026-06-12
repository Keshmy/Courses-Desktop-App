import * as React from 'react'

import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from './button'



type DialogProps = {

  open: boolean

  onOpenChange: (open: boolean) => void

  title: string

  description?: string

  children: React.ReactNode

  className?: string

}



export function Dialog({

  open,

  onOpenChange,

  title,

  description,

  children,

  className

}: DialogProps): React.JSX.Element | null {

  React.useEffect(() => {

    if (!open) return

    const onKey = (e: KeyboardEvent): void => {

      if (e.key === 'Escape') onOpenChange(false)

    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)

  }, [open, onOpenChange])



  if (!open) return null



  return (

    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">

      <button

        type="button"

        className="dialog-overlay absolute inset-0 bg-black/40 backdrop-blur-[6px] transition-all duration-200 ease-in-out"

        aria-label="إغلاق"

        onClick={() => onOpenChange(false)}

      />

      <div

        role="dialog"

        aria-modal="true"

        aria-labelledby="dialog-title"

        className={cn(

          'dialog-panel relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/60 bg-card',

          className

        )}

      >

        <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-muted/20 px-6 py-5">

          <div className="min-w-0 flex-1">

            <h2 id="dialog-title" className="text-lg font-bold tracking-tight text-foreground">

              {title}

            </h2>

            {description ? (

              <p className="mt-1.5 text-sm font-normal leading-relaxed text-muted-foreground">

                {description}

              </p>

            ) : null}

          </div>

          <Button

            type="button"

            variant="ghost"

            size="icon-sm"

            className="shrink-0 rounded-lg text-muted-foreground transition-all duration-200 ease-in-out hover:bg-muted hover:text-foreground"

            onClick={() => onOpenChange(false)}

          >

            <X className="size-4" />

          </Button>

        </div>

        <div className="overflow-y-auto px-6 py-6">{children}</div>

      </div>

    </div>

  )

}

