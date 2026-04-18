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
    <Card className="border-border/60 bg-white/90 shadow-sm">
      <CardContent className="px-4 py-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Filtra por año, quincena o búsqueda sin recargar la tabla.</p>
          <Button type="button" variant="ghost" size="sm" className="self-start sm:self-auto px-0 sm:px-3" onClick={onReset} disabled={!isDirty}>
            Limpiar filtros
          </Button>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
          <div className="space-y-1">
            <Label htmlFor="year-filter" className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
              Año
            </Label>
            <Select value={filters.year} onValueChange={(value) => onFilterChange({ ...filters, year: value })}>
              <SelectTrigger id="year-filter" className="h-9 w-full">
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

          <div className="space-y-1">
            <Label htmlFor="semester-filter" className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
              Semestre
            </Label>
            <Select value={filters.semester} onValueChange={(value) => onFilterChange({ ...filters, semester: value })}>
              <SelectTrigger id="semester-filter" className="h-9 w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1">Primer Semestre</SelectItem>
                <SelectItem value="2">Segundo Semestre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="month-filter" className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
              Mes
            </Label>
            <Select value={filters.month} onValueChange={(value) => onFilterChange({ ...filters, month: value })}>
              <SelectTrigger id="month-filter" className="h-9 w-full">
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

          <div className="space-y-1">
            <Label htmlFor="period-filter" className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
              Quincena
            </Label>
            <Select value={filters.period} onValueChange={(value) => onFilterChange({ ...filters, period: value })}>
              <SelectTrigger id="period-filter" className="h-9 w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="primera_quincena">Primera (15)</SelectItem>
                <SelectItem value="segunda_quincena">Segunda (30)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="search-filter" className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
              Buscar
            </Label>
            <Input
              id="search-filter"
              type="search"
              className="h-9"
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
