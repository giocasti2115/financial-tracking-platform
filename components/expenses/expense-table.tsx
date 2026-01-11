"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Asset, Debt, Expense } from "@/lib/types"
import { Pencil, Trash2, CheckCircle2, AlertCircle, DollarSign } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditExpenseDialog } from "./edit-expense-dialog"
import { RegisterPaymentDialog } from "./register-payment-dialog"

interface ExpenseTableProps {
  expenses: Expense[]
  debts: Debt[]
  assets: Asset[]
  onDelete: (id: string) => void
  onEdit: (expense: Expense) => void
  onTogglePayment: (id: string) => void
  onRegisterPayment: (expenseId: string, paymentAmount: number, notes?: string, assetId?: string) => Promise<void> | void
}

export function ExpenseTable({ expenses, debts, assets, onDelete, onEdit, onTogglePayment, onRegisterPayment }: ExpenseTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [paymentContext, setPaymentContext] = useState<{ expense: Expense; debt?: Debt } | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  const debtMap = useMemo(() => new Map(debts.map((debt) => [debt.id, debt])), [debts])

  const isExpenseLocked = (expense: Expense) => expense.is_paid || (expense.amount_paid ?? 0) > 0

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  const handleEdit = (expense: Expense) => {
    if (isExpenseLocked(expense)) {
      return
    }
    setEditExpense(expense)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = (expense: Expense) => {
    onEdit(expense)
    setEditDialogOpen(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
  }

  const getPeriodBadge = (period: string) => {
    return period === "primera_quincena" ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Primera (15)
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        Segunda (30)
      </Badge>
    )
  }

  const isOverdue = (expense: Expense) => {
    if (expense.is_paid) return false
    const paymentDate = new Date(expense.payment_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return paymentDate < today
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">No hay gastos registrados</p>
        <p className="text-sm text-muted-foreground mt-1">Agrega tu primer gasto para comenzar</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[840px]">
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Pagado</TableHead>
              <TableHead>Pendiente</TableHead>
              <TableHead>Quincena</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Deuda</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => {
              const rowClassName = expense.is_paid
                ? "bg-yellow-50 hover:bg-yellow-100"
                : isOverdue(expense)
                  ? "bg-red-50 hover:bg-red-100"
                  : ""
              const amountPaid = expense.amount_paid ?? 0
              const remaining = expense.amount - amountPaid
              const locked = isExpenseLocked(expense)

              return (
                <TableRow key={expense.id} className={rowClassName}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTogglePayment(expense.id)}
                      className={
                        expense.is_paid ? "text-green-600 hover:text-green-700" : "text-gray-400 hover:text-gray-600"
                      }
                    >
                      {expense.is_paid ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isOverdue(expense) ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="font-semibold">${expense.amount.toLocaleString("es-CO")}</TableCell>
                  <TableCell className="text-emerald-600 font-medium">${amountPaid.toLocaleString("es-CO")}</TableCell>
                  <TableCell className={remaining > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                    ${remaining.toLocaleString("es-CO")}
                  </TableCell>
                  <TableCell>{getPeriodBadge(expense.payment_period)}</TableCell>
                  <TableCell>{formatDate(expense.payment_date)}</TableCell>
                  <TableCell>
                    {expense.debt_id ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {debtMap.get(expense.debt_id)?.entity_name ?? "Deuda"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!expense.is_paid && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => {
                            setPaymentContext({ expense, debt: expense.debt_id ? debtMap.get(expense.debt_id) : undefined })
                            setPaymentDialogOpen(true)
                          }}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(expense)}
                        disabled={locked}
                        title={locked ? "Este gasto ya tiene pagos registrados" : undefined}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (locked) return
                          setDeleteId(expense.id)
                        }}
                        disabled={locked}
                        title={locked ? "No puedes eliminar un gasto con pagos" : undefined}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <EditExpenseDialog
        expense={editExpense}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
        debts={debts}
      />

      <RegisterPaymentDialog
        expense={paymentContext?.expense ?? null}
        debt={paymentContext?.debt}
        assets={assets}
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open)
          if (!open) {
            setPaymentContext(null)
          }
        }}
        onRegisterPayment={onRegisterPayment}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El gasto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
