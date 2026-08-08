/** Rapport de visite imprimable (impression native du navigateur). */
import type { Property } from '../models/property'
import { PROPERTY_STATUS_LABELS } from '../models/property'
import { navigate } from '../hooks/useHashRoute'
import { INSPECTION_SECTIONS } from '../data/inspectionSections'
import { DEFAULT_DOCUMENTS } from '../data/defaultDocuments'
import { DOCUMENT_STATUS_LABELS, INSPECTION_STATUS_LABELS, SEVERITY_LABELS } from '../models/inspection'
import { RENOVATION_PRIORITY_LABELS, RENOVATION_STATUS_LABELS } from '../models/renovation'
import {
  acquisitionCost,
  maxPurchasePriceFor,
  pricePerSquareMeter,
  rentalAnalysis,
  renovationBudget,
  renovationLineAmount,
} from '../services/calculations'
import { computeCompleteness, computeScore, computeVerdict, listRedFlags } from '../services/scoring'
import { formatDate, formatEUR, formatNumber, formatPercent } from '../utils/format'
import { usePhotoUrl } from '../components/PhotoPicker'
import type { Photo } from '../models/inspection'

function ReportPhoto({ photo }: { photo: Photo }) {
  const url = usePhotoUrl(photo.id)
  if (!url) return null
  return (
    <figure className="print-block">
      <img src={url} alt={photo.caption ?? 'Photo'} className="h-36 w-full rounded object-cover" />
      {photo.caption && <figcaption className="text-xs text-gray-500">{photo.caption}</figcaption>}
    </figure>
  )
}

export default function ReportPage({ property }: { property: Property }) {
  const score = computeScore(property)
  const completeness = computeCompleteness(property)
  const redFlags = listRedFlags(property)
  const verdict = computeVerdict(property)
  const cost = acquisitionCost(property)
  const works = renovationBudget(property.renovations, property.finance.contingencyRate)
  const maxPrice = maxPurchasePriceFor(property)
  const rental = rentalAnalysis(property.finance.rental, cost.basePrice, cost.total)
  const priceM2 = pricePerSquareMeter(cost.basePrice, property.general.surface)

  const answeredSections = INSPECTION_SECTIONS.map((section) => ({
    section,
    results: section.items
      .map((item) => ({ item, result: property.inspection[item.id] }))
      .filter(({ result }) => result && result.status !== 'not-inspected'),
  })).filter(({ results }) => results.length > 0)

  return (
    <div className="print-page mx-auto max-w-3xl bg-white px-6 py-6 text-sm">
      <div className="no-print mb-4 flex justify-between gap-2">
        <button className="btn" onClick={() => navigate(`/property/${property.id}?tab=analyse`)}>
          ← Retour à la fiche
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨️ Imprimer / Enregistrer en PDF
        </button>
      </div>

      <header className="mb-4 border-b-2 border-gray-800 pb-3">
        <h1 className="text-2xl font-bold">Rapport de visite — {property.general.title}</h1>
        <p className="text-gray-600">
          {[property.general.address, property.general.postalCode, property.general.city]
            .filter(Boolean)
            .join(', ') || 'Adresse non renseignée'}
          {' · '}Statut : {PROPERTY_STATUS_LABELS[property.status]}
          {property.visit.visitDate && ` · Visite du ${formatDate(property.visit.visitDate)}`}
        </p>
        {property.listing && (
          <p className="text-xs text-gray-500">
            Annonce : {property.listing.source} — {property.listing.sourceUrl}
          </p>
        )}
      </header>

      <section className="print-block mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-gray-300 p-2">
          <div className="text-xs text-gray-500">Score</div>
          <div className="text-xl font-bold">{score.total === null ? '—' : `${score.total}/100`}</div>
        </div>
        <div className="rounded border border-gray-300 p-2">
          <div className="text-xs text-gray-500">Complétude</div>
          <div className="text-xl font-bold">{formatPercent(completeness.ratio)}</div>
        </div>
        <div className="rounded border border-gray-300 p-2">
          <div className="text-xs text-gray-500">Red flags</div>
          <div className="text-xl font-bold">{redFlags.length}</div>
        </div>
      </section>

      {verdict.reliabilityMessage && (
        <p className="print-block mb-3 rounded border border-amber-400 bg-amber-50 p-2 text-amber-900">
          ⚠️ {verdict.reliabilityMessage}
        </p>
      )}

      {redFlags.length > 0 && (
        <section className="print-block mb-4 rounded border border-red-500 bg-red-50 p-3">
          <h2 className="font-bold text-red-900">🚩 Red flags</h2>
          <ul className="list-disc pl-5 text-red-900">
            {redFlags.map((f, i) => (
              <li key={i}>
                {f.label}
                {f.detail ? ` — ${f.detail}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="print-block mb-4">
        <h2 className="mb-1 border-b border-gray-300 font-bold">Informations sur le bien</h2>
        <table className="w-full">
          <tbody>
            {(
              [
                ['Type', property.general.propertyType],
                ['Surface', formatNumber(property.general.surface, 'm²')],
                ['Terrain', formatNumber(property.general.landSurface, 'm²')],
                ['Pièces / chambres', `${property.general.rooms ?? '—'} / ${property.general.bedrooms ?? '—'}`],
                ['Année de construction', property.general.constructionYear ?? '—'],
                ['DPE / GES', `${property.info.dpe ?? '—'} / ${property.info.ges ?? '—'}`],
                ['Taxe foncière', formatEUR(property.info.propertyTax)],
                ['Prix demandé', formatEUR(property.prices.askingPrice)],
                ['Prix négocié', formatEUR(property.prices.negotiatedPrice)],
                ['Prix au m²', priceM2 !== undefined ? formatEUR(Math.round(priceM2)) : '—'],
              ] as [string, string | number][]
            ).map(([label, value]) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-0.5 pr-2 text-gray-500">{label}</td>
                <td className="py-0.5 font-medium">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {property.notes && (
        <section className="print-block mb-4">
          <h2 className="mb-1 border-b border-gray-300 font-bold">Observations générales</h2>
          <p className="whitespace-pre-wrap">{property.notes}</p>
        </section>
      )}

      {property.anomalies.length > 0 && (
        <section className="print-block mb-4">
          <h2 className="mb-1 border-b border-gray-300 font-bold">Anomalies relevées</h2>
          <ul className="list-disc pl-5">
            {property.anomalies.map((a) => (
              <li key={a.id}>
                {a.redFlag ? '🚩 ' : ''}
                <strong>{a.category}</strong>
                {a.room ? ` (${a.room})` : ''} — {a.description} · Gravité : {SEVERITY_LABELS[a.severity]}
                {a.estimatedCost !== undefined ? ` · ${formatEUR(a.estimatedCost)}` : ''}
                {a.checkByPro ? ' · avis professionnel requis' : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {property.photos.length > 0 && (
        <section className="print-block mb-4">
          <h2 className="mb-1 border-b border-gray-300 font-bold">Photos</h2>
          <div className="grid grid-cols-3 gap-2">
            {property.photos.map((photo) => (
              <ReportPhoto key={photo.id} photo={photo} />
            ))}
          </div>
        </section>
      )}

      {answeredSections.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-1 border-b border-gray-300 font-bold">Checklist de visite</h2>
          {answeredSections.map(({ section, results }) => (
            <div key={section.id} className="print-block mb-2">
              <h3 className="font-semibold">
                {section.icon} {section.title}
              </h3>
              <ul className="pl-1">
                {results.map(({ item, result }) => (
                  <li key={item.id} className="flex justify-between gap-2 border-b border-gray-100 py-0.5">
                    <span>
                      {result!.redFlag ? '🚩 ' : ''}
                      {item.label}
                      {result!.comment ? ` — ${result!.comment}` : ''}
                    </span>
                    <span className="shrink-0 font-medium">{INSPECTION_STATUS_LABELS[result!.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section className="print-block mb-4">
        <h2 className="mb-1 border-b border-gray-300 font-bold">Documents</h2>
        <ul className="columns-2 gap-4">
          {DEFAULT_DOCUMENTS.map((doc) => {
            const state = property.documents[doc.id]
            return (
              <li key={doc.id} className="flex justify-between border-b border-gray-100 py-0.5">
                <span>{doc.label}</span>
                <span className={state?.status === 'missing' ? 'font-semibold text-red-700' : 'text-gray-600'}>
                  {state ? DOCUMENT_STATUS_LABELS[state.status] : '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {property.renovations.length > 0 && (
        <section className="print-block mb-4">
          <h2 className="mb-1 border-b border-gray-300 font-bold">Travaux</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs text-gray-500">
                <th className="py-1">Poste</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th className="text-right">Budget retenu</th>
              </tr>
            </thead>
            <tbody>
              {property.renovations.map((line) => (
                <tr key={line.id} className="border-b border-gray-100">
                  <td className="py-1">
                    {line.category}
                    {line.description ? ` — ${line.description}` : ''}
                  </td>
                  <td>{RENOVATION_PRIORITY_LABELS[line.priority]}</td>
                  <td>{RENOVATION_STATUS_LABELS[line.status]}</td>
                  <td className="text-right">{formatEUR(renovationLineAmount(line))}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="py-1 text-right text-gray-500">
                  Imprévus ({formatPercent(property.finance.contingencyRate)})
                </td>
                <td className="text-right">{formatEUR(Math.round(works.contingency))}</td>
              </tr>
              <tr className="font-bold">
                <td colSpan={3} className="py-1 text-right">
                  Budget travaux total
                </td>
                <td className="text-right">{formatEUR(Math.round(works.total))}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      <section className="print-block mb-4">
        <h2 className="mb-1 border-b border-gray-300 font-bold">Analyse financière</h2>
        <table className="w-full">
          <tbody>
            {(
              [
                ['Frais de notaire (estimation)', cost.notary !== undefined ? formatEUR(Math.round(cost.notary)) : '—'],
                ['Frais annexes', formatEUR(cost.otherCosts)],
                ['Coût total d’acquisition', cost.total !== undefined ? formatEUR(Math.round(cost.total)) : '—'],
                ['Coût total au m²', cost.totalPerM2 !== undefined ? formatEUR(Math.round(cost.totalPerM2)) : '—'],
                ['Valeur après travaux (prudente)', formatEUR(property.finance.afterWorksValue.low ?? property.finance.afterWorksValue.probable)],
                ['Prix maximum théorique', maxPrice !== undefined ? formatEUR(Math.round(maxPrice)) : '—'],
                ['Rendement brut', formatPercent(rental.grossYieldOnPrice, 1)],
                ['Rendement net simplifié', formatPercent(rental.netYield, 1)],
              ] as [string, string][]
            ).map(([label, value]) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-0.5 pr-2 text-gray-500">{label}</td>
                <td className="py-0.5 font-medium">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {property.questions.some((q) => q.answer?.trim()) && (
        <section className="print-block mb-4">
          <h2 className="mb-1 border-b border-gray-300 font-bold">Questions posées</h2>
          <ul className="pl-1">
            {property.questions
              .filter((q) => q.answer?.trim())
              .map((q) => (
                <li key={q.id} className="border-b border-gray-100 py-0.5">
                  <strong>{q.question}</strong> {q.answer}
                  {q.satisfactory === false ? ' (réponse jugée insatisfaisante)' : ''}
                  {q.toVerify ? ' (à vérifier)' : ''}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="print-block mb-4 rounded border border-gray-400 p-3">
        <h2 className="font-bold">Conclusion</h2>
        <p className="text-lg font-bold">{verdict.label}</p>
        <ul className="list-disc pl-5">
          {verdict.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
          <li>
            {completeness.controlledCount}/{completeness.totalCount} contrôles effectués,{' '}
            {completeness.unverifiedCount} éléments restant à vérifier.
          </li>
        </ul>
      </section>

      <footer className="text-xs text-gray-400">
        Rapport généré le {formatDate(new Date().toISOString())} avec Immobilier Analyzer. Ce document est
        un outil personnel d'aide à la décision et ne constitue pas une expertise immobilière
        professionnelle.
      </footer>
    </div>
  )
}
