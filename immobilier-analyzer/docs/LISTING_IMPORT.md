# Import d'annonces immobilières

Ce document décrit l'architecture du système d'import, ses limites en V1 et les évolutions prévues.

## Architecture

Le frontend n'appelle jamais une implémentation concrète : il passe par l'abstraction `ListingImportService` (fabriquée par `createListingImportService()`), qui expose deux méthodes :

- `import(url)` : import depuis une URL d'annonce ;
- `importFromText(text, sourceUrl?)` : import depuis le texte collé d'une annonce.

Deux implémentations existent :

- `LocalListingImportService` (V1, active) : tout se passe dans le navigateur ;
- `ApiListingImportService` (V2, prête mais non branchée) : délègue à un backend.

Côté URL, un registre de providers (`ListingImporter`) route chaque lien vers l'adaptateur capable de le traiter :

```
ListingImporter {
  canHandle(url: string): boolean
  importListing(url: string): Promise<ListingImportResult>
}
```

Providers actuels : `leboncoinProvider`, `selogerProvider`, puis `genericProvider` en dernier recours (toute URL http(s)). L'architecture n'est spécifique à aucune plateforme : ajouter Bien'ici ou PAP consiste à créer un provider et à l'enregistrer via `registerProvider()`, sans toucher au reste de l'application.

Toutes les méthodes retournent le même type normalisé `ListingImportResult` (tous champs facultatifs, plus `source`, `sourceUrl`, `importedAt`, `warnings`, `rawData`).

## Méthodes d'entrée (V1)

**A. URL d'annonce.** Une application 100 % navigateur ne peut pas télécharger le HTML de Leboncoin ou SeLoger : CORS, protections anti-robot, pages rendues dynamiquement, règles des plateformes. Aucun contournement fragile n'est mis en place (pas de proxy CORS public, pas de reverse-engineering d'API privée, pas de clé dans le frontend). Les providers exploitent donc uniquement les indices présents dans l'URL elle-même (ville, code postal, type de bien, identifiant d'annonce dans le slug) et l'expliquent via `warnings`.

**B. Texte collé.** `textParser.ts` extrait localement, par règles et expressions régulières : prix, prix au m², surface, terrain, pièces, chambres, salles de bain, ville, code postal, DPE, GES, taxe foncière, charges de copropriété, année de construction, chauffage, orientation, dépenses d'énergie, jardin/garage/parking/cave/grenier/balcon/double vitrage (avec gestion des négations « sans garage »), description. C'est la méthode la plus complète en V1.

**C. Saisie manuelle.** Toujours disponible.

Dans tous les cas, les valeurs extraites ne sont **jamais enregistrées directement** : elles passent par l'écran « Vérifiez les informations récupérées », où chaque champ est corrigible, avant « Créer le bien ».

## Provenance et mise à jour

- Chaque champ d'un bien conserve sa provenance (`origin`: listing / manual / visit / document / computed, plus `source`, `sourceUrl`, `importedAt`, `confidence`) dans une structure `provenance` séparée du modèle principal.
- L'URL d'origine est conservée (`listing.sourceUrl`) et affichée sur la fiche (« Voir l'annonce originale »).
- Chaque import validé ajoute un `ListingSnapshot { date, askingPrice?, title?, description?, status? }`, ce qui prépare la future fonction « Mettre à jour depuis l'annonce » (détection de changement de prix, de description, d'annonce supprimée) et l'historique de prix.
- Détection de doublon par `sourceUrl` normalisée (tracking et fragments ignorés) avec trois choix : ouvrir le bien existant, créer une copie, mettre à jour les informations.
- Une mise à jour depuis une annonce n'écrase jamais silencieusement une information d'origine visite ou document ; le moteur de cohérence (`consistency.ts`) signale les contradictions entre annonce, visite et documents.

## V2 : backend d'import

Pour analyser réellement le contenu des pages, il faudra un backend qui télécharge et interprète les annonces dans le respect des règles des plateformes. Contrat prévu :

```
POST /api/listing/import        body: { "url": "https://..." }
POST /api/listing/import-text   body: { "text": "...", "sourceUrl": "https://..." }
→ ListingImportResult
```

`ApiListingImportService` implémente déjà ce contrat côté frontend. Pour basculer, définir la variable d'environnement `VITE_IMPORT_API_URL` (ex. `/api`) : `createListingImportService()` choisira automatiquement l'implémentation API, sans aucune modification de l'UI.

Le backend permettra aussi : la synchronisation périodique des annonces (nouveaux snapshots, détection de suppression), la récupération des photos et un parsing plus robuste (HTML structuré, métadonnées schema.org).

## Piste future : extension navigateur

Une extension Chrome/Safari pourrait transmettre à l'application le contenu de la page que l'utilisateur consulte, sans aucun scraping serveur :

- URL de l'annonce ;
- titre de la page ;
- texte visible ;
- métadonnées (balises meta, JSON-LD schema.org).

Le type `PageContent` (dans `listingImport/types.ts`) est prévu pour ce canal : l'application analyserait ce contenu avec le même `textParser` et les mêmes providers, et le résultat passerait par le même écran de vérification. L'extension n'est pas développée en V1.

## Limites de la V1

- L'import par URL ne récupère que ce que contient le lien (pas le contenu de la page).
- L'extraction par texte repose sur des règles simples : des formulations inhabituelles peuvent échapper aux expressions régulières, d'où la validation systématique par l'utilisateur.
- Pas de récupération de photos.
- « Mettre à jour depuis l'annonce » n'est pas automatique : le modèle de données (snapshots) est prêt, la synchronisation viendra avec le backend V2.
