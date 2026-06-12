import * as React from 'react'

import { cn } from '@/lib/utils'



function Select({ className, ...props }: React.ComponentProps<'select'>) {

  return (

    <select

      data-slot="select"

      className={cn(

        'flex h-10 w-full cursor-pointer rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-medium shadow-xs transition-all duration-200 ease-in-out outline-none hover:border-primary/20 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',

        className

      )}

      {...props}

    />

  )

}



export { Select }

