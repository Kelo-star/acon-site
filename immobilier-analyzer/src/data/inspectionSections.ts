/**
 * Critères de visite. Ces données sont volontairement séparées de
 * l'interface : modifier la checklist ne demande aucun changement dans
 * les composants React.
 */
import type {
  Importance,
  InspectionItem,
  InspectionSection,
  ScoreCategoryId,
} from '../models/inspection'

function item(
  id: string,
  label: string,
  importance: Importance,
  category: ScoreCategoryId,
  extra?: Partial<Pick<InspectionItem, 'description' | 'possibleCost'>>,
): InspectionItem {
  return { id, label, importance, category, ...extra }
}

export const INSPECTION_SECTIONS: InspectionSection[] = [
  {
    id: 'environnement',
    title: 'Environnement',
    icon: '🌳',
    description: 'Le quartier et les abords, à observer avant même d’entrer.',
    items: [
      item('env-bruit', 'Bruit', 'major', 'environment'),
      item('env-circulation', 'Circulation', 'medium', 'environment'),
      item('env-stationnement', 'Stationnement', 'medium', 'environment'),
      item('env-voisinage', 'Voisinage', 'major', 'environment'),
      item('env-commerces', 'Commerces', 'minor', 'environment'),
      item('env-transports', 'Transports', 'medium', 'environment'),
      item('env-ecoles', 'Écoles', 'minor', 'environment'),
      item('env-nuisances', 'Nuisances', 'major', 'environment'),
      item('env-odeurs', 'Odeurs extérieures', 'medium', 'environment'),
      item('env-vis-a-vis', 'Vis-à-vis', 'medium', 'environment'),
      item('env-orientation', 'Orientation', 'medium', 'environment'),
      item('env-luminosite', 'Luminosité', 'major', 'environment'),
    ],
  },
  {
    id: 'exterieur',
    title: 'Extérieur',
    icon: '🏠',
    items: [
      item('ext-facade', 'Façade', 'major', 'structure'),
      item('ext-briques', 'Briques', 'medium', 'structure'),
      item('ext-enduit', 'Enduit', 'medium', 'structure', { possibleCost: '5 000 – 20 000 €' }),
      item('ext-fissures', 'Fissures', 'critical', 'structure', {
        description: 'Fissures en escalier ou traversantes = signal structurel sérieux.',
      }),
      item('ext-soubassement', 'Soubassement', 'major', 'structure'),
      item('ext-gouttieres', 'Gouttières', 'medium', 'roof', { possibleCost: '500 – 3 000 €' }),
      item('ext-eaux-pluviales', 'Évacuation des eaux pluviales', 'major', 'roof'),
      item('ext-fenetres', 'Fenêtres (extérieur)', 'medium', 'energy'),
      item('ext-portes', 'Portes (extérieur)', 'medium', 'energy'),
      item('ext-volets', 'Volets', 'minor', 'energy'),
    ],
  },
  {
    id: 'toiture',
    title: 'Toiture',
    icon: '🏘️',
    items: [
      item('toit-etat-general', 'État général', 'critical', 'roof', { possibleCost: '10 000 – 40 000 €' }),
      item('toit-couverture', 'Couverture', 'major', 'roof'),
      item('toit-tuiles', 'Tuiles', 'major', 'roof', { possibleCost: '100 – 5 000 €' }),
      item('toit-faitage', 'Faîtage', 'major', 'roof'),
      item('toit-zinguerie', 'Zinguerie', 'medium', 'roof'),
      item('toit-gouttieres', 'Gouttières', 'medium', 'roof'),
      item('toit-deformation', 'Déformation', 'critical', 'roof'),
      item('toit-infiltration', 'Traces d’infiltration', 'critical', 'roof'),
      item('toit-age', 'Âge de la toiture', 'major', 'roof'),
      item('toit-factures', 'Factures disponibles', 'medium', 'documents'),
    ],
  },
  {
    id: 'charpente',
    title: 'Charpente et combles',
    icon: '🪵',
    items: [
      item('charp-charpente', 'Charpente', 'critical', 'roof', { possibleCost: '10 000 – 30 000 €' }),
      item('charp-humidite', 'Humidité', 'major', 'humidity'),
      item('charp-insectes', 'Insectes xylophages', 'critical', 'roof', {
        description: 'Vrillettes, capricornes : trous, sciure fraîche.',
      }),
      item('charp-champignons', 'Champignons', 'critical', 'humidity'),
      item('charp-isolation', 'Isolation', 'major', 'energy', { possibleCost: '2 000 – 10 000 €' }),
      item('charp-ventilation', 'Ventilation', 'medium', 'humidity'),
      item('charp-plancher', 'Plancher des combles', 'medium', 'structure'),
      item('charp-hauteur', 'Hauteur sous faîtage', 'minor', 'layout'),
      item('charp-accessibilite', 'Accessibilité', 'minor', 'layout'),
      item('charp-amenageabilite', 'Aménageabilité', 'minor', 'layout'),
    ],
  },
  {
    id: 'structure',
    title: 'Structure',
    icon: '🧱',
    items: [
      item('struct-fissures', 'Fissures intérieures', 'critical', 'structure'),
      item('struct-murs-porteurs', 'Murs porteurs', 'critical', 'structure'),
      item('struct-planchers', 'Planchers', 'major', 'structure'),
      item('struct-affaissements', 'Affaissements', 'critical', 'structure'),
      item('struct-escaliers', 'Escaliers', 'medium', 'structure'),
      item('struct-portes-fermeture', 'Portes qui ferment mal', 'major', 'structure', {
        description: 'Peut trahir un mouvement de la structure.',
      }),
      item('struct-deformations', 'Déformations', 'critical', 'structure'),
    ],
  },
  {
    id: 'humidite',
    title: 'Humidité',
    icon: '💧',
    items: [
      item('hum-odeur', 'Odeur d’humidité', 'major', 'humidity'),
      item('hum-moisissure', 'Moisissures', 'major', 'humidity'),
      item('hum-salpetre', 'Salpêtre', 'major', 'humidity'),
      item('hum-peinture-cloquee', 'Peinture cloquée', 'medium', 'humidity'),
      item('hum-papier-decolle', 'Papier peint décollé', 'medium', 'humidity'),
      item('hum-condensation', 'Condensation', 'medium', 'humidity'),
      item('hum-remontees', 'Remontées capillaires', 'critical', 'humidity', {
        possibleCost: '3 000 – 15 000 €',
      }),
      item('hum-infiltration', 'Infiltrations', 'critical', 'humidity'),
    ],
  },
  {
    id: 'electricite',
    title: 'Électricité',
    icon: '⚡',
    items: [
      item('elec-tableau', 'Tableau électrique', 'critical', 'electricity', {
        possibleCost: '1 000 – 3 000 €',
      }),
      item('elec-differentiel', 'Différentiel', 'critical', 'electricity'),
      item('elec-terre', 'Mise à la terre', 'critical', 'electricity'),
      item('elec-prises', 'Prises', 'medium', 'electricity'),
      item('elec-cablage', 'Câblage', 'major', 'electricity', { possibleCost: '5 000 – 15 000 €' }),
      item('elec-fils-apparents', 'Fils apparents', 'major', 'electricity'),
      item('elec-cuisine', 'Installation cuisine', 'medium', 'electricity'),
      item('elec-salle-de-bain', 'Installation salle de bain', 'major', 'electricity'),
      item('elec-conformite', 'Conformité apparente', 'major', 'electricity'),
    ],
  },
  {
    id: 'plomberie',
    title: 'Plomberie',
    icon: '🚿',
    items: [
      item('plomb-pression', 'Pression d’eau', 'medium', 'plumbing-heating'),
      item('plomb-debit', 'Débit', 'medium', 'plumbing-heating'),
      item('plomb-eau-chaude', 'Eau chaude', 'major', 'plumbing-heating'),
      item('plomb-fuites', 'Fuites', 'major', 'plumbing-heating'),
      item('plomb-tuyauterie', 'Tuyauterie', 'major', 'plumbing-heating', {
        description: 'Plomb, cuivre, PER ? Le plomb est à remplacer.',
        possibleCost: '3 000 – 10 000 €',
      }),
      item('plomb-evacuations', 'Évacuations', 'medium', 'plumbing-heating'),
      item('plomb-odeurs', 'Odeurs', 'medium', 'plumbing-heating'),
      item('plomb-wc', 'WC', 'minor', 'plumbing-heating'),
      item('plomb-robinetterie', 'Robinetterie', 'minor', 'plumbing-heating'),
    ],
  },
  {
    id: 'chauffage',
    title: 'Chauffage',
    icon: '🔥',
    items: [
      item('chauf-type', 'Type de chauffage', 'medium', 'plumbing-heating'),
      item('chauf-chaudiere', 'Chaudière', 'major', 'plumbing-heating', {
        possibleCost: '3 000 – 8 000 €',
      }),
      item('chauf-age', 'Âge de la chaudière', 'major', 'plumbing-heating'),
      item('chauf-entretien', 'Entretien (attestations)', 'medium', 'documents'),
      item('chauf-radiateurs', 'Radiateurs', 'medium', 'plumbing-heating'),
      item('chauf-thermostats', 'Thermostats', 'minor', 'plumbing-heating'),
      item('chauf-eau-chaude', 'Production d’eau chaude', 'medium', 'plumbing-heating'),
    ],
  },
  {
    id: 'ventilation',
    title: 'Ventilation',
    icon: '🌬️',
    items: [
      item('vent-vmc', 'VMC', 'major', 'humidity', { possibleCost: '500 – 4 000 €' }),
      item('vent-entrees-air', 'Entrées d’air', 'medium', 'humidity'),
      item('vent-cuisine', 'Ventilation cuisine', 'medium', 'humidity'),
      item('vent-salle-de-bain', 'Ventilation salle de bain', 'major', 'humidity'),
      item('vent-wc', 'Ventilation WC', 'minor', 'humidity'),
      item('vent-condensation', 'Condensation visible', 'medium', 'humidity'),
    ],
  },
  {
    id: 'cuisine',
    title: 'Cuisine',
    icon: '🍳',
    items: [
      item('cuis-meubles', 'Meubles', 'minor', 'layout'),
      item('cuis-plomberie', 'Plomberie', 'medium', 'plumbing-heating'),
      item('cuis-electricite', 'Électricité', 'medium', 'electricity'),
      item('cuis-ventilation', 'Ventilation', 'medium', 'humidity'),
      item('cuis-electromenager', 'Électroménager', 'minor', 'layout'),
      item('cuis-murs', 'Murs', 'minor', 'layout'),
      item('cuis-sol', 'Sol', 'minor', 'layout'),
      item('cuis-plafond', 'Plafond', 'minor', 'layout'),
    ],
  },
  {
    id: 'salle-de-bain',
    title: 'Salle de bain',
    icon: '🛁',
    items: [
      item('sdb-plomberie', 'Plomberie', 'medium', 'plumbing-heating'),
      item('sdb-etancheite', 'Étanchéité', 'major', 'humidity'),
      item('sdb-ventilation', 'Ventilation', 'major', 'humidity'),
      item('sdb-joints', 'Joints', 'minor', 'layout'),
      item('sdb-douche', 'Douche', 'minor', 'layout'),
      item('sdb-baignoire', 'Baignoire', 'minor', 'layout'),
      item('sdb-lavabo', 'Lavabo', 'minor', 'layout'),
      item('sdb-wc', 'WC', 'minor', 'layout'),
      item('sdb-electricite', 'Électricité', 'major', 'electricity'),
      item('sdb-murs', 'Murs', 'minor', 'layout'),
      item('sdb-sol', 'Sol', 'minor', 'layout'),
      item('sdb-plafond', 'Plafond', 'minor', 'layout'),
    ],
  },
  {
    id: 'murs',
    title: 'Murs',
    icon: '🖼️',
    items: [
      item('murs-fissures', 'Fissures', 'major', 'structure'),
      item('murs-humidite', 'Humidité', 'major', 'humidity'),
      item('murs-papier-peint', 'Papier peint', 'minor', 'layout'),
      item('murs-peinture', 'Peinture', 'minor', 'layout'),
      item('murs-lambris', 'Lambris', 'minor', 'layout', {
        description: 'Vérifier ce que le lambris peut cacher.',
      }),
      item('murs-enduit', 'Enduit', 'minor', 'layout'),
      item('murs-degats-eaux', 'Traces de dégâts des eaux', 'major', 'humidity'),
    ],
  },
  {
    id: 'plafonds',
    title: 'Plafonds',
    icon: '⬜',
    items: [
      item('plaf-etat', 'État', 'medium', 'structure'),
      item('plaf-materiau', 'Matériau', 'minor', 'structure'),
      item('plaf-fissures', 'Fissures', 'major', 'structure'),
      item('plaf-taches', 'Taches', 'major', 'humidity'),
      item('plaf-humidite', 'Humidité', 'major', 'humidity'),
      item('plaf-deformation', 'Déformation', 'critical', 'structure'),
      item('plaf-hauteur', 'Hauteur sous plafond', 'minor', 'layout'),
    ],
  },
  {
    id: 'sols',
    title: 'Sols',
    icon: '🟫',
    items: [
      item('sols-etat', 'État', 'medium', 'layout'),
      item('sols-materiau', 'Matériau', 'minor', 'layout'),
      item('sols-planeite', 'Planéité', 'major', 'structure', {
        description: 'Une bille qui roule = plancher à examiner.',
      }),
      item('sols-humidite', 'Humidité', 'major', 'humidity'),
      item('sols-grincements', 'Grincements', 'minor', 'structure'),
      item('sols-affaissement', 'Affaissement', 'critical', 'structure'),
    ],
  },
  {
    id: 'menuiseries',
    title: 'Menuiseries',
    icon: '🪟',
    items: [
      item('menu-fenetres', 'Fenêtres', 'major', 'energy', { possibleCost: '300 – 800 € / fenêtre' }),
      item('menu-vitrage', 'Vitrage (simple / double)', 'major', 'energy'),
      item('menu-etancheite', 'Étanchéité', 'medium', 'energy'),
      item('menu-ouverture', 'Ouverture / fermeture', 'medium', 'layout'),
      item('menu-condensation', 'Condensation entre vitres', 'medium', 'energy'),
      item('menu-volets', 'Volets', 'minor', 'layout'),
      item('menu-porte-entree', 'Porte d’entrée', 'medium', 'energy'),
    ],
  },
  {
    id: 'cave',
    title: 'Cave',
    icon: '🕳️',
    items: [
      item('cave-existence', 'Existence / accès au vide sanitaire', 'medium', 'structure'),
      item('cave-acces', 'Accès', 'minor', 'layout'),
      item('cave-humidite', 'Humidité', 'major', 'humidity'),
      item('cave-eau', 'Présence d’eau', 'critical', 'humidity'),
      item('cave-odeur', 'Odeur', 'medium', 'humidity'),
      item('cave-ventilation', 'Ventilation', 'medium', 'humidity'),
      item('cave-electricite', 'Électricité', 'minor', 'electricity'),
      item('cave-etat', 'État général', 'medium', 'structure'),
    ],
  },
  {
    id: 'assainissement',
    title: 'Assainissement',
    icon: '🚰',
    items: [
      item('assain-collectif', 'Raccordement collectif', 'major', 'plumbing-heating'),
      item('assain-individuel', 'Installation individuelle (fosse)', 'critical', 'plumbing-heating', {
        possibleCost: '5 000 – 15 000 €',
      }),
      item('assain-evacuations', 'Évacuations', 'medium', 'plumbing-heating'),
      item('assain-odeur', 'Odeurs', 'medium', 'plumbing-heating'),
      item('assain-refoulement', 'Refoulement', 'major', 'plumbing-heating'),
      item('assain-conformite', 'Conformité', 'major', 'documents'),
    ],
  },
]

export const ALL_INSPECTION_ITEMS: InspectionItem[] = INSPECTION_SECTIONS.flatMap((s) => s.items)

export function findInspectionItem(itemId: string): InspectionItem | undefined {
  return ALL_INSPECTION_ITEMS.find((i) => i.id === itemId)
}

export function sectionOfItem(itemId: string): InspectionSection | undefined {
  return INSPECTION_SECTIONS.find((s) => s.items.some((i) => i.id === itemId))
}
