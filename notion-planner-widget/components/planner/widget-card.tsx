interface WidgetCardProps {
  children: React.ReactNode
  className?: string
}

export function WidgetCard({ children, className = "" }: WidgetCardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      {children}
    </div>
  )
}
