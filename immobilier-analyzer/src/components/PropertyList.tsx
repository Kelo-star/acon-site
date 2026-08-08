import type { Property } from '../types/property'
import { formatValue } from '../services/fields'
import { findInconsistencies } from '../services/consistency'

interface Props {
  properties: Property[]
  onNew: () => void
  onOpen: (id: string) => void
}

export default function PropertyList({ properties, onNew, onOpen }: Props) {
  return (
    <section>
      <div className="section-header">
        <h1>Mes biens</h1>
        <button className="btn btn-primary" onClick={onNew}>
          + Nouveau bien
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="empty-state">
          <p>Aucun bien pour le moment.</p>
          <p>Créez votre premier bien en important une annonce ou en le saisissant manuellement.</p>
        </div>
      ) : (
        <ul className="card-list">
          {properties.map((property) => {
            const issues = findInconsistencies(property)
            const title =
              property.data.title ||
              [property.data.propertyType, property.data.city].filter(Boolean).join(' à ') ||
              'Bien sans titre'
            return (
              <li key={property.id}>
                <button className="card card-clickable" onClick={() => onOpen(property.id)}>
                  <div className="card-row">
                    <strong>{title}</strong>
                    {property.listing && <span className="badge badge-source">{property.listing.source}</span>}
                  </div>
                  <div className="card-row card-meta">
                    <span className="price">{formatValue('askingPrice', property.data.askingPrice)}</span>
                    {property.data.surface !== undefined && (
                      <span>{formatValue('surface', property.data.surface)}</span>
                    )}
                    {property.data.rooms !== undefined && <span>{property.data.rooms} pièces</span>}
                    {property.data.city && (
                      <span>
                        {property.data.city}
                        {property.data.postalCode ? ` (${property.data.postalCode})` : ''}
                      </span>
                    )}
                    {issues.length > 0 && (
                      <span className="badge badge-warning">
                        ⚠️ {issues.length} incohérence{issues.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
