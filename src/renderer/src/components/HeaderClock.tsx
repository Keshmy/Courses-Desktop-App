import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

export function HeaderClock(): React.JSX.Element {
  const [time, setTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date()))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-1.5 text-foreground shadow-sm">
      <Clock className="size-4 text-primary" />
      <span className="font-mono text-sm font-semibold tabular-nums tracking-wider" dir="ltr">
        {time}
      </span>
    </div>
  )
}
