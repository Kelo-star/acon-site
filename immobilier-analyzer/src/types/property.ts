/**
 * Modèle de données des biens.
 *
 * La provenance de chaque information est conservée dans une structure
 * `provenance` séparée (clé de champ → FieldProvenance) pour ne pas
 * alourdir le modèle principal, tout en permettant de distinguer :
 * annonce, saisie manuelle, visite, document, valeur calculée.
 */
import type { Confidence, ListingFields } from '../services/listingImport/types'

/** Les champs d'un bien sont les mêmes que ceux d'une annonce normalisée. */
export type PropertyData = ListingFields

/** Origine d'une information. */
export type FieldOrigin = 'listing' | 'manual' | 'visit' | 'document' | 'computed'

/** Provenance d'une valeur d'un champ du bien. */
export interface FieldProvenance {
  origin: FieldOrigin
  /** Nom de la plateforme si origin === 'listing' (ex. "SeLoger"). */
  source?: string
  sourceUrl?: string
  importedAt?: string
  confidence?: Confidence
}

/** Référence vers l'annonce d'origine d'un bien importé. */
export interface ListingRef {
  source: string
  sourceUrl: string
  importedAt: string
}

/**
 * Photographie de l'annonce à une date donnée. Permettra en V2 la
 * fonction « Mettre à jour depuis l'annonce » et l'historique de prix :
 *   12/04 : 75 000 € → 03/06 : 72 000 € → 08/08 : 67 000 €
 */
export interface ListingSnapshot {
  date: string
  askingPrice?: number
  title?: string
  description?: string
  status?: 'active' | 'removed' | 'unknown'
}

/** Origine d'une observation (jamais l'annonce : c'est du constaté). */
export type ObservationOrigin = 'visit' | 'document'

/**
 * Observation faite pendant une visite ou tirée d'un document.
 * Elle coexiste avec les données de l'annonce et ne les écrase jamais :
 * le moteur de cohérence signale les contradictions.
 */
export interface Observation {
  id: string
  /** Clé de champ normalisé si l'observation s'y rapporte (ex. "doubleGlazing"). */
  field?: keyof PropertyData
  /** Libellé lisible ("Fenêtre chambre : simple vitrage"). */
  label: string
  value: string | number | boolean
  origin: ObservationOrigin
  note?: string
  notedAt: string
}

export interface Property {
  id: string
  createdAt: string
  updatedAt: string
  data: PropertyData
  /** Provenance par champ (clé de PropertyData). */
  provenance: Partial<Record<keyof PropertyData, FieldProvenance>>
  /** Annonce d'origine, si le bien a été importé. */
  listing?: ListingRef
  /** Historique des états de l'annonce. */
  snapshots: ListingSnapshot[]
  /** Observations de visite / documents. */
  observations: Observation[]
}
