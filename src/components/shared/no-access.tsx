import Link from "next/link"
import { ArrowLeft, ShieldX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function NoAccess({ what = "this page" }: { what?: string }) {
  return (
    <Card className="mt-6 items-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldX className="size-6" />
      </span>
      <div>
        <h1 className="text-lg font-bold">You don&apos;t have access to {what}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ask an administrator if you need this permission.</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/dashboard">
          <ArrowLeft /> Back to dashboard
        </Link>
      </Button>
    </Card>
  )
}
