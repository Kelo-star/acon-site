/**
 * Moteur de calcul financier, isolé de l'interface.
 * Toutes les fonctions sont pures et faciles à faire évoluer.
 *
 * Ces calculs sont un outil d'aide à la décision et ne constituent
 * en aucun cas une expertise immobilière professionnelle.
 */
import type { Property, RentalInputs } from '../models/property'
import type { RenovationLine } from '../models/renovation'

export function pricePerSquareMeter(
  price: number | undefined,
  surface: number | undefined,
): number | undefined {
  if (price === undefined || !surface) return undefined
  return price / surface
}

/** Frais de notaire estimés (défaut : 8 %, bien ancien). */
export function notaryFees(price: number | undefined, rate = 0.08): number | undefined {
  return price === undefined ? undefined : price * rate
}

/** Montant retenu pour une ligne de travaux selon l'hypothèse choisie. */
export function renovationLineAmount(line: RenovationLine): number {
  const amount =
    line.selectedBudget === 'low'
      ? (line.budgetLow ?? line.budgetExpected ?? line.budgetHigh)
      : line.selectedBudget === 'high'
        ? (line.budgetHigh ?? line.budgetExpected ?? line.budgetLow)
        : (line.budgetExpected ?? line.budgetLow ?? line.budgetHigh)
  return amount ?? 0
}

export function renovationSubtotal(lines: RenovationLine[]): number {
  return lines.reduce((sum, line) => sum + renovationLineAmount(line), 0)
}

export function contingencyAmount(subtotal: number, rate: number): number {
  return subtotal * rate
}

export interface RenovationBudget {
  subtotal: number
  contingency: number
  total: number
}

/** Travaux identifiés + imprévus = budget travaux total. */
export function renovationBudget(lines: RenovationLine[], contingencyRate: number): RenovationBudget {
  const subtotal = renovationSubtotal(lines)
  const contingency = contingencyAmount(subtotal, contingencyRate)
  return { subtotal, contingency, total: subtotal + contingency }
}

export interface AcquisitionCost {
  /** Prix retenu : prix négocié s'il existe, sinon prix demandé. */
  basePrice?: number
  notary?: number
  worksSubtotal: number
  contingency: number
  otherCosts: number
  total?: number
  totalPerM2?: number
}

/** Coût total d'acquisition : prix + notaire + travaux + imprévus + annexes. */
export function acquisitionCost(property: Property): AcquisitionCost {
  const basePrice = property.prices.negotiatedPrice ?? property.prices.askingPrice
  const notary = notaryFees(basePrice, property.finance.notaryRate)
  const works = renovationBudget(property.renovations, property.finance.contingencyRate)
  const otherCosts = property.finance.otherCosts ?? 0
  const total =
    basePrice === undefined
      ? undefined
      : basePrice + (notary ?? 0) + works.subtotal + works.contingency + otherCosts
  return {
    basePrice,
    notary,
    worksSubtotal: works.subtotal,
    contingency: works.contingency,
    otherCosts,
    total,
    totalPerM2: pricePerSquareMeter(total, property.general.surface),
  }
}

export interface MaxPriceInputs {
  /** Valeur prudente après travaux (valeur basse, sinon probable). */
  prudentValue: number | undefined
  worksTotal: number
  otherCosts: number
  marginRate: number
  notaryRate: number
}

/**
 * Prix maximum théorique : le prix d'achat tel que
 * prix + notaire + travaux + annexes ≤ valeur prudente × (1 − marge).
 * Résultat plancher à 0. Fonction volontairement simple à modifier.
 */
export function maxPurchasePrice(inputs: MaxPriceInputs): number | undefined {
  if (inputs.prudentValue === undefined) return undefined
  const budget = inputs.prudentValue * (1 - inputs.marginRate) - inputs.worksTotal - inputs.otherCosts
  return Math.max(0, budget / (1 + inputs.notaryRate))
}

/** Prix maximum théorique calculé depuis un bien. */
export function maxPurchasePriceFor(property: Property): number | undefined {
  const works = renovationBudget(property.renovations, property.finance.contingencyRate)
  const value = property.finance.afterWorksValue
  return maxPurchasePrice({
    prudentValue: value.low ?? value.probable,
    worksTotal: works.total,
    otherCosts: property.finance.otherCosts ?? 0,
    marginRate: property.finance.safetyMarginRate,
    notaryRate: property.finance.notaryRate,
  })
}

export interface RentalAnalysis {
  annualRent?: number
  grossYieldOnPrice?: number
  grossYieldOnTotal?: number
  netYield?: number
  monthlyCashflow?: number
}

/** Analyse locative simplifiée (facultative). */
export function rentalAnalysis(
  rental: RentalInputs | undefined,
  purchasePrice: number | undefined,
  totalCost: number | undefined,
): RentalAnalysis {
  if (!rental || rental.monthlyRent === undefined) return {}
  const grossAnnualRent = rental.monthlyRent * 12
  const annualRent = grossAnnualRent * (1 - (rental.vacancyRate ?? 0))
  const expenses =
    (rental.annualPropertyTax ?? 0) +
    (rental.annualInsurance ?? 0) +
    (rental.annualManagement ?? 0) +
    (rental.annualMaintenance ?? 0)
  const netAnnualIncome = annualRent - expenses
  return {
    annualRent,
    grossYieldOnPrice: purchasePrice ? grossAnnualRent / purchasePrice : undefined,
    grossYieldOnTotal: totalCost ? grossAnnualRent / totalCost : undefined,
    netYield: totalCost ? netAnnualIncome / totalCost : undefined,
    monthlyCashflow: netAnnualIncome / 12 - (rental.monthlyLoanPayment ?? 0),
  }
}
