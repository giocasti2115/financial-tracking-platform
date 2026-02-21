import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  // Placeholder for future auth guard that will run at the edge
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/expenses/:path*", "/debts/:path*"],
}
