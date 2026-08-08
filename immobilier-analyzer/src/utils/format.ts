const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

export function formatEUR(value: number | undefined | null): string {
  return value === undefined || value === null || Number.isNaN(value) ? '—' : eur.format(value)
}

export function formatNumber(value: number | undefined | null, unit?: string): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return unit ? `${num.format(value)} ${unit}` : num.format(value)
}

export function formatPercent(rate: number | undefined | null, digits = 0): string {
  if (rate === undefined || rate === null || Number.isNaN(rate)) return '—'
  return `${(rate * 100).toFixed(digits).replace('.', ',')} %`
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('fr-FR')
}
