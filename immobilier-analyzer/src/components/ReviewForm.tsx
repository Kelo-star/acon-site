import { useState } from 'react'
import type { ListingImportResult } from '../services/listingImport/types'
import type { Property, PropertyData } from '../types/property'
import { FIELD_DEFS, formatValue, type FieldDef } from '../services/fields'

interface Props {
  /** Résultat d'import à vérifier, ou null pour une saisie manuelle. */
  base: ListingImportResult | null
  /** Bien existant importé depuis la même URL, le cas échéant. */
  duplicate?: Property
  onCreate: (values: PropertyData, changedFields: Set<string>) => void
  onUpdate?: (values: PropertyData, changedFields: Set<string>) => void
  onOpenExisting?: () => void
  onCancel: () => void
}

function initialValues(base: ListingImportResult | null): PropertyData {
  const values: PropertyData = {}
  if (!base) return values
  for (const def of FIELD_DEFS) {
    const value = base[def.key]
    if (value !== undefined) (values as Record<string, unknown>)[def.key] = value
  }
  return values
}

export default function ReviewForm({ base, duplicate, onCreate, onUpdate, onOpenExisting, onCancel }: Props) {
  const [values, setValues] = useState<PropertyData>(() => initialValues(base))
  const [changed, setChanged] = useState<Set<string>>(() => new Set())
  const [mode, setMode] = useState<'create' | 'update'>('create')

  function setField(key: keyof PropertyData, value: unknown) {
    setValues((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[key]
      else (next as Record<string, unknown>)[key] = value
      return next
    })
    setChanged((prev) => new Set(prev).add(key))
  }

  function renderInput(def: FieldDef) {
    const raw = values[def.key]
    if (def.kind === 'boolean') {
      const current = raw === true ? 'oui' : raw === false ? 'non' : ''
      return (
        <select
          value={current}
          onChange={(event) => {
            const v = event.target.value
            setField(def.key, v === '' ? undefined : v === 'oui')
          }}
        >
          <option value="">Non renseigné</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>
      )
    }
    if (def.kind === 'number') {
      return (
        <input
          type="number"
          step="any"
          value={typeof raw === 'number' ? raw : ''}
          onChange={(event) => {
            const v = event.target.value
            setField(def.key, v === '' ? undefined : Number(v))
          }}
        />
      )
    }
    if (def.kind === 'longtext') {
      return (
        <textarea
          rows={6}
          value={typeof raw === 'string' ? raw : ''}
          onChange={(event) => setField(def.key, event.target.value || undefined)}
        />
      )
    }
    return (
      <input
        type="text"
        value={typeof raw === 'string' ? raw : ''}
        onChange={(event) => setField(def.key, event.target.value || undefined)}
      />
    )
  }

  const showDuplicateBanner = Boolean(duplicate && base)
  const isUpdate = mode === 'update' && Boolean(onUpdate)

  return (
    <section>
      <div className="section-header">
        <h1>{base ? 'Vérifiez les informations récupérées' : 'Nouveau bien (saisie manuelle)'}</h1>
        <button className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>

      {base && (
        <p className="hint">
          Source : <strong>{base.source}</strong>
          {base.sourceUrl && (
            <>
              {' · '}
              <a href={base.sourceUrl} target="_blank" rel="noreferrer noopener">
                Voir l'annonce originale
              </a>
            </>
          )}
          . Rien n'est enregistré sans votre validation : corrigez librement chaque champ ci-dessous.
        </p>
      )}

      {base && base.warnings.length > 0 && (
        <div className="banner banner-warning">
          <ul>
            {base.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {showDuplicateBanner && (
        <div className="banner banner-warning duplicate-banner">
          <p>
            <strong>Cette annonce semble déjà exister dans votre bibliothèque.</strong>
          </p>
          <div className="btn-row">
            {onOpenExisting && (
              <button className="btn" onClick={onOpenExisting}>
                Ouvrir le bien existant
              </button>
            )}
            <button
              className={`btn ${mode === 'create' ? 'btn-primary' : ''}`}
              onClick={() => setMode('create')}
            >
              Créer une copie
            </button>
            {onUpdate && (
              <button
                className={`btn ${mode === 'update' ? 'btn-primary' : ''}`}
                onClick={() => setMode('update')}
              >
                Mettre à jour les informations
              </button>
            )}
          </div>
        </div>
      )}

      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          if (isUpdate && onUpdate) onUpdate(values, changed)
          else onCreate(values, changed)
        }}
      >
        <div className="field-grid">
          {FIELD_DEFS.map((def) => (
            <label key={def.key} className={`field ${def.kind === 'longtext' ? 'field-wide' : ''}`}>
              <span>
                {def.label}
                {def.unit ? ` (${def.unit})` : ''}
                {base && base[def.key] !== undefined && !changed.has(def.key) && (
                  <em className="field-origin"> · importé : {formatValue(def.key, base[def.key])}</em>
                )}
              </span>
              {renderInput(def)}
            </label>
          ))}
        </div>
        <button className="btn btn-primary btn-large" type="submit">
          {isUpdate ? 'Mettre à jour le bien' : 'Créer le bien'}
        </button>
      </form>
    </section>
  )
}
