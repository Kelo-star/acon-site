/** Checklist des documents à réclamer, séparée de l'interface. */
import type { DocumentDef } from '../models/inspection'

export const DEFAULT_DOCUMENTS: DocumentDef[] = [
  { id: 'dpe', label: 'DPE' },
  { id: 'ges', label: 'GES' },
  { id: 'diag-electricite', label: 'Diagnostic électricité' },
  { id: 'diag-gaz', label: 'Diagnostic gaz' },
  { id: 'amiante', label: 'Amiante' },
  { id: 'plomb', label: 'Plomb' },
  { id: 'termites', label: 'Termites' },
  { id: 'erp', label: 'ERP / état des risques' },
  { id: 'assainissement', label: 'Assainissement' },
  { id: 'taxe-fonciere', label: 'Taxe foncière (avis)' },
  { id: 'titre-propriete', label: 'Titre de propriété' },
  { id: 'cadastre', label: 'Cadastre' },
  { id: 'plans', label: 'Plans' },
  { id: 'factures-travaux', label: 'Factures de travaux' },
  { id: 'toiture', label: 'Toiture (factures / garanties)' },
  { id: 'chaudiere', label: 'Chaudière (facture)' },
  { id: 'entretien-chaudiere', label: 'Entretien chaudière (attestations)' },
  { id: 'factures-energie', label: 'Factures d’énergie' },
  { id: 'sinistres', label: 'Sinistres (déclarations)' },
  { id: 'docs-copro', label: 'Documents de copropriété' },
  { id: 'pv-ag', label: 'PV d’assemblées générales' },
  { id: 'charges-copro', label: 'Charges de copropriété (relevés)' },
  { id: 'permis-construire', label: 'Permis de construire' },
  { id: 'declarations-travaux', label: 'Déclarations de travaux' },
]
