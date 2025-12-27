import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageShellProps {
  children: ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10", className)}>{children}</div>
}
