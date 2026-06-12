import { useEffect, useState } from 'react'
import { GraduationCap, ImageOff } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  alt?: string
  fallbackClassName?: string
  showFallback?: boolean
}

export function CenterLogo({
  className,
  alt = 'شعار المركز',
  fallbackClassName,
  showFallback = false
}: Props): React.JSX.Element | null {
  const [loadFailed, setLoadFailed] = useState(false)

  const { data: src, isLoading } = useQuery({
    queryKey: ['center-logo'],
    queryFn: () => window.api.settings.getLogoDataUrl(),
    staleTime: 5 * 60 * 1000
  })

  useEffect(() => {
    setLoadFailed(false)
  }, [src])

  if (isLoading && showFallback) {
    return (
      <div
        className={cn(
          'flex animate-pulse items-center justify-center rounded-xl bg-muted/60',
          fallbackClassName ?? className
        )}
      />
    )
  }

  if (src && !loadFailed) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setLoadFailed(true)}
      />
    )
  }

  if (!showFallback) return null

  if (loadFailed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 text-destructive',
          fallbackClassName ?? className
        )}
      >
        <ImageOff className="size-6" />
        <span className="text-[10px] font-medium">تعذّر عرض الشعار</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/5 text-primary',
        fallbackClassName ?? className
      )}
    >
      <GraduationCap className="size-8" />
    </div>
  )
}
