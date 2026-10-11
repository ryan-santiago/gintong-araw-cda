import { cn } from "@/lib/utils"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-4 md:mb-6", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight md:text-[26px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
