/**
 * Création d'un bien : saisie manuelle rapide (nom + ville obligatoires)
 * ou import d'une annonce (URL / texte collé), avec écran de vérification
 * et détection de doublon — rien n'est enregistré sans validation.
 */
import { useState } from 'react'
import type { ListingImportResult } from '../services/listingImport/types'
import { createListingImportService } from '../services/listingImport/listingImporter'
import { propertyFromImport, updatePropertyFromImport } from '../services/listingImport/mapToProperty'
import { findBySourceUrl } from '../utils/sourceUrl'
import { useProperties } from '../hooks/PropertiesContext'
import { navigate } from '../hooks/useHashRoute'
import { Banner, BooleanField, NumberField, TextAreaField, TextField } from '../components/ui'

const importService = createListingImportService()

type Step =
  | { name: 'choice' }
  | { name: 'manual' }
  | { name: 'import' }
  | { name: 'importing' }
  | { name: 'review'; result: ListingImportResult }

/* ---------- Saisie manuelle (volontairement légère) ---------- */

function ManualForm({ onCancel }: { onCancel: () => void }) {
  const { create, update } = useProperties()
  const [title, setTitle] = useState<string>()
  const [city, setCity] = useState<string>()
  const [askingPrice, setAskingPrice] = useState<number>()
  const [surface, setSurface] = useState<number>()

  async function submit() {
    if (!title?.trim() || !city?.trim()) return
    const property = await create(title.trim(), city.trim())
    if (askingPrice !== undefined || surface !== undefined) {
      update(property.id, (p) => ({
        ...p,
        prices: { ...p.prices, askingPrice },
        general: { ...p.general, surface },
      }))
    }
    navigate(`/property/${property.id}`)
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <TextField label="Nom du bien *" value={title} onChange={setTitle} placeholder="Ex. Maison rue des Lilas" />
      <TextField label="Ville *" value={city} onChange={setCity} placeholder="Ex. Lens" />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Prix demandé" unit="€" value={askingPrice} onChange={setAskingPrice} />
        <NumberField label="Surface" unit="m²" value={surface} onChange={setSurface} />
      </div>
      <p className="text-xs text-gray-500">
        Tout le reste (caractéristiques, visite, travaux, finances…) se complète plus tard sur la fiche.
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Retour
        </button>
        <button type="submit" className="btn btn-primary flex-1" disabled={!title?.trim() || !city?.trim()}>
          Créer le bien
        </button>
      </div>
    </form>
  )
}

/* ---------- Import d'une annonce ---------- */

function ImportForm({
  error,
  onAnalyzeUrl,
  onAnalyzeText,
  onCancel,
}: {
  error: string | null
  onAnalyzeUrl: (url: string) => void
  onAnalyzeText: (text: string, url?: string) => void
  onCancel: () => void
}) {
  const [tab, setTab] = useState<'url' | 'text'>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [textUrl, setTextUrl] = useState('')

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-gray-200">
        {(['url', 'text'] as const).map((t) => (
          <button
            key={t}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'url' ? 'Depuis un lien' : "Coller le texte de l'annonce"}
          </button>
        ))}
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {tab === 'url' ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (url.trim()) onAnalyzeUrl(url.trim())
          }}
        >
          <TextField
            label="Collez le lien de l'annonce"
            type="url"
            value={url || undefined}
            onChange={(v) => setUrl(v ?? '')}
            placeholder="https://www.seloger.com/annonces/…"
          />
          <p className="text-xs text-gray-500">
            Leboncoin, SeLoger, Bien'ici, PAP, sites d'agences… Depuis le navigateur, seules les
            informations contenues dans le lien sont exploitables ; pour un import complet, collez le
            texte de l'annonce.
          </p>
          <button className="btn btn-primary w-full" type="submit" disabled={!url.trim()}>
            Analyser l'annonce
          </button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) onAnalyzeText(text, textUrl.trim() || undefined)
          }}
        >
          <TextAreaField
            label="Collez tout le texte de l'annonce"
            value={text}
            onChange={setText}
            rows={10}
            placeholder={'Maison 3 pièces 56 m²\nLens (62300)\nPrix : 67 000 €\nDPE : D\n…'}
          />
          <TextField
            label="Lien de l'annonce (facultatif, pour la provenance)"
            type="url"
            value={textUrl || undefined}
            onChange={(v) => setTextUrl(v ?? '')}
            placeholder="https://…"
          />
          <button className="btn btn-primary w-full" type="submit" disabled={!text.trim()}>
            Analyser l'annonce
          </button>
        </form>
      )}
      <button className="btn w-full" onClick={onCancel}>
        Retour
      </button>
    </div>
  )
}

/* ---------- Écran de vérification ---------- */

interface ReviewField {
  key: string
  label: string
  kind: 'text' | 'number' | 'boolean' | 'longtext'
  unit?: string
}

const REVIEW_FIELDS: ReviewField[] = [
  { key: 'title', label: 'Titre', kind: 'text' },
  { key: 'city', label: 'Ville', kind: 'text' },
  { key: 'postalCode', label: 'Code postal', kind: 'text' },
  { key: 'address', label: 'Adresse', kind: 'text' },
  { key: 'propertyType', label: 'Type de bien', kind: 'text' },
  { key: 'askingPrice', label: 'Prix', kind: 'number', unit: '€' },
  { key: 'surface', label: 'Surface', kind: 'number', unit: 'm²' },
  { key: 'landSurface', label: 'Terrain', kind: 'number', unit: 'm²' },
  { key: 'rooms', label: 'Pièces', kind: 'number' },
  { key: 'bedrooms', label: 'Chambres', kind: 'number' },
  { key: 'bathrooms', label: 'Salles de bain', kind: 'number' },
  { key: 'constructionYear', label: 'Année de construction', kind: 'number' },
  { key: 'dpe', label: 'DPE', kind: 'text' },
  { key: 'ges', label: 'GES', kind: 'text' },
  { key: 'propertyTax', label: 'Taxe foncière', kind: 'number', unit: '€/an' },
  { key: 'condominiumFees', label: 'Charges copropriété', kind: 'number', unit: '€/an' },
  { key: 'orientation', label: 'Orientation', kind: 'text' },
  { key: 'garden', label: 'Jardin', kind: 'boolean' },
  { key: 'garage', label: 'Garage', kind: 'boolean' },
  { key: 'parking', label: 'Parking', kind: 'boolean' },
  { key: 'cellar', label: 'Cave', kind: 'boolean' },
  { key: 'attic', label: 'Grenier / combles', kind: 'boolean' },
  { key: 'balcony', label: 'Balcon', kind: 'boolean' },
  { key: 'agencyName', label: 'Agence', kind: 'text' },
  { key: 'description', label: 'Description (→ notes)', kind: 'longtext' },
]

function ReviewScreen({ result, onCancel }: { result: ListingImportResult; onCancel: () => void }) {
  const { properties, add, update } = useProperties()
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    for (const field of REVIEW_FIELDS) {
      const v = result[field.key as keyof ListingImportResult]
      if (v !== undefined) initial[field.key] = v
    }
    return initial
  })
  const [changed, setChanged] = useState<Set<string>>(() => new Set())
  const duplicate = result.sourceUrl ? findBySourceUrl(properties, result.sourceUrl) : undefined
  const [mode, setMode] = useState<'create' | 'update'>('create')

  function setField(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setChanged((prev) => new Set(prev).add(key))
  }

  function buildResult(): ListingImportResult {
    return { ...result, ...values } as ListingImportResult
  }

  async function submit() {
    const edited = buildResult()
    if (mode === 'update' && duplicate) {
      const updated = updatePropertyFromImport(duplicate, edited, changed)
      update(duplicate.id, () => updated)
      navigate(`/property/${duplicate.id}`)
      return
    }
    const property = propertyFromImport(edited, changed)
    await add(property)
    navigate(`/property/${property.id}`)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Source : <strong>{result.source}</strong>
        {result.sourceUrl && (
          <>
            {' · '}
            <a className="text-blue-700 underline" href={result.sourceUrl} target="_blank" rel="noreferrer noopener">
              Voir l'annonce originale
            </a>
          </>
        )}
        <br />
        Rien n'est enregistré sans votre validation : corrigez librement chaque champ.
      </p>

      {result.warnings.length > 0 && (
        <Banner tone="warning">
          <ul className="list-disc pl-4">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Banner>
      )}

      {duplicate && (
        <Banner tone="warning">
          <p className="mb-2 font-semibold">Cette annonce semble déjà exister dans votre bibliothèque.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => navigate(`/property/${duplicate.id}`)}>
              Ouvrir le bien existant
            </button>
            <button
              className={`btn ${mode === 'create' ? 'btn-primary' : ''}`}
              onClick={() => setMode('create')}
            >
              Créer une copie
            </button>
            <button
              className={`btn ${mode === 'update' ? 'btn-primary' : ''}`}
              onClick={() => setMode('update')}
            >
              Mettre à jour les informations
            </button>
          </div>
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-3">
        {REVIEW_FIELDS.map((field) => {
          const raw = values[field.key]
          if (field.kind === 'boolean') {
            return (
              <BooleanField
                key={field.key}
                label={field.label}
                value={raw as boolean | undefined}
                onChange={(v) => setField(field.key, v)}
              />
            )
          }
          if (field.kind === 'number') {
            return (
              <NumberField
                key={field.key}
                label={field.label}
                unit={field.unit}
                value={raw as number | undefined}
                onChange={(v) => setField(field.key, v)}
              />
            )
          }
          if (field.kind === 'longtext') {
            return (
              <div key={field.key} className="col-span-2">
                <TextAreaField
                  label={field.label}
                  value={raw as string | undefined}
                  onChange={(v) => setField(field.key, v)}
                  rows={5}
                />
              </div>
            )
          }
          return (
            <TextField
              key={field.key}
              label={field.label}
              value={raw as string | undefined}
              onChange={(v) => setField(field.key, v)}
            />
          )
        })}
      </div>

      <div className="flex gap-2">
        <button className="btn" onClick={onCancel}>
          Annuler
        </button>
        <button className="btn btn-primary flex-1" onClick={() => void submit()}>
          {mode === 'update' && duplicate ? 'Mettre à jour le bien' : 'Créer le bien'}
        </button>
      </div>
    </div>
  )
}

/* ---------- Page ---------- */

export default function NewPropertyPage() {
  const [step, setStep] = useState<Step>({ name: 'choice' })
  const [importError, setImportError] = useState<string | null>(null)

  async function analyze(run: () => Promise<ListingImportResult>) {
    setImportError(null)
    setStep({ name: 'importing' })
    try {
      const result = await run()
      setStep({ name: 'review', result })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error))
      setStep({ name: 'import' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {step.name === 'review' ? 'Vérifiez les informations récupérées' : 'Nouveau bien'}
        </h1>
        <button className="btn" onClick={() => navigate('/')}>
          Annuler
        </button>
      </div>

      {step.name === 'choice' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="card flex flex-col items-start gap-2 text-left hover:border-blue-600"
            onClick={() => setStep({ name: 'import' })}
          >
            <span className="text-3xl">📥</span>
            <span className="font-bold">Importer une annonce</span>
            <span className="text-sm text-gray-500">
              Depuis un lien (Leboncoin, SeLoger, Bien'ici, PAP…) ou en collant le texte de l'annonce.
            </span>
          </button>
          <button
            className="card flex flex-col items-start gap-2 text-left hover:border-blue-600"
            onClick={() => setStep({ name: 'manual' })}
          >
            <span className="text-3xl">✏️</span>
            <span className="font-bold">Saisie manuelle</span>
            <span className="text-sm text-gray-500">
              Créez la fiche avec un nom et une ville : le reste se complète plus tard.
            </span>
          </button>
        </div>
      )}

      {step.name === 'manual' && <ManualForm onCancel={() => setStep({ name: 'choice' })} />}

      {step.name === 'import' && (
        <ImportForm
          error={importError}
          onAnalyzeUrl={(url) => void analyze(() => importService.import(url))}
          onAnalyzeText={(text, url) => void analyze(() => importService.importFromText(text, url))}
          onCancel={() => setStep({ name: 'choice' })}
        />
      )}

      {step.name === 'importing' && (
        <div className="py-16 text-center text-gray-500">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-gray-300 border-t-blue-700" />
          Analyse de l'annonce...
        </div>
      )}

      {step.name === 'review' && (
        <ReviewScreen result={step.result} onCancel={() => setStep({ name: 'import' })} />
      )}
    </div>
  )
}
