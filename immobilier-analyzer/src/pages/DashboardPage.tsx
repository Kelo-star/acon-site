/** Tableau de bord : tous les biens, recherche, filtres, comparaison. */
import { useRef, useState } from 'react'
import type { Property, PropertyStatus } from '../models/property'
import { PROPERTY_STATUS_LABELS } from '../models/property'
import { useProperties } from '../hooks/PropertiesContext'
import { navigate } from '../hooks/useHashRoute'
import { acquisitionCost, maxPurchasePriceFor, pricePerSquareMeter, rentalAnalysis, renovationBudget } from '../services/calculations'
import { computeCompleteness, computeScore, listRedFlags } from '../services/scoring'
import { downloadJson, exportAll, parseImport } from '../services/importExport'
import { formatDate, formatEUR, formatNumber, formatPercent } from '../utils/format'
import { Banner } from '../components/ui'

interface Filters {
  search: string
  city: string
  status: PropertyStatus | ''
  minScore?: number
  maxWorks?: number
  maxPrice?: number
  minYield?: number
}

const EMPTY_FILTERS: Filters = { search: '', city: '', status: '' }

function matchesFilters(property: Property, filters: Filters): boolean {
  const text = `${property.general.title} ${property.general.address ?? ''} ${property.general.city}`.toLowerCase()
  if (filters.search && !text.includes(filters.search.toLowerCase())) return false
  if (filters.city && !property.general.city.toLowerCase().includes(filters.city.toLowerCase())) return false
  if (filters.status && property.status !== filters.status) return false
  if (filters.minScore !== undefined) {
    const score = computeScore(property).total
    if (score === null || score < filters.minScore) return false
  }
  if (filters.maxWorks !== undefined) {
    if (renovationBudget(property.renovations, property.finance.contingencyRate).total > filters.maxWorks) return false
  }
  if (filters.maxPrice !== undefined) {
    const price = property.prices.negotiatedPrice ?? property.prices.askingPrice
    if (price === undefined || price > filters.maxPrice) return false
  }
  if (filters.minYield !== undefined) {
    const cost = acquisitionCost(property)
    const yield_ = rentalAnalysis(property.finance.rental, cost.basePrice, cost.total).grossYieldOnPrice
    if (yield_ === undefined || yield_ * 100 < filters.minYield) return false
  }
  return true
}

function PropertyCard({
  property,
  selected,
  onToggleSelect,
}: {
  property: Property
  selected: boolean
  onToggleSelect: () => void
}) {
  const { duplicate, remove } = useProperties()
  const score = computeScore(property).total
  const completeness = computeCompleteness(property)
  const redFlags = listRedFlags(property)
  const works = renovationBudget(property.renovations, property.finance.contingencyRate)
  const maxPrice = maxPurchasePriceFor(property)
  const price = property.prices.negotiatedPrice ?? property.prices.askingPrice
  const priceM2 = pricePerSquareMeter(price, property.general.surface)

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/property/${property.id}`)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-bold text-gray-900">{property.general.title}</span>
            <span className="chip bg-blue-100 text-blue-800">{PROPERTY_STATUS_LABELS[property.status]}</span>
            {redFlags.length > 0 && (
              <span className="chip bg-red-100 text-red-800">🚩 {redFlags.length}</span>
            )}
          </div>
          <div className="mt-0.5 text-sm text-gray-500">
            {property.general.city || 'Ville non renseignée'}
            {property.general.address ? ` · ${property.general.address}` : ''}
            {property.listing ? ` · ${property.listing.source}` : ''}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <span className="text-gray-500">Prix </span>
              <strong className="text-blue-700">{formatEUR(price)}</strong>
            </div>
            <div>
              <span className="text-gray-500">Surface </span>
              <strong>{formatNumber(property.general.surface, 'm²')}</strong>
            </div>
            <div>
              <span className="text-gray-500">Prix/m² </span>
              <strong>{priceM2 !== undefined ? formatEUR(Math.round(priceM2)) : '—'}</strong>
            </div>
            <div>
              <span className="text-gray-500">Visite </span>
              <strong>{formatDate(property.visit.visitDate)}</strong>
            </div>
            <div>
              <span className="text-gray-500">Score </span>
              <strong>{score === null ? '—' : `${score}/100`}</strong>
              <span className="text-xs text-gray-400"> ({formatPercent(completeness.ratio)})</span>
            </div>
            <div>
              <span className="text-gray-500">Travaux </span>
              <strong>{formatEUR(works.total)}</strong>
            </div>
            <div>
              <span className="text-gray-500">Prix max </span>
              <strong>{maxPrice !== undefined ? formatEUR(Math.round(maxPrice)) : '—'}</strong>
            </div>
          </div>
        </button>
        <label className="flex shrink-0 flex-col items-center gap-1 text-[10px] text-gray-500">
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="h-5 w-5" />
          Comparer
        </label>
      </div>
      <div className="no-print mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-2">
        <button className="btn" onClick={() => navigate(`/property/${property.id}`)}>
          Ouvrir
        </button>
        <button
          className="btn"
          onClick={() => {
            void duplicate(property.id)
          }}
        >
          Dupliquer
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm(`Supprimer « ${property.general.title} » ?`)) void remove(property.id)
          }}
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { properties, loading, importMany } = useProperties()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const visible = properties.filter((p) => matchesFilters(p, filters))

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleImportFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    try {
      const result = parseImport(await file.text())
      await importMany(result.properties)
      setMessage(
        result.type === 'backup'
          ? `Sauvegarde restaurée : ${result.properties.length} bien(s).`
          : `Bien importé : ${result.properties[0].general.title}.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Mes biens</h1>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/new')}>
          + Nouveau bien
        </button>
      </div>

      {message && (
        <div className="mb-3">
          <Banner tone="info">
            <div className="flex items-center justify-between gap-2">
              <span>{message}</span>
              <button className="font-bold" onClick={() => setMessage(null)}>
                ×
              </button>
            </div>
          </Banner>
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <input
          className="input"
          placeholder="Rechercher (nom, adresse, ville)…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <button className="btn shrink-0" onClick={() => setShowFilters((s) => !s)}>
          Filtres {showFilters ? '▴' : '▾'}
        </button>
      </div>

      {showFilters && (
        <div className="card mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label>
            <span className="label">Ville</span>
            <input
              className="input"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            />
          </label>
          <label>
            <span className="label">Statut</span>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as PropertyStatus | '' }))}
            >
              <option value="">Tous</option>
              {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Score min</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={filters.minScore ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, minScore: e.target.value === '' ? undefined : Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <span className="label">Budget travaux max (€)</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={filters.maxWorks ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, maxWorks: e.target.value === '' ? undefined : Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <span className="label">Prix max (€)</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={filters.maxPrice ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, maxPrice: e.target.value === '' ? undefined : Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <span className="label">Rendement brut min (%)</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={filters.minYield ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, minYield: e.target.value === '' ? undefined : Number(e.target.value) }))
              }
            />
          </label>
          <button className="btn col-span-2 sm:col-span-3" onClick={() => setFilters(EMPTY_FILTERS)}>
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-gray-500">Chargement…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-10 text-center text-gray-500">
          {properties.length === 0 ? (
            <>
              <p className="mb-2 font-medium">Aucun bien pour le moment.</p>
              <p className="text-sm">
                Créez votre premier dossier de visite avec « + Nouveau bien » : saisie manuelle ou import
                d'une annonce.
              </p>
            </>
          ) : (
            <p>Aucun bien ne correspond aux filtres.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              selected={selected.includes(property.id)}
              onToggleSelect={() => toggleSelect(property.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          className="btn"
          onClick={() => downloadJson('immobilier-analyzer-sauvegarde.json', exportAll(properties))}
          disabled={properties.length === 0}
        >
          ⬇️ Exporter toutes les données
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          ⬆️ Importer une sauvegarde / un bien
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void handleImportFile(e.target.files)}
        />
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        🔒 Vos données sont enregistrées localement sur cet appareil. Aucune donnée n'est envoyée vers un
        service tiers. Pensez à exporter régulièrement une sauvegarde JSON.
      </p>

      {selected.length >= 2 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <button
            className="btn btn-primary btn-lg shadow-lg"
            onClick={() => navigate(`/compare?ids=${selected.join(',')}`)}
          >
            Comparer {selected.length} biens
          </button>
        </div>
      )}
    </div>
  )
}
