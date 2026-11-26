"use client"

import { useEffect, useState } from "react"
import { canAccess, getEntitlementMode, isPremium, type FeatureId } from "@/lib/entitlements"

export function useEntitlements() {
  const [includeStored, setIncludeStored] = useState(false)

  useEffect(() => {
    if (getEntitlementMode() === "enforce") {
      setIncludeStored(true)
    }
  }, [])

  return {
    mode: getEntitlementMode(),
    isPremium: isPremium({ includeStored }),
    canAccess: (feature: FeatureId) => canAccess(feature, { includeStored }),
  }
}
