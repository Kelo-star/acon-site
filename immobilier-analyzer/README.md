# Immobilier Analyzer

Outil personnel d'aide à l'analyse de biens immobiliers pendant les visites : un dossier par bien, checklist complète, anomalies et red flags, budget travaux, calculs financiers, score, verdict prudent, comparateur et rapport imprimable.

L'application est générique : elle n'est liée à aucun bien particulier et ne contient aucune donnée préremplie.

Ses calculs sont un outil d'aide à la décision et ne constituent jamais une expertise immobilière professionnelle.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS 4
- Vitest (tests unitaires des fonctions métier)
- Aucun backend : tout fonctionne dans le navigateur

## Installation et lancement

```bash
npm install
npm run dev       # serveur de développement
npm run test      # tests unitaires
npm run build     # vérification TypeScript + build de production
npm run preview   # prévisualisation du build
```

## Fonctionnalités

- **Tableau de bord** : cartes des biens (prix, surface, prix au m², score, complétude, travaux, prix maximum, statut), recherche, filtres (ville, statut, score, budget, prix, rendement), actions ouvrir / dupliquer / supprimer / comparer.
- **Création d'un bien** : saisie manuelle légère (nom + ville) ou **import d'une annonce** (lien Leboncoin, SeLoger, Bien'ici, PAP, sites d'agences… ou texte collé analysé localement). Écran de vérification systématique, détection de doublon par URL, provenance conservée par champ (annonce / manuel / visite / document / calculé), historique de snapshots de l'annonce. Détails dans [docs/LISTING_IMPORT.md](docs/LISTING_IMPORT.md).
- **Fiche du bien** en 9 sections : Résumé, Visite, Technique, Travaux, Finances, Documents, Photos, Questions, Analyse. Navigation par onglets adaptée au mobile.
- **Checklist de visite** : 18 catégories et ~150 critères définis dans `src/data/inspectionSections.ts` (jamais dans les composants). Statuts Bon / Moyen / Mauvais / À vérifier / N/A / Non contrôlé, avec commentaire, coût, gravité, photo et **red flag**.
- **Mode Visite express** : 25 contrôles essentiels, avec liste automatique des points à revoir en deuxième visite.
- **Bouton « + Anomalie »** flottant : catégorie, pièce, description, gravité, photo, coût, « à faire vérifier par un pro », red flag — en quelques secondes.
- **Pièces libres** (noms proposés ou personnalisés) : surface, hauteur, luminosité, état, notes, photos.
- **Travaux** : lignes budgétées (bas / probable / haut, hypothèse retenue, priorité, statut) + réserve pour imprévus (défaut 15 %) et totaux séparés.
- **Finances** : prix au m², frais de notaire, coût total d'acquisition, coût au m², valeur après travaux saisie manuellement, **prix maximum d'achat** avec marge de sécurité, analyse locative facultative (rendements bruts, net simplifié, cash-flow).
- **Score sur 100** paramétrable (`src/services/scoring.ts`) affiché avec la **complétude de la visite** : un score élevé sur une visite peu complète est explicitement signalé comme peu fiable. Les **red flags ne sont jamais masqués** par le score.
- **Verdict prudent** basé sur score + complétude + red flags + travaux + écart prix demandé / prix maximum, avec synthèse (points positifs, négatifs, travaux urgents, éléments non vérifiés, documents manquants, questions sans réponse).
- **Comparateur** multi-biens qui met en évidence les écarts sans désigner de gagnant.
- **Rapport de visite** imprimable (impression native, feuille `@media print`).
- **Export / import JSON** (bien seul ou sauvegarde complète), avec `schemaVersion` et validation à l'import.
- **Sauvegarde automatique** : aucune action « Enregistrer », chaque modification est persistée immédiatement.

## Stockage des données

Toutes les données restent **localement sur l'appareil** (IndexedDB), photos incluses. Aucune donnée n'est envoyée vers un service tiers.

L'interface ne touche jamais IndexedDB directement : elle passe par `src/services/storageService.ts`, dont l'adaptateur (`IndexedDbAdapter` / `MemoryAdapter`) est interchangeable — remplacer le stockage (backend, synchronisation cloud) ne demandera aucun changement dans les composants.

Les exports JSON servent de sauvegarde durable ; les fichiers photo n'y sont pas inclus (limite V1).

## Architecture

```
src/
  components/          composants réutilisables (ui, checklist, photos, anomalie)
    sections/          les 9 sections de la fiche d'un bien
  pages/               Dashboard, NewProperty (import inclus), Property, Compare, Report
  data/
    inspectionSections.ts   critères de visite (18 catégories)
    expressChecklist.ts     les 25 contrôles du mode express
    defaultDocuments.ts     checklist documents
    defaultQuestions.ts     questions vendeur
    renovationCategories.ts catégories travaux + noms de pièces
  models/
    property.ts        Property, statuts, provenance, snapshots, finances
    inspection.ts      checklist, anomalies, pièces, documents, questions, photos
    renovation.ts      lignes de travaux, priorités, imprévus
  services/
    storageService.ts  couche de stockage (IndexedDB, interchangeable)
    calculations.ts    moteur de calcul financier (fonctions pures)
    scoring.ts         score paramétrable, complétude, red flags, verdict
    importExport.ts    export/import JSON versionné et validé
    listingImport/     import d'annonces (providers, parseur de texte)
  hooks/               contexte des biens (auto-save), routeur hash
  utils/               formatage, ids, normalisation d'URL
tests/                 tests Vitest des fonctions métier
```

## Limites actuelles (V1)

- Import par URL limité aux informations du lien (CORS et protections anti-robot empêchent de télécharger les pages depuis le navigateur) ; l'import complet passe par le texte collé. Un backend V2 est prévu dans l'architecture (`ApiListingImportService`).
- Photos non incluses dans les exports JSON.
- Pas d'authentification, de synchronisation ni de partage : les données vivent dans le navigateur de l'appareil.
- Frais de notaire estimés par un taux forfaitaire (8 % par défaut, modifiable).
- Le score et le verdict restent des heuristiques simples et paramétrables, pas une expertise.

L'architecture est prête pour la suite (backend, PWA, IA d'analyse, géolocalisation…) : stockage abstrait, calculs isolés, données de checklist séparées de l'interface, schéma versionné.
