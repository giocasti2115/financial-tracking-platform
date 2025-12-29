"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Debt } from "@/lib/types"
import { calculations } from "@/lib/calculations"
import { AddPaymentDialog } from "./add-payment-dialog"
import { EditDebtDialog } from "./edit-debt-dialog"
import { Calendar, Loader2, TrendingDown, Trash2 } from "lucide-react"
import type { UpdateDebtPayload } from "@/lib/api-client"

interface DebtCardProps {
  debt: Debt
  onRegisterPayment: (data: { debtId: string; amount: number; payment_date: string; notes?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, payload: UpdateDebtPayload) => Promise<void>
  isDeleting?: boolean
  isUpdating?: boolean
}

export function DebtCard({ debt, onRegisterPayment, onDelete, onUpdate, isDeleting, isUpdating }: DebtCardProps) {
  const progress = ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100
  const monthsLeft = calculations.calculateMonthsUntilPaidOff(debt)

  const getStatusBadge = () => {
    switch (debt.status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Activa
          </Badge>
        )
      case "paid":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Pagada
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Pendiente
          </Badge>
        )
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{debt.entity_name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className="capitalize">{debt.debt_type}</span>
              {getStatusBadge()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <EditDebtDialog
              debt={debt}
              onSubmit={(payload) => onUpdate(debt.id, payload)}
              isUpdating={isUpdating}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(debt.id)}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saldo Actual</span>
            <span className="text-2xl font-bold text-red-600">${debt.current_balance.toLocaleString("es-CO")}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Monto Original</span>
            <span>${debt.original_amount.toLocaleString("es-CO")}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso de Pago</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Payment Info */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {debt.monthly_payment && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3" />
                <span>Pago Mensual</span>
              </div>
              <p className="text-sm font-semibold">${debt.monthly_payment.toLocaleString("es-CO")}</p>
            </div>
          )}

          {monthsLeft && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Meses Restantes</span>
              </div>
              <p className="text-sm font-semibold">{monthsLeft} meses</p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        {(debt.interest_rate || debt.payment_day) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            {debt.interest_rate && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tasa de Interés</p>
                <p className="text-sm font-medium">{debt.interest_rate}%</p>
              </div>
            )}
            {debt.payment_day && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Día de Pago</p>
                <p className="text-sm font-medium">Día {debt.payment_day}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {debt.status === "active" && (
          <div className="pt-2">
            <AddPaymentDialog
              debtId={debt.id}
              currentBalance={debt.current_balance}
              onSubmit={onRegisterPayment}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
