import { useEffect, useState } from 'react'
import type { ListingImportResult } from './services/listingImport/types'
import type { Observation, Property, PropertyData } from './types/property'
import { createListingImportService } from './services/listingImport/listingImporter'
import { findBySourceUrl, loadProperties, saveProperties } from './services/propertyStore'
import { createPropertyFromReview, updatePropertyFromReview } from './services/propertyLifecycle'
import { fieldLabel } from './services/fields'
import PropertyList from './components/PropertyList'
import NewPropertyChoice from './components/NewPropertyChoice'
import ImportForm from './components/ImportForm'
import ReviewForm from './components/ReviewForm'
import PropertyDetail from './components/PropertyDetail'

type View =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'import' }
  | { name: 'importing' }
  | { name: 'review'; base: ListingImportResult | null; duplicate?: Property }
  | { name: 'detail'; id: string }

const importService = createListingImportService()

export default function App() {
  const [properties, setProperties] = useState<Property[]>(() => loadProperties())
  const [view, setView] = useState<View>({ name: 'list' })
  const [importError, setImportError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    saveProperties(properties)
  }, [properties])

  async function analyze(run: () => Promise<ListingImportResult>) {
    setImportError(null)
    setNotice(null)
    setView({ name: 'importing' })
    try {
      const base = await run()
      const duplicate = base.sourceUrl ? findBySourceUrl(properties, base.sourceUrl) : undefined
      setView({ name: 'review', base, duplicate })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error))
      setView({ name: 'import' })
    }
  }

  function handleCreate(base: ListingImportResult | null, values: PropertyData, changed: Set<string>) {
    const property = createPropertyFromReview({ base, values, changedFields: changed })
    setProperties((prev) => [property, ...prev])
    setNotice(null)
    setView({ name: 'detail', id: property.id })
  }

  function handleUpdate(target: Property, base: ListingImportResult, values: PropertyData, changed: Set<string>) {
    const { property, skippedFields } = updatePropertyFromReview({
      property: target,
      base,
      values,
      changedFields: changed,
    })
    setProperties((prev) => prev.map((p) => (p.id === property.id ? property : p)))
    setNotice(
      skippedFields.length > 0
        ? `Champs non modifiés car couverts par une observation (visite/document) : ${skippedFields
            .map((key) => fieldLabel(key))
            .join(', ')}.`
        : null,
    )
    setView({ name: 'detail', id: property.id })
  }

  function handleAddObservation(id: string, observation: Observation) {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, observations: [...p.observations, observation], updatedAt: new Date().toISOString() }
          : p,
      ),
    )
  }

  function handleDelete(id: string) {
    setProperties((prev) => prev.filter((p) => p.id !== id))
    setView({ name: 'list' })
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="app-title" onClick={() => setView({ name: 'list' })}>
          🏠 Immobilier Analyzer
        </button>
      </header>

      <main className="app-main">
        {notice && (
          <div className="banner banner-info">
            <span>{notice}</span>
            <button className="btn btn-ghost" onClick={() => setNotice(null)}>
              Fermer
            </button>
          </div>
        )}

        {view.name === 'list' && (
          <PropertyList
            properties={properties}
            onNew={() => setView({ name: 'new' })}
            onOpen={(id) => setView({ name: 'detail', id })}
          />
        )}

        {view.name === 'new' && (
          <NewPropertyChoice
            onImport={() => setView({ name: 'import' })}
            onManual={() => setView({ name: 'review', base: null })}
            onCancel={() => setView({ name: 'list' })}
          />
        )}

        {view.name === 'import' && (
          <ImportForm
            error={importError}
            onAnalyzeUrl={(url) => analyze(() => importService.import(url))}
            onAnalyzeText={(text, url) => analyze(() => importService.importFromText(text, url))}
            onBack={() => {
              setImportError(null)
              setView({ name: 'new' })
            }}
          />
        )}

        {view.name === 'importing' && (
          <div className="loading">
            <div className="spinner" aria-hidden="true" />
            <p>Analyse de l'annonce...</p>
          </div>
        )}

        {view.name === 'review' && (
          <ReviewForm
            base={view.base}
            duplicate={view.duplicate}
            onCreate={(values, changed) => handleCreate(view.base, values, changed)}
            onUpdate={
              view.duplicate && view.base
                ? (values, changed) => handleUpdate(view.duplicate!, view.base!, values, changed)
                : undefined
            }
            onOpenExisting={
              view.duplicate ? () => setView({ name: 'detail', id: view.duplicate!.id }) : undefined
            }
            onCancel={() => setView({ name: 'new' })}
          />
        )}

        {view.name === 'detail' &&
          (() => {
            const property = properties.find((p) => p.id === view.id)
            if (!property) return <p>Bien introuvable.</p>
            return (
              <PropertyDetail
                property={property}
                onBack={() => setView({ name: 'list' })}
                onAddObservation={(obs) => handleAddObservation(property.id, obs)}
                onDelete={() => handleDelete(property.id)}
              />
            )
          })()}
      </main>
    </div>
  )
}
