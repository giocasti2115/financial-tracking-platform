"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getFinancialYears } from "@/lib/utils"

interface ExpenseFiltersProps {
  filters: {
    year: string
    semester: string
    month: string
    period: string
    search: string
  }
  onFilterChange: (filters: any) => void
  onReset: () => void
  isDirty: boolean
}

export function ExpenseFilters({ filters, onFilterChange, onReset, isDirty }: ExpenseFiltersProps) {
  const years = getFinancialYears()

  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Filtra por periodo, quincena y búsqueda.</p>
          <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={!isDirty}>
            Limpiar filtros
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="year-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
              Año
            </Label>
            <Select value={filters.year} onValueChange={(value) => onFilterChange({ ...filters, year: value })}>
              <SelectTrigger id="year-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="semester-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
              Semestre
            </Label>
            <Select value={filters.semester} onValueChange={(value) => onFilterChange({ ...filters, semester: value })}>
              <SelectTrigger id="semester-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1">Primer Semestre</SelectItem>
                <SelectItem value="2">Segundo Semestre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="month-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
              Mes
            </Label>
            <Select value={filters.month} onValueChange={(value) => onFilterChange({ ...filters, month: value })}>
              <SelectTrigger id="month-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="period-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
              Quincena
            </Label>
            <Select value={filters.period} onValueChange={(value) => onFilterChange({ ...filters, period: value })}>
              <SelectTrigger id="period-filter">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="primera_quincena">Primera (15)</SelectItem>
                <SelectItem value="segunda_quincena">Segunda (30)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="search-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
              Buscar
            </Label>
            <Input
              id="search-filter"
              type="search"
              placeholder="Descripción o notas"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
