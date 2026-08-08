/**
 * Comparateur : met les biens côte à côte et met en évidence les écarts,
 * sans jamais désigner de « gagnant » — la décision reste humaine.
 */
import type { Property } from '../models/property'
import { PROPERTY_STATUS_LABELS } from '../models/property'
import { useProperties } from '../hooks/PropertiesContext'
import { navigate } from '../hooks/useHashRoute'
import {
  acquisitionCost,
  maxPurchasePriceFor,
  pricePerSquareMeter,
  rentalAnalysis,
  renovationBudget,
} from '../services/calculations'
import { computeCompleteness, computeScore, listRedFlags } from '../services/scoring'
import { formatEUR, formatNumber, formatPercent } from '../utils/format'

interface RowDef {
  label: string
  value: (p: Property) => number | undefined
  format: (v: number | undefined) => string
  /** true si une valeur haute est plutôt favorable. */
  higherIsBetter?: boolean
}

const ROWS: RowDef[] = [
  {
    label: 'Prix',
    value: (p) => p.prices.negotiatedPrice ?? p.prices.askingPrice,
    format: formatEUR,
  },
  { label: 'Surface', value: (p) => p.general.surface, format: (v) => formatNumber(v, 'm²'), higherIsBetter: true },
  {
    label: 'Prix au m²',
    value: (p) => {
      const v = pricePerSquareMeter(p.prices.negotiatedPrice ?? p.prices.askingPrice, p.general.surface)
      return v === undefined ? undefined : Math.round(v)
    },
    format: formatEUR,
  },
  { label: 'Score /100', value: (p) => computeScore(p).total ?? undefined, format: (v) => (v === undefined ? '—' : String(v)), higherIsBetter: true },
  { label: 'Complétude', value: (p) => computeCompleteness(p).ratio, format: (v) => formatPercent(v), higherIsBetter: true },
  { label: 'Red flags', value: (p) => listRedFlags(p).length, format: (v) => String(v ?? 0) },
  {
    label: 'Travaux (imprévus inclus)',
    value: (p) => Math.round(renovationBudget(p.renovations, p.finance.contingencyRate).total),
    format: formatEUR,
  },
  {
    label: 'Coût total',
    value: (p) => {
      const t = acquisitionCost(p).total
      return t === undefined ? undefined : Math.round(t)
    },
    format: formatEUR,
  },
  {
    label: 'Prix maximum',
    value: (p) => {
      const m = maxPurchasePriceFor(p)
      return m === undefined ? undefined : Math.round(m)
    },
    format: formatEUR,
    higherIsBetter: true,
  },
  {
    label: 'Valeur après travaux (probable)',
    value: (p) => p.finance.afterWorksValue.probable ?? p.finance.afterWorksValue.low,
    format: formatEUR,
    higherIsBetter: true,
  },
  { label: 'Loyer mensuel', value: (p) => p.finance.rental?.monthlyRent, format: formatEUR, higherIsBetter: true },
  {
    label: 'Rendement brut',
    value: (p) => {
      const cost = acquisitionCost(p)
      return rentalAnalysis(p.finance.rental, cost.basePrice, cost.total).grossYieldOnPrice
    },
    format: (v) => formatPercent(v, 1),
    higherIsBetter: true,
  },
]

export default function ComparePage({ ids }: { ids: string[] }) {
  const { properties } = useProperties()
  const selected = ids
    .map((id) => properties.find((p) => p.id === id))
    .filter((p): p is Property => Boolean(p))

  if (selected.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 text-center text-gray-500">
        <p>Sélectionnez au moins deux biens depuis le tableau de bord pour les comparer.</p>
        <button className="btn mt-3" onClick={() => navigate('/')}>
          ← Retour
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Comparaison ({selected.length} biens)</h1>
        <button className="btn" onClick={() => navigate('/')}>
          ← Retour
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="p-3"></th>
              {selected.map((p) => (
                <th key={p.id} className="p-3 align-top">
                  <button className="text-blue-700 underline" onClick={() => navigate(`/property/${p.id}`)}>
                    {p.general.title}
                  </button>
                  <div className="text-xs font-normal text-gray-500">
                    {p.general.city} · {PROPERTY_STATUS_LABELS[p.status]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const values = selected.map((p) => row.value(p))
              const defined = values.filter((v): v is number => v !== undefined)
              const best =
                defined.length >= 2 && row.higherIsBetter !== undefined
                  ? row.higherIsBetter
                    ? Math.max(...defined)
                    : Math.min(...defined)
                  : undefined
              const differ = defined.length >= 2 && new Set(defined).size > 1
              return (
                <tr key={row.label} className="border-b border-gray-100 last:border-b-0">
                  <td className="p-3 font-medium text-gray-600">{row.label}</td>
                  {values.map((v, i) => (
                    <td
                      key={selected[i].id}
                      className={`p-3 ${differ ? 'font-semibold' : ''} ${
                        best !== undefined && v === best ? 'bg-blue-50 text-blue-800' : ''
                      }`}
                    >
                      {row.format(v)}
                    </td>
                  ))}
                </tr>
              )
            })}
            <tr>
              <td className="p-3 font-medium text-gray-600">🚩 Red flags (détail)</td>
              {selected.map((p) => {
                const flags = listRedFlags(p)
                return (
                  <td key={p.id} className="p-3 align-top">
                    {flags.length === 0 ? (
                      <span className="text-gray-400">Aucun</span>
                    ) : (
                      <ul className="list-disc pl-4 text-red-800">
                        {flags.map((f, i) => (
                          <li key={i}>{f.label}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Les cases surlignées signalent la valeur la plus favorable de chaque ligne, à complétude et
        contexte égaux — l'outil ne désigne pas de « gagnant ».
      </p>
    </div>
  )
}
