import type { Property } from '../../models/property'

/** Props communes des sections de la fiche d'un bien. */
export interface SectionProps {
  property: Property
  update: (updater: (property: Property) => Property) => void
}
