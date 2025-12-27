import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // This is a placeholder for authentication middleware
  // Will be implemented with Supabase Auth when integrated
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/expenses/:path*", "/debts/:path*"],
}
