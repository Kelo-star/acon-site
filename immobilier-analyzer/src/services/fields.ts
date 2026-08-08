/** Définition des champs affichables/éditables d'un bien. */
import type { PropertyData } from '../types/property'

export type FieldKind = 'number' | 'text' | 'boolean' | 'longtext'

export interface FieldDef {
  key: keyof PropertyData
  label: string
  kind: FieldKind
  unit?: string
}

export const FIELD_DEFS: FieldDef[] = [
  { key: 'title', label: 'Titre', kind: 'text' },
  { key: 'propertyType', label: 'Type de bien', kind: 'text' },
  { key: 'askingPrice', label: 'Prix', kind: 'number', unit: '€' },
  { key: 'pricePerSquareMeter', label: 'Prix au m²', kind: 'number', unit: '€/m²' },
  { key: 'surface', label: 'Surface', kind: 'number', unit: 'm²' },
  { key: 'landSurface', label: 'Surface du terrain', kind: 'number', unit: 'm²' },
  { key: 'rooms', label: 'Pièces', kind: 'number' },
  { key: 'bedrooms', label: 'Chambres', kind: 'number' },
  { key: 'bathrooms', label: 'Salles de bain', kind: 'number' },
  { key: 'constructionYear', label: 'Année de construction', kind: 'number' },
  { key: 'dpe', label: 'DPE', kind: 'text' },
  { key: 'ges', label: 'GES', kind: 'text' },
  { key: 'propertyTax', label: 'Taxe foncière', kind: 'number', unit: '€/an' },
  { key: 'condominiumFees', label: 'Charges de copropriété', kind: 'number', unit: '€/an' },
  { key: 'energyCostMin', label: 'Dépenses énergie (min)', kind: 'number', unit: '€/an' },
  { key: 'energyCostMax', label: 'Dépenses énergie (max)', kind: 'number', unit: '€/an' },
  { key: 'heating', label: 'Chauffage', kind: 'text' },
  { key: 'orientation', label: 'Orientation', kind: 'text' },
  { key: 'address', label: 'Adresse', kind: 'text' },
  { key: 'postalCode', label: 'Code postal', kind: 'text' },
  { key: 'city', label: 'Ville', kind: 'text' },
  { key: 'garden', label: 'Jardin', kind: 'boolean' },
  { key: 'garage', label: 'Garage', kind: 'boolean' },
  { key: 'parking', label: 'Parking', kind: 'boolean' },
  { key: 'cellar', label: 'Cave', kind: 'boolean' },
  { key: 'attic', label: 'Grenier / combles', kind: 'boolean' },
  { key: 'balcony', label: 'Balcon', kind: 'boolean' },
  { key: 'doubleGlazing', label: 'Double vitrage', kind: 'boolean' },
  { key: 'agencyName', label: 'Agence', kind: 'text' },
  { key: 'agentName', label: 'Contact', kind: 'text' },
  { key: 'description', label: 'Description', kind: 'longtext' },
]

export function fieldDef(key: keyof PropertyData): FieldDef | undefined {
  return FIELD_DEFS.find((d) => d.key === key)
}

export function fieldLabel(key: keyof PropertyData): string {
  return fieldDef(key)?.label ?? String(key)
}

const numberFormat = new Intl.NumberFormat('fr-FR')

/** Formate une valeur pour l'affichage (Oui/Non, unités, séparateurs). */
export function formatValue(key: keyof PropertyData, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  const def = fieldDef(key)
  if (typeof value === 'number') {
    const formatted = key === 'constructionYear' ? String(value) : numberFormat.format(value)
    return def?.unit ? `${formatted} ${def.unit}` : formatted
  }
  return String(value)
}
