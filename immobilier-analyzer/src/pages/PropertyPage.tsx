/**
 * Fiche d'un bien : sections en onglets (navigation horizontale adaptée
 * au mobile) + bouton flottant « + Anomalie » disponible en permanence.
 */
import { useState } from 'react'
import type { Property, PropertyStatus } from '../models/property'
import { PROPERTY_STATUS_LABELS } from '../models/property'
import { useProperties } from '../hooks/PropertiesContext'
import { navigate } from '../hooks/useHashRoute'
import { computeCompleteness, computeScore, listRedFlags } from '../services/scoring'
import { formatPercent } from '../utils/format'
import AnomalyModal from '../components/AnomalyModal'
import SummarySection from '../components/sections/SummarySection'
import VisitSection from '../components/sections/VisitSection'
import TechnicalSection from '../components/sections/TechnicalSection'
import RenovationSection from '../components/sections/RenovationSection'
import FinanceSection from '../components/sections/FinanceSection'
import DocumentsSection from '../components/sections/DocumentsSection'
import PhotosSection from '../components/sections/PhotosSection'
import QuestionsSection from '../components/sections/QuestionsSection'
import AnalysisSection from '../components/sections/AnalysisSection'

const TABS = [
  { id: 'resume', label: 'Résumé', icon: '📋' },
  { id: 'visite', label: 'Visite', icon: '🚪' },
  { id: 'technique', label: 'Technique', icon: '🔍' },
  { id: 'travaux', label: 'Travaux', icon: '🛠️' },
  { id: 'finances', label: 'Finances', icon: '💶' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'photos', label: 'Photos', icon: '📷' },
  { id: 'questions', label: 'Questions', icon: '❓' },
  { id: 'analyse', label: 'Analyse', icon: '📊' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function PropertyPage({ property, tab }: { property: Property; tab?: string }) {
  const { update } = useProperties()
  const [showAnomaly, setShowAnomaly] = useState(false)
  const activeTab: TabId = (TABS.some((t) => t.id === tab) ? tab : 'resume') as TabId

  const patch = (updater: (p: Property) => Property) => update(property.id, updater)

  const score = computeScore(property).total
  const completeness = computeCompleteness(property)
  const redFlags = listRedFlags(property)

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-3">
      <div className="no-print mb-2 flex items-center justify-between gap-2">
        <button className="btn" onClick={() => navigate('/')}>
          ← Mes biens
        </button>
        <select
          className="input max-w-44"
          value={property.status}
          onChange={(e) => patch((p) => ({ ...p, status: e.target.value as PropertyStatus }))}
        >
          {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <h1 className="text-xl font-bold">{property.general.title}</h1>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <span>{property.general.city || 'Ville non renseignée'}</span>
        <span className="chip bg-gray-200 text-gray-700">
          Score : {score === null ? '—' : `${score}/100`}
        </span>
        <span className="chip bg-gray-200 text-gray-700">
          Complétude : {formatPercent(completeness.ratio)}
        </span>
        {redFlags.length > 0 && (
          <span className="chip bg-red-100 text-red-800">🚩 {redFlags.length} red flag(s)</span>
        )}
      </div>

      <nav className="no-print -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 px-4 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/property/${property.id}?tab=${t.id}`)}
            className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium ${
              activeTab === t.id
                ? 'border-b-2 border-blue-700 bg-white text-blue-700'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === 'resume' && <SummarySection property={property} update={patch} />}
      {activeTab === 'visite' && <VisitSection property={property} update={patch} />}
      {activeTab === 'technique' && <TechnicalSection property={property} update={patch} />}
      {activeTab === 'travaux' && <RenovationSection property={property} update={patch} />}
      {activeTab === 'finances' && <FinanceSection property={property} update={patch} />}
      {activeTab === 'documents' && <DocumentsSection property={property} update={patch} />}
      {activeTab === 'photos' && <PhotosSection property={property} update={patch} />}
      {activeTab === 'questions' && <QuestionsSection property={property} update={patch} />}
      {activeTab === 'analyse' && <AnalysisSection property={property} update={patch} />}

      <button
        className="no-print fixed bottom-5 right-4 z-40 rounded-full bg-red-600 px-5 py-3.5 text-base font-bold text-white shadow-lg active:scale-95"
        onClick={() => setShowAnomaly(true)}
      >
        + Anomalie
      </button>

      {showAnomaly && (
        <AnomalyModal
          propertyId={property.id}
          photos={property.photos}
          roomNames={property.rooms.map((r) => r.name)}
          onAddPhoto={(photo) => patch((p) => ({ ...p, photos: [...p.photos, photo] }))}
          onRemovePhoto={(photoId) =>
            patch((p) => ({ ...p, photos: p.photos.filter((ph) => ph.id !== photoId) }))
          }
          onSave={(anomaly) => patch((p) => ({ ...p, anomalies: [...p.anomalies, anomaly] }))}
          onClose={() => setShowAnomaly(false)}
        />
      )}
    </div>
  )
}
