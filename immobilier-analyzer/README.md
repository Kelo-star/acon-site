# Immobilier Analyzer

Application web (React + TypeScript + Vite) pour constituer et analyser une bibliothèque de biens immobiliers : import d'annonces, saisie manuelle, observations de visite et détection d'incohérences.

L'application fonctionne entièrement dans le navigateur (données stockées en localStorage), sans backend.

## Démarrage

```bash
npm install
npm run dev      # serveur de développement
npm run test     # tests unitaires (Vitest)
npm run build    # vérification TypeScript + build de production
```

## Fonctionnalités

- **Créer un bien** de deux façons : importer une annonce ou saisie manuelle.
- **Importer une annonce** :
  - depuis un lien (Leboncoin, SeLoger, Bien'ici, PAP, sites d'agences, toute URL http(s)) ;
  - en collant le texte de l'annonce (extraction locale par règles et expressions régulières : prix, surface, pièces, chambres, DPE, GES, taxe foncière, année de construction, jardin, garage, cave, balcon, chauffage, dépenses d'énergie…).
- **Écran de vérification** : rien n'est enregistré sans validation, chaque champ importé est corrigible avant « Créer le bien ».
- **Provenance** : chaque champ conserve son origine (annonce, saisie manuelle, visite, document, calculé), avec source, URL et date d'import.
- **Détection de doublon** par URL d'annonce : ouvrir le bien existant, créer une copie ou mettre à jour les informations.
- **Observations de visite / documents** : elles coexistent avec l'annonce et ne sont jamais écrasées silencieusement par un import.
- **Moteur de cohérence** : signale les contradictions (ex. double vitrage annoncé mais simple vitrage constaté en visite).
- **Historique de l'annonce** (`ListingSnapshot`) : prépare la future fonction « Mettre à jour depuis l'annonce » et le suivi des baisses de prix.

Le fonctionnement détaillé de l'import (architecture, limites, V2 backend, extension navigateur) est documenté dans [docs/LISTING_IMPORT.md](docs/LISTING_IMPORT.md).

## Structure

```
immobilier-analyzer/
  index.html
  src/
    main.tsx, App.tsx, index.css
    components/          # UI : liste, choix, import, vérification, fiche du bien
    types/property.ts    # Property, provenance, snapshots, observations
    services/
      fields.ts          # définitions et formatage des champs
      propertyStore.ts   # persistance localStorage + détection de doublon
      propertyLifecycle.ts  # création / mise à jour depuis un import validé
      consistency.ts     # moteur de cohérence annonce / visite / documents
      listingImport/
        types.ts         # ListingImportResult, ListingImporter, ListingImportService
        listingImporter.ts  # registre de providers + services Local / Api
        textParser.ts    # extraction par règles depuis un texte collé
        sources.ts       # plateformes connues
        providers/       # generic, leboncoin, seloger
  tests/                 # tests Vitest des services
  docs/LISTING_IMPORT.md
  public/
```

## Limites connues (V1)

Le navigateur ne peut pas télécharger les pages des plateformes (CORS, protections anti-robot, rendu dynamique). L'import par URL n'exploite donc que les indices du lien lui-même ; l'import complet passe par le collage du texte de l'annonce, en attendant un backend d'import (V2). Aucun contournement de protection n'est mis en place.
