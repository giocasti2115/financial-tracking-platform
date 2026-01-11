import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const FINANCIAL_YEAR_START = 2026
export const FINANCIAL_YEAR_END = 2035

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFinancialYears() {
  return Array.from({ length: FINANCIAL_YEAR_END - FINANCIAL_YEAR_START + 1 }, (_, index) =>
    FINANCIAL_YEAR_START + index,
  )
}

export function clampFinancialYear(year: number) {
  if (Number.isNaN(year)) {
    return FINANCIAL_YEAR_START
  }
  return Math.min(Math.max(year, FINANCIAL_YEAR_START), FINANCIAL_YEAR_END)
}

export function parseCurrencyInput(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return Number.NaN
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN
  }

  const trimmed = value.toString().trim()
  if (!trimmed) {
    return Number.NaN
  }

  const sanitized = trimmed.replace(/[\s$]/g, '').replace(/[^0-9.,-]/g, '')
  let normalized = sanitized.includes(',')
    ? sanitized.replace(/\./g, '').replace(',', '.')
    : sanitized

  const dotCount = (normalized.match(/\./g) ?? []).length
  if (dotCount > 1) {
    const parts = normalized.split('.')
    const decimal = parts[parts.length - 1]
    normalized = `${parts.slice(0, -1).join('')}.${decimal}`
  }

  return Number.parseFloat(normalized)
}
