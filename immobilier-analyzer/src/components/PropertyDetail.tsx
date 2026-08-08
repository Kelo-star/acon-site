import { useState } from 'react'
import type { Observation, ObservationOrigin, Property, PropertyData } from '../types/property'
import { FIELD_DEFS, fieldDef, fieldLabel, formatValue } from '../services/fields'
import { findInconsistencies } from '../services/consistency'
import { createId } from '../services/propertyStore'

interface Props {
  property: Property
  onBack: () => void
  onAddObservation: (observation: Observation) => void
  onDelete: () => void
}

const ORIGIN_BADGES: Record<string, string> = {
  listing: 'Annonce',
  manual: 'Manuel',
  visit: 'Visite',
  document: 'Document',
  computed: 'Calculé',
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('fr-FR')
}

export default function PropertyDetail({ property, onBack, onAddObservation, onDelete }: Props) {
  const issues = findInconsistencies(property)
  const title =
    property.data.title ||
    [property.data.propertyType, property.data.city].filter(Boolean).join(' à ') ||
    'Bien sans titre'

  return (
    <section>
      <div className="section-header">
        <h1>{title}</h1>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onBack}>
            Retour
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Supprimer ce bien ?')) onDelete()
            }}
          >
            Supprimer
          </button>
        </div>
      </div>

      {property.listing && (
        <div className="card source-card">
          <div>
            <span className="muted">Source :</span> <strong>{property.listing.source}</strong>
            {' · '}
            <span className="muted">importé le {formatDate(property.listing.importedAt)}</span>
          </div>
          <div className="btn-row">
            {property.listing.sourceUrl && (
              <a
                className="btn"
                href={property.listing.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                Voir l'annonce originale
              </a>
            )}
            <button className="btn" disabled title="Prévu dans une prochaine version (nécessite un backend)">
              Mettre à jour depuis l'annonce (à venir)
            </button>
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="banner banner-warning">
          <strong>⚠️ Incohérences détectées</strong>
          <ul>
            {issues.map((issue, index) => (
              <li key={index}>
                <div className="issue">
                  <div>
                    <span className="badge badge-source">{ORIGIN_BADGES[issue.declaredOrigin]}</span>{' '}
                    {issue.label} : {formatValue(issue.field, issue.declaredValue)}
                  </div>
                  <div>
                    <span className="badge badge-visit">{ORIGIN_BADGES[issue.observedOrigin]}</span>{' '}
                    {issue.observationLabel} : {formatValue(issue.field, issue.observedValue)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Informations</h2>
      <dl className="detail-grid">
        {FIELD_DEFS.filter((def) => property.data[def.key] !== undefined && def.kind !== 'longtext').map(
          (def) => (
            <div key={def.key} className="detail-item">
              <dt>{def.label}</dt>
              <dd>
                {formatValue(def.key, property.data[def.key])}{' '}
                {property.provenance[def.key] && (
                  <span
                    className={`badge badge-${property.provenance[def.key]!.origin}`}
                    title={
                      property.provenance[def.key]!.source
                        ? `Source : ${property.provenance[def.key]!.source}`
                        : undefined
                    }
                  >
                    {ORIGIN_BADGES[property.provenance[def.key]!.origin]}
                  </span>
                )}
              </dd>
            </div>
          ),
        )}
      </dl>

      {property.data.description && (
        <>
          <h2>Description</h2>
          <p className="description">{property.data.description}</p>
        </>
      )}

      {property.snapshots.length > 0 && (
        <>
          <h2>Historique de l'annonce</h2>
          <ul className="snapshot-list">
            {property.snapshots.map((snapshot, index) => (
              <li key={index}>
                {formatDate(snapshot.date)} : {formatValue('askingPrice', snapshot.askingPrice)}
                {snapshot.status && snapshot.status !== 'active' ? ` (${snapshot.status})` : ''}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Observations (visite / documents)</h2>
      {property.observations.length === 0 ? (
        <p className="muted">
          Aucune observation. Notez ici ce que vous constatez en visite ou lisez dans les documents :
          ces informations coexistent avec l'annonce et ne sont jamais écrasées par elle.
        </p>
      ) : (
        <ul className="observation-list">
          {property.observations.map((obs) => (
            <li key={obs.id} className="card">
              <span className={`badge badge-${obs.origin}`}>{ORIGIN_BADGES[obs.origin]}</span>{' '}
              <strong>{obs.label}</strong> :{' '}
              {obs.field ? formatValue(obs.field, obs.value) : String(obs.value)}
              {obs.field && <span className="muted"> · champ : {fieldLabel(obs.field)}</span>}
              <span className="muted"> · {formatDate(obs.notedAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <ObservationForm onAdd={onAddObservation} />
    </section>
  )
}

function ObservationForm({ onAdd }: { onAdd: (observation: Observation) => void }) {
  const [field, setField] = useState<string>('')
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [origin, setOrigin] = useState<ObservationOrigin>('visit')

  const def = field ? fieldDef(field as keyof PropertyData) : undefined

  function submit() {
    const trimmedLabel = label.trim() || (def ? `${def.label} constaté` : '')
    if (!trimmedLabel || value === '') return
    let parsed: string | number | boolean = value
    if (def?.kind === 'boolean') parsed = value === 'oui'
    else if (def?.kind === 'number' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      parsed = Number(value)
    }
    onAdd({
      id: createId(),
      field: field ? (field as keyof PropertyData) : undefined,
      label: trimmedLabel,
      value: parsed,
      origin,
      notedAt: new Date().toISOString(),
    })
    setField('')
    setLabel('')
    setValue('')
  }

  return (
    <form
      className="form observation-form card"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <h3>Ajouter une observation</h3>
      <div className="field-grid">
        <label className="field">
          <span>Champ concerné (facultatif)</span>
          <select value={field} onChange={(event) => setField(event.target.value)}>
            <option value="">Observation libre</option>
            {FIELD_DEFS.filter((d) => d.kind !== 'longtext').map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Libellé</span>
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex. Fenêtre chambre : simple vitrage"
          />
        </label>
        <label className="field">
          <span>Valeur constatée</span>
          {def?.kind === 'boolean' ? (
            <select value={value} onChange={(event) => setValue(event.target.value)} required>
              <option value="">Choisir…</option>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          ) : (
            <input
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
            />
          )}
        </label>
        <label className="field">
          <span>Origine</span>
          <select value={origin} onChange={(event) => setOrigin(event.target.value as ObservationOrigin)}>
            <option value="visit">Visite</option>
            <option value="document">Document</option>
          </select>
        </label>
      </div>
      <button className="btn" type="submit">
        Ajouter l'observation
      </button>
    </form>
  )
}
