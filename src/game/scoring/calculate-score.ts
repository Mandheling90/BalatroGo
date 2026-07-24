import { evaluatePatterns } from '../../scoring'
import type { HwatuCard } from '../core/cards/types'
import { charmModifiers } from '../modifiers/charms'
import type { ScoreModifierContext } from '../modifiers/types'
import { cardPointConfig, getGoFinalMultiplier } from './score-config'
import type { BalatroScoreResult, ScoreEvent } from './types'

export interface CalculateScoreInput {
  cards: HwatuCard[]
  previousCards?: HwatuCard[]
  ownedCharmIds?: string[]
  ruleBonus?: number
  previousRuleBonus?: number
  goCount?: number
  previousGoCount?: number
}

const uniqueCards = (cards: HwatuCard[]) => {
  const seen = new Set<string>()
  return cards.filter((card) => {
    if (seen.has(card.id)) return false
    seen.add(card.id)
    return true
  })
}

export const getCardPoints = (card: HwatuCard) =>
  cardPointConfig[card.kind] * (card.kind === 'pi' ? (card.piValue ?? 1) : 1)

export const getSettlementScore = (result: BalatroScoreResult) => {
  const newlyEarnedPoints = result.events.reduce((sum, event) => sum + (event.baseDelta ?? 0), 0)
  return {
    basePoints: newlyEarnedPoints,
    score: newlyEarnedPoints * result.multiplier * result.finalMultiplier,
  }
}

const modifierContext = (cards: HwatuCard[]): ScoreModifierContext => {
  const evaluation = evaluatePatterns(cards)
  const completeMonthSets = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((month) => cards.filter((card) => card.month === month).length >= 4).length
  return {
    cards,
    yakuScore: evaluation.totalScore,
    completedPatternIds: evaluation.completedPatterns.map((pattern) => pattern.id),
    counts: {
      gwang: evaluation.counts.gwang,
      ribbon: evaluation.counts.ribbon,
      junk: evaluation.counts.junk,
      bird: cards.filter((card) => card.bird).length,
      completedMonths: new Set(cards.filter((card) => card.month >= 1).map((card) => card.month)).size,
      completeMonthSets,
    },
  }
}

const yakuValues = (cards: HwatuCard[]) => {
  const evaluation = evaluatePatterns(cards)
  return new Map<string, { label: string; value: number }>([
    ...evaluation.completedPatterns.map((pattern) => [pattern.id, { label: pattern.name, value: pattern.score }] as const),
    ['ribbon-count', { label: '띠', value: evaluation.countScores.ribbon }],
    ['animal-count', { label: '열끗', value: evaluation.countScores.animal }],
    ['junk-count', { label: '피', value: evaluation.countScores.junk }],
  ])
}

export function calculateBalatroScore(input: CalculateScoreInput): BalatroScoreResult {
  const cards = uniqueCards(input.cards)
  const previousCards = uniqueCards(input.previousCards ?? [])
  const ownedCharmIds = input.ownedCharmIds ?? []
  const previousIds = new Set(previousCards.map((card) => card.id))
  const events: ScoreEvent[] = cards
    .filter((card) => !previousIds.has(card.id))
    .map((card, index) => ({
      id: `card-${card.id}-${index}`,
      sourceType: 'card',
      sourceId: card.id,
      label: card.title,
      baseDelta: getCardPoints(card),
      emphasis: 'normal',
    }))

  const currentContext = modifierContext(cards)
  const previousContext = modifierContext(previousCards)
  let jokerPoints = 0
  let jokerMultiplier = 0
  let jokerFinalMultiplier = 1
  charmModifiers
    .filter((modifier) => ownedCharmIds.includes(modifier.id) && (modifier.modifyScore || modifier.modifySettlementScore))
    .sort((a, b) => a.priority - b.priority)
    .forEach((modifier, index) => {
      const current = modifier.modifySettlementScore
        ? modifier.modifySettlementScore(currentContext, previousContext)
        : modifier.modifyScore!(currentContext)
      const previous = modifier.modifySettlementScore
        ? { score: 0 }
        : modifier.modifyScore!(previousContext)
      const baseDelta = modifier.modifySettlementScore ? current.score : current.score - previous.score
      const multDelta = modifier.modifySettlementScore
        ? current.multDelta ?? 0
        : (current.multDelta ?? 0) - (previous.multDelta ?? 0)
      const xMult = modifier.modifySettlementScore
        ? current.xMult
        : (current.xMult ?? 1) > (previous.xMult ?? 1) ? current.xMult : undefined
      jokerPoints += modifier.modifySettlementScore ? baseDelta : current.score
      jokerMultiplier += current.multDelta ?? 0
      jokerFinalMultiplier *= current.xMult ?? 1
      if (baseDelta > 0 || multDelta > 0 || xMult) {
        events.push({
          id: `joker-${modifier.id}-${index}`,
          sourceType: 'joker',
          sourceId: modifier.id,
          label: modifier.name,
          baseDelta: baseDelta > 0 ? baseDelta : undefined,
          multDelta: multDelta > 0 ? multDelta : undefined,
          xMult,
          emphasis: 'strong',
        })
      }
    })

  const currentYaku = yakuValues(cards)
  const previousYaku = yakuValues(previousCards)
  for (const [id, yaku] of currentYaku) {
    const delta = yaku.value - (previousYaku.get(id)?.value ?? 0)
    if (delta > 0) {
      events.push({
        id: `yaku-${id}-${yaku.value}`,
        sourceType: 'yaku',
        sourceId: id,
        label: `${yaku.label} 완성`,
        multDelta: delta,
        emphasis: 'strong',
      })
    }
  }

  const ruleBonus = input.ruleBonus ?? 0
  const previousRuleBonus = input.previousRuleBonus ?? ruleBonus
  if (ruleBonus > previousRuleBonus) {
    events.push({
      id: `yaku-rule-${ruleBonus}`,
      sourceType: 'yaku',
      sourceId: 'rule-bonus',
      label: '특수 규칙',
      multDelta: ruleBonus - previousRuleBonus,
      emphasis: 'strong',
    })
  }

  const goCount = input.goCount ?? 0
  const previousGoCount = input.previousGoCount ?? goCount
  const finalMultiplier = getGoFinalMultiplier(goCount) * jokerFinalMultiplier
  if (goCount > previousGoCount) {
    events.push({
      id: `go-${goCount}`,
      sourceType: 'go',
      sourceId: `${goCount}-go`,
      label: `${goCount}고`,
      xMult: finalMultiplier,
      emphasis: 'critical',
    })
  }

  const cardPoints = cards.reduce((sum, card) => sum + getCardPoints(card), 0)
  const yakuMultiplier = evaluatePatterns(cards).totalScore
  const multiplier = 1 + yakuMultiplier + jokerMultiplier + ruleBonus
  const basePoints = cardPoints + jokerPoints
  return {
    cardPoints,
    jokerPoints,
    basePoints,
    baseMultiplier: 1,
    yakuMultiplier,
    jokerMultiplier,
    ruleMultiplier: ruleBonus,
    multiplier,
    finalMultiplier,
    total: basePoints * multiplier * finalMultiplier,
    events,
  }
}
