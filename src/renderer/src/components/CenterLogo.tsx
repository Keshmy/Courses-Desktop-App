import { useState } from 'react'
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
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const { data: src, isLoading } = useQuery({
    queryKey: ['center-logo'],
    queryFn: () => window.api.settings.getLogoDataUrl(),
    staleTime: 5 * 60 * 1000
  })

  if (isLoading && showFallback) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary',
          fallbackClassName ?? className
        )}
      >
        <GraduationCap className="size-12 animate-pulse" />
      </div>
    )
  }

  if (src && failedSrc !== src) {
    return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />
  }

  if (!showFallback) return null

  if (src && failedSrc === src) {
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
