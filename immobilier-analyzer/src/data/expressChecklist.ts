/**
 * Mode « Visite express » : ~25 contrôles essentiels, référencés par leur
 * id dans inspectionSections.ts (mêmes réponses, même stockage).
 */
export const EXPRESS_ITEM_IDS: string[] = [
  'ext-fissures', // fissures extérieures
  'struct-fissures', // fissures intérieures
  'hum-moisissure', // humidité
  'hum-odeur', // odeur
  'toit-etat-general', // toiture
  'charp-charpente', // charpente
  'charp-amenageabilite', // combles
  'elec-tableau', // tableau électrique
  'elec-prises', // prises
  'plomb-tuyauterie', // plomberie
  'plomb-pression', // pression eau
  'plomb-evacuations', // évacuations
  'chauf-chaudiere', // chauffage
  'chauf-eau-chaude', // eau chaude
  'vent-vmc', // VMC
  'menu-fenetres', // fenêtres
  'cuis-meubles', // cuisine
  'sdb-etancheite', // salle de bain
  'sols-etat', // sols
  'plaf-etat', // plafonds
  'cave-humidite', // cave
  'env-luminosite', // luminosité
  'env-bruit', // bruit
  'env-stationnement', // stationnement
  'toit-factures', // documents disponibles
]
