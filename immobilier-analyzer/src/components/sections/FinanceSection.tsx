/**
 * Finances : coût total d'acquisition, valeur après travaux, prix maximum
 * d'achat et analyse locative facultative. Tous les calculs viennent de
 * services/calculations.ts.
 */
import type { SectionProps } from './types'
import type { RentalInputs } from '../../models/property'
import { MARGIN_RATES } from '../../models/property'
import {
  acquisitionCost,
  maxPurchasePriceFor,
  pricePerSquareMeter,
  rentalAnalysis,
  renovationBudget,
} from '../../services/calculations'
import { formatEUR, formatPercent } from '../../utils/format'
import { NumberField, Segmented, Stat } from '../ui'

export default function FinanceSection({ property, update }: SectionProps) {
  const cost = acquisitionCost(property)
  const works = renovationBudget(property.renovations, property.finance.contingencyRate)
  const maxPrice = maxPurchasePriceFor(property)
  const priceM2 = pricePerSquareMeter(cost.basePrice, property.general.surface)
  const rental = property.finance.rental
  const rentalResult = rentalAnalysis(rental, cost.basePrice, cost.total)

  const setFinance = (changes: Partial<typeof property.finance>) =>
    update((p) => ({ ...p, finance: { ...p.finance, ...changes } }))
  const setRental = (changes: Partial<RentalInputs>) =>
    update((p) => ({
      ...p,
      finance: {
        ...p.finance,
        rental: { vacancyRate: 0.08, ...p.finance.rental, ...changes },
      },
    }))

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h2 className="section-title">Coût total d'acquisition</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Prix retenu {property.prices.negotiatedPrice !== undefined ? '(négocié)' : '(demandé)'}</dt>
            <dd className="font-semibold">{formatEUR(cost.basePrice)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Prix au m²</dt>
            <dd>{priceM2 !== undefined ? formatEUR(Math.round(priceM2)) : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Frais de notaire (≈ {formatPercent(property.finance.notaryRate)})</dt>
            <dd>{formatEUR(cost.notary !== undefined ? Math.round(cost.notary) : undefined)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Travaux identifiés</dt>
            <dd>{formatEUR(cost.worksSubtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Imprévus ({formatPercent(property.finance.contingencyRate)})</dt>
            <dd>{formatEUR(Math.round(cost.contingency))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Frais annexes</dt>
            <dd>{formatEUR(cost.otherCosts)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1 text-base">
            <dt className="font-bold">Coût total</dt>
            <dd className="font-bold text-blue-700">
              {formatEUR(cost.total !== undefined ? Math.round(cost.total) : undefined)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Coût total au m²</dt>
            <dd>{cost.totalPerM2 !== undefined ? formatEUR(Math.round(cost.totalPerM2)) : '—'}</dd>
          </div>
        </dl>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Frais annexes"
            unit="€"
            value={property.finance.otherCosts}
            onChange={(otherCosts) => setFinance({ otherCosts })}
            placeholder="Courtier, dossier, déménagement…"
          />
          <NumberField
            label="Taux notaire"
            unit="%"
            value={Math.round(property.finance.notaryRate * 1000) / 10}
            onChange={(v) => setFinance({ notaryRate: (v ?? 8) / 100 })}
          />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Valeur après travaux</h2>
        <p className="text-xs text-gray-500">
          Valeurs renseignées par vous (estimations d'agences, ventes comparables…). L'application ne les
          calcule pas à votre place.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Valeur basse"
            unit="€"
            value={property.finance.afterWorksValue.low}
            onChange={(low) => setFinance({ afterWorksValue: { ...property.finance.afterWorksValue, low } })}
          />
          <NumberField
            label="Valeur probable"
            unit="€"
            value={property.finance.afterWorksValue.probable}
            onChange={(probable) =>
              setFinance({ afterWorksValue: { ...property.finance.afterWorksValue, probable } })
            }
          />
          <NumberField
            label="Valeur haute"
            unit="€"
            value={property.finance.afterWorksValue.high}
            onChange={(high) => setFinance({ afterWorksValue: { ...property.finance.afterWorksValue, high } })}
          />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Prix maximum d'achat</h2>
        <div>
          <span className="label">Marge de sécurité</span>
          <Segmented
            small
            value={String(property.finance.safetyMarginRate)}
            onChange={(v) => setFinance({ safetyMarginRate: Number(v) })}
            options={MARGIN_RATES.map((rate) => ({ value: String(rate), label: formatPercent(rate) }))}
          />
        </div>
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">
            Prix maximum théorique
          </div>
          <div className="text-2xl font-bold text-blue-800">
            {maxPrice !== undefined ? formatEUR(Math.round(maxPrice)) : '—'}
          </div>
          {maxPrice === undefined && (
            <p className="mt-1 text-xs text-blue-800">
              Renseignez une valeur après travaux (basse ou probable) pour calculer ce prix.
            </p>
          )}
          {maxPrice !== undefined && cost.basePrice !== undefined && (
            <p className="mt-1 text-sm text-blue-900">
              {cost.basePrice <= maxPrice
                ? `Le prix retenu (${formatEUR(cost.basePrice)}) est sous ce plafond.`
                : `Le prix retenu (${formatEUR(cost.basePrice)}) dépasse ce plafond de ${formatEUR(
                    Math.round(cost.basePrice - maxPrice),
                  )}.`}
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Calcul : valeur prudente après travaux × (1 − marge) − travaux (imprévus inclus : {formatEUR(Math.round(works.total))}) −
          frais annexes, ramené à un prix d'achat net de frais de notaire.
          <br />
          <em>Cette estimation est un outil d'aide à la décision et ne constitue pas une expertise immobilière.</em>
        </p>
      </div>

      <details className="card" open={Boolean(rental?.monthlyRent)}>
        <summary className="cursor-pointer">
          <span className="section-title">Analyse locative (facultatif)</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Loyer mensuel" unit="€" value={rental?.monthlyRent} onChange={(v) => setRental({ monthlyRent: v })} />
            <NumberField
              label="Charges récupérables"
              unit="€/mois"
              value={rental?.monthlyRecoverableCharges}
              onChange={(v) => setRental({ monthlyRecoverableCharges: v })}
            />
            <NumberField label="Taxe foncière" unit="€/an" value={rental?.annualPropertyTax} onChange={(v) => setRental({ annualPropertyTax: v })} />
            <NumberField label="Assurance" unit="€/an" value={rental?.annualInsurance} onChange={(v) => setRental({ annualInsurance: v })} />
            <NumberField label="Gestion" unit="€/an" value={rental?.annualManagement} onChange={(v) => setRental({ annualManagement: v })} />
            <NumberField label="Entretien" unit="€/an" value={rental?.annualMaintenance} onChange={(v) => setRental({ annualMaintenance: v })} />
            <NumberField
              label="Vacance locative"
              unit="%"
              value={rental ? Math.round(rental.vacancyRate * 100) : undefined}
              onChange={(v) => setRental({ vacancyRate: (v ?? 0) / 100 })}
            />
            <NumberField
              label="Mensualité crédit"
              unit="€/mois"
              value={rental?.monthlyLoanPayment}
              onChange={(v) => setRental({ monthlyLoanPayment: v })}
            />
          </div>
          {rentalResult.annualRent !== undefined && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Loyer annuel (vacance déduite)" value={formatEUR(Math.round(rentalResult.annualRent))} />
              <Stat label="Rendement brut / prix" value={formatPercent(rentalResult.grossYieldOnPrice, 1)} />
              <Stat label="Rendement brut / coût total" value={formatPercent(rentalResult.grossYieldOnTotal, 1)} />
              <Stat label="Rendement net simplifié" value={formatPercent(rentalResult.netYield, 1)} />
              <Stat
                label="Cash-flow mensuel simplifié"
                value={
                  rentalResult.monthlyCashflow !== undefined
                    ? formatEUR(Math.round(rentalResult.monthlyCashflow))
                    : '—'
                }
                accent
              />
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
