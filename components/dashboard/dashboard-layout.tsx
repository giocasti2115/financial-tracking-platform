"use client"

import type React from "react"

import { Sidebar } from "./sidebar"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

const PREFETCHED_QUERIES = [
  { key: ["expenses"], fn: apiClient.getExpenses },
  { key: ["incomes"], fn: apiClient.getIncomes },
  { key: ["debts"], fn: apiClient.getDebts },
  { key: ["assets"], fn: apiClient.getAssets },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-[#fff8f0]">
      <Sidebar />
      <main
        className={cn(
          "transition-all duration-300",
          "lg:ml-64", // Default margin for expanded sidebar
          "ml-0", // No margin on mobile
        )}
      >
        <PrefetchFinancialData />
        {children}
      </main>
    </div>
  )
}

function PrefetchFinancialData() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) {
      return
    }

    PREFETCHED_QUERIES.forEach(({ key, fn }) => {
      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: fn,
        staleTime: 1000 * 60 * 5,
      })
    })
  }, [queryClient, user])

  return null
}
