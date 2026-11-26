"use client"

import type { ReactNode } from "react"
import { LockKeyhole } from "lucide-react"
import { featureLabel, type FeatureId } from "@/lib/entitlements"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEntitlements } from "@/components/entitlements/use-entitlements"

type PremiumGateProps = {
  feature: FeatureId
  children: ReactNode
  variant?: "page" | "compact"
}

export function PremiumGate({ feature, children, variant = "page" }: PremiumGateProps) {
  const { canAccess } = useEntitlements()

  if (canAccess(feature)) {
    return children
  }

  if (variant === "compact") {
    return <CompactPremiumNote feature={feature} />
  }

  return <PremiumPaywall feature={feature} />
}

export function PremiumPaywall({ feature }: { feature: FeatureId }) {
  return (
    <Card className="rounded-2xl border-[#f0e2cf] bg-[#fffaf4]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole className="h-5 w-5 text-[#d9a441]" />
          Áurea Premium
        </CardTitle>
        <CardDescription>{featureLabel(feature)} hace parte del plan de pago.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          Ingresos, gastos y activos siguen disponibles. Deudas, patrimonio, quincena, proyecciones,
          clonado, exportación y recordatorios se habilitan con el plan premium.
        </p>
        <p>Esta compilación no cobra ni conecta una tienda. El acceso depende del plan configurado.</p>
      </CardContent>
    </Card>
  )
}

function CompactPremiumNote({ feature }: { feature: FeatureId }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-[#d9a441]/40 bg-[#fff7ec] px-3 py-2 text-sm font-medium text-[#7a5b16]">
      <LockKeyhole className="h-4 w-4" />
      {featureLabel(feature)} · Premium
    </span>
  )
}
