/** Analyse : score, complétude, red flags, synthèse et verdict prudent. */
import type { SectionProps } from './types'
import { ALL_INSPECTION_ITEMS } from '../../data/inspectionSections'
import { DEFAULT_DOCUMENTS } from '../../data/defaultDocuments'
import {
  computeCompleteness,
  computeScore,
  computeVerdict,
  listRedFlags,
} from '../../services/scoring'
import {
  acquisitionCost,
  maxPurchasePriceFor,
  rentalAnalysis,
  renovationBudget,
} from '../../services/calculations'
import { RENOVATION_PRIORITY_LABELS } from '../../models/renovation'
import { downloadJson, exportProperty } from '../../services/importExport'
import { navigate } from '../../hooks/useHashRoute'
import { formatEUR, formatPercent } from '../../utils/format'
import { Banner, Stat } from '../ui'

const VERDICT_STYLES: Record<string, string> = {
  'tres-interessant': 'bg-green-100 text-green-900 border-green-400',
  interessant: 'bg-green-50 text-green-900 border-green-300',
  'a-negocier': 'bg-amber-50 text-amber-900 border-amber-400',
  prudence: 'bg-orange-50 text-orange-900 border-orange-400',
  'risque-eleve': 'bg-red-50 text-red-900 border-red-400',
  'a-eviter': 'bg-red-100 text-red-900 border-red-500',
}

export default function AnalysisSection({ property }: SectionProps) {
  const score = computeScore(property)
  const completeness = computeCompleteness(property)
  const redFlags = listRedFlags(property)
  const verdict = computeVerdict(property)
  const cost = acquisitionCost(property)
  const works = renovationBudget(property.renovations, property.finance.contingencyRate)
  const maxPrice = maxPurchasePriceFor(property)
  const rental = rentalAnalysis(property.finance.rental, cost.basePrice, cost.total)

  const positives = ALL_INSPECTION_ITEMS.filter(
    (item) =>
      property.inspection[item.id]?.status === 'good' &&
      (item.importance === 'major' || item.importance === 'critical'),
  )
  const negatives = ALL_INSPECTION_ITEMS.filter(
    (item) => property.inspection[item.id]?.status === 'bad',
  )
  const unverified = ALL_INSPECTION_ITEMS.filter((item) => {
    const status = property.inspection[item.id]?.status ?? 'not-inspected'
    return status === 'not-inspected' || status === 'to-check'
  })
  const missingDocs = DEFAULT_DOCUMENTS.filter(
    (doc) => property.documents[doc.id]?.status === 'missing',
  )
  const unansweredQuestions = property.questions.filter((q) => !q.answer?.trim())
  const urgentWorks = property.renovations.filter(
    (l) => l.priority === 'immediate' || l.priority === 'lt-1-an',
  )
  const laterWorks = property.renovations.filter(
    (l) => l.priority === '1-3-ans' || l.priority === 'confort',
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Score" value={score.total === null ? '—' : `${score.total}/100`} accent />
        <Stat label="Complétude" value={formatPercent(completeness.ratio)} />
        <Stat label="Red flags" value={redFlags.length} />
        <Stat label="Travaux estimés" value={formatEUR(Math.round(works.total))} />
        <Stat label="Coût total" value={cost.total !== undefined ? formatEUR(Math.round(cost.total)) : '—'} />
        <Stat label="Prix maximum" value={maxPrice !== undefined ? formatEUR(Math.round(maxPrice)) : '—'} />
        {rental.grossYieldOnPrice !== undefined && (
          <Stat label="Rendement brut" value={formatPercent(rental.grossYieldOnPrice, 1)} />
        )}
      </div>

      <p className="text-sm text-gray-600">
        {completeness.controlledCount}/{completeness.totalCount} contrôles effectués ·{' '}
        {completeness.unverifiedCount} éléments non vérifiés · {missingDocs.length} document(s)
        manquant(s) · {redFlags.length} red flag(s)
      </p>

      {verdict.reliabilityMessage && <Banner tone="warning">⚠️ {verdict.reliabilityMessage}</Banner>}

      {redFlags.length > 0 && (
        <Banner tone="danger">
          <p className="mb-1 font-bold">🚩 Red flags — jamais masqués par le score</p>
          <ul className="list-disc pl-5">
            {redFlags.map((flag, i) => (
              <li key={i}>
                {flag.label}
                {flag.detail ? ` — ${flag.detail}` : ''}
              </li>
            ))}
          </ul>
        </Banner>
      )}

      <div className={`rounded-xl border p-4 ${VERDICT_STYLES[verdict.level]}`}>
        <div className="text-xs font-semibold uppercase tracking-wide">Verdict (score + complétude + red flags + finances)</div>
        <div className="text-2xl font-bold">{verdict.label}</div>
        {verdict.reasons.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-sm">
            {verdict.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="section-title mb-2">Score par catégorie</h2>
        <div className="space-y-1.5">
          {score.categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 text-sm">
              <span className="w-44 shrink-0 text-gray-600">
                {cat.label} <span className="text-xs text-gray-400">({cat.weight})</span>
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                {cat.score !== null && (
                  <div
                    className={`h-full ${cat.score >= 0.7 ? 'bg-green-500' : cat.score >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${cat.score * 100}%` }}
                  />
                )}
              </div>
              <span className="w-12 text-right font-semibold">
                {cat.score === null ? '—' : Math.round(cat.score * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <h3 className="mb-1 font-semibold text-green-800">✅ Points positifs</h3>
          {positives.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun point fort majeur évalué pour l'instant.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {positives.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="mb-1 font-semibold text-red-800">❌ Points négatifs</h3>
          {negatives.length === 0 && property.anomalies.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun point négatif relevé pour l'instant.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {negatives.map((item) => {
                const result = property.inspection[item.id]
                return (
                  <li key={item.id}>
                    {item.label}
                    {result?.comment ? ` — ${result.comment}` : ''}
                    {result?.estimatedCost !== undefined ? ` (${formatEUR(result.estimatedCost)})` : ''}
                  </li>
                )
              })}
              {property.anomalies
                .filter((a) => !a.redFlag)
                .map((a) => (
                  <li key={a.id}>
                    {a.description} ({a.category})
                  </li>
                ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="mb-1 font-semibold">🛠️ Travaux urgents</h3>
          {urgentWorks.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune ligne immédiate ou &lt; 1 an.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {urgentWorks.map((l) => (
                <li key={l.id}>
                  {l.category}
                  {l.description ? ` — ${l.description}` : ''} ({RENOVATION_PRIORITY_LABELS[l.priority]})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="mb-1 font-semibold">📅 Travaux futurs</h3>
          {laterWorks.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune ligne 1–3 ans ou confort.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {laterWorks.map((l) => (
                <li key={l.id}>
                  {l.category}
                  {l.description ? ` — ${l.description}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold">
          🔎 Éléments non vérifiés ({unverified.length})
        </summary>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
          {unverified.map((item) => (
            <li key={item.id}>
              {item.label}
              {(property.inspection[item.id]?.status ?? 'not-inspected') === 'to-check' ? ' (à vérifier)' : ''}
            </li>
          ))}
        </ul>
      </details>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <h3 className="mb-1 font-semibold">📄 Documents manquants ({missingDocs.length})</h3>
          <ul className="list-disc pl-5 text-sm text-gray-600">
            {missingDocs.map((d) => (
              <li key={d.id}>{d.label}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-1 font-semibold">❓ Questions sans réponse ({unansweredQuestions.length})</h3>
          <ul className="list-disc pl-5 text-sm text-gray-600">
            {unansweredQuestions.slice(0, 8).map((q) => (
              <li key={q.id}>{q.question}</li>
            ))}
            {unansweredQuestions.length > 8 && <li>… et {unansweredQuestions.length - 8} autres</li>}
          </ul>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => navigate(`/property/${property.id}/report`)}>
          📄 Rapport de visite
        </button>
        <button
          className="btn"
          onClick={() =>
            downloadJson(
              `bien-${property.general.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`,
              exportProperty(property),
            )
          }
        >
          ⬇️ Exporter ce bien (JSON)
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Ces indicateurs sont un outil personnel d'aide à la décision et ne constituent pas une expertise
        immobilière professionnelle.
      </p>
    </div>
  )
}
