import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

/** Placeholder for modules that are built in later roadmap phases. */
export function ComingSoon({
  title,
  description,
  phase,
  features,
}: {
  title: string
  description: string
  phase: string
  features: string[]
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="items-center px-6 py-12 text-center md:py-16">
        <SunIllustration />
        <Badge variant="secondary" className="bg-accent text-accent-foreground">
          {phase}
        </Badge>
        <div className="max-w-md">
          <h2 className="text-lg font-bold">This module is on the way</h2>
          <p className="mt-1 text-sm text-muted-foreground">It will include:</p>
          <ul className="mt-3 grid gap-1.5 text-left text-sm">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/dashboard">
            <ArrowLeft /> Back to dashboard
          </Link>
        </Button>
      </Card>
    </>
  )
}

function SunIllustration() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-28 text-primary" fill="none" aria-hidden>
      <path d="M10 70h100" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 70a30 30 0 0 1 60 0" fill="var(--accent)" stroke="currentColor" strokeWidth="3" />
      {[-60, -30, 0, 30, 60].map((angle) => (
        <line
          key={angle}
          x1="60"
          y1="30"
          x2="60"
          y2="18"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${angle} 60 70) translate(0 -8)`}
        />
      ))}
    </svg>
  )
}
