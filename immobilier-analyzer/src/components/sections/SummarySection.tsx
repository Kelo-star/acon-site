/** Résumé : informations générales, prix, caractéristiques, annonce d'origine. */
import type { SectionProps } from './types'
import type { GeneralInfo, PriceInfo, RealEstateInfo } from '../../models/property'
import { BooleanField, NumberField, TextAreaField, TextField } from '../ui'
import { formatDate, formatEUR } from '../../utils/format'

export default function SummarySection({ property, update }: SectionProps) {
  /* Toute édition manuelle met la provenance du champ à « manual » :
     un futur ré-import de l'annonce ne l'écrasera pas silencieusement. */
  const setGeneral = <K extends keyof GeneralInfo>(key: K, value: GeneralInfo[K]) =>
    update((p) => ({
      ...p,
      general: { ...p.general, [key]: value },
      provenance: { ...p.provenance, [key]: { origin: 'manual' } },
    }))
  const setPrices = <K extends keyof PriceInfo>(key: K, value: PriceInfo[K]) =>
    update((p) => ({
      ...p,
      prices: { ...p.prices, [key]: value },
      provenance: { ...p.provenance, [key]: { origin: 'manual' } },
    }))
  const setInfo = <K extends keyof RealEstateInfo>(key: K, value: RealEstateInfo[K]) =>
    update((p) => ({
      ...p,
      info: { ...p.info, [key]: value },
      provenance: { ...p.provenance, [key]: { origin: 'manual' } },
    }))

  const { general, prices, info } = property

  return (
    <div className="space-y-4">
      {property.listing && (
        <div className="card flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <span className="text-gray-500">Source : </span>
            <strong>{property.listing.source}</strong>
            <span className="text-gray-400"> · importé le {formatDate(property.listing.importedAt)}</span>
            {property.snapshots.length > 1 && (
              <div className="mt-1 text-xs text-gray-500">
                Historique :{' '}
                {property.snapshots
                  .map((s) => `${formatDate(s.date)} : ${formatEUR(s.askingPrice)}`)
                  .join(' → ')}
              </div>
            )}
          </div>
          {property.listing.sourceUrl && (
            <a
              className="btn no-print"
              href={property.listing.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Voir l'annonce originale
            </a>
          )}
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="section-title">Informations générales</h2>
        <TextField label="Nom du bien" value={general.title} onChange={(v) => setGeneral('title', v ?? '')} />
        <TextField label="Adresse" value={general.address} onChange={(v) => setGeneral('address', v)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Code postal" value={general.postalCode} onChange={(v) => setGeneral('postalCode', v)} />
          <TextField label="Ville" value={general.city} onChange={(v) => setGeneral('city', v ?? '')} />
          <TextField label="Type de bien" value={general.propertyType} onChange={(v) => setGeneral('propertyType', v)} />
          <NumberField label="Année de construction" value={general.constructionYear} onChange={(v) => setGeneral('constructionYear', v)} />
          <NumberField label="Surface" unit="m²" value={general.surface} onChange={(v) => setGeneral('surface', v)} />
          <NumberField label="Terrain" unit="m²" value={general.landSurface} onChange={(v) => setGeneral('landSurface', v)} />
          <NumberField label="Pièces" value={general.rooms} onChange={(v) => setGeneral('rooms', v)} />
          <NumberField label="Chambres" value={general.bedrooms} onChange={(v) => setGeneral('bedrooms', v)} />
          <NumberField label="Salles de bain" value={general.bathrooms} onChange={(v) => setGeneral('bathrooms', v)} />
          <NumberField label="Niveaux" value={general.floors} onChange={(v) => setGeneral('floors', v)} />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Prix</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Prix demandé" unit="€" value={prices.askingPrice} onChange={(v) => setPrices('askingPrice', v)} />
          <NumberField label="Prix négocié" unit="€" value={prices.negotiatedPrice} onChange={(v) => setPrices('negotiatedPrice', v)} />
          <NumberField label="Offre envisagée" unit="€" value={prices.targetOffer} onChange={(v) => setPrices('targetOffer', v)} />
          <NumberField label="Offre maximum" unit="€" value={prices.maximumOffer} onChange={(v) => setPrices('maximumOffer', v)} />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Informations immobilières</h2>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="DPE" value={info.dpe} onChange={(v) => setInfo('dpe', v)} placeholder="A à G" />
          <TextField label="GES" value={info.ges} onChange={(v) => setInfo('ges', v)} placeholder="A à G" />
          <NumberField label="Taxe foncière" unit="€/an" value={info.propertyTax} onChange={(v) => setInfo('propertyTax', v)} />
          <TextField label="Orientation" value={info.orientation} onChange={(v) => setInfo('orientation', v)} />
          <BooleanField label="Copropriété" value={info.condominium} onChange={(v) => setInfo('condominium', v)} />
          <NumberField label="Charges copro" unit="€/an" value={info.condominiumFees} onChange={(v) => setInfo('condominiumFees', v)} />
          <BooleanField label="Jardin" value={info.garden} onChange={(v) => setInfo('garden', v)} />
          <BooleanField label="Garage" value={info.garage} onChange={(v) => setInfo('garage', v)} />
          <BooleanField label="Parking" value={info.parking} onChange={(v) => setInfo('parking', v)} />
          <BooleanField label="Cave" value={info.cellar} onChange={(v) => setInfo('cellar', v)} />
          <BooleanField label="Grenier / combles" value={info.attic} onChange={(v) => setInfo('attic', v)} />
          <BooleanField label="Balcon" value={info.balcony} onChange={(v) => setInfo('balcony', v)} />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Notes générales</h2>
        <TextAreaField
          label="Notes"
          value={property.notes}
          onChange={(notes) => update((p) => ({ ...p, notes }))}
          rows={5}
          placeholder="Impressions générales, points à retenir… (la dictée du téléphone fonctionne ici)"
        />
      </div>
    </div>
  )
}
