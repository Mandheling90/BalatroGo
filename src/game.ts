import { evaluatePatterns } from './scoring'
import { applyScoreModifiers } from './game/modifiers/apply-score-modifiers'
import { charms } from './game/modifiers/charms'
import { HwatuCard } from './game/core/cards/types'

export type { CardKind, HwatuCard, CardDefinition } from './game/core/cards/types'
export type { Charm } from './game/modifiers/types'
export { cardDefinitions } from './game/core/cards/definitions'
export { createDeck, shuffle } from './game/core/cards/deck'
export { charms }

export interface ScoreResult {
  gwang: number
  animal: number
  ribbon: number
  pi: number
  bonus: number
  total: number
  details: string[]
}

export function scoreCaptured(cards: HwatuCard[], ownedCharmIds: string[], ruleBonus = 0, ruleDetails: string[] = []): ScoreResult {
  const evaluation = evaluatePatterns(cards)
  const patternScore = (ids: string[]) => evaluation.completedPatterns
    .filter((pattern) => ids.includes(pattern.id))
    .reduce((sum, pattern) => sum + pattern.score, 0)
  const gwang = patternScore(['three-brights', 'rain-three-brights', 'four-brights', 'five-brights'])
  const animal = patternScore(['godori']) + evaluation.countScores.animal
  const ribbon = patternScore(['hongdan', 'cheongdan', 'chodan']) + evaluation.countScores.ribbon
  const pi = evaluation.countScores.junk
  const baseDetails = [
    ...evaluation.completedPatterns.map((pattern) => `${pattern.name} ${pattern.score}점`),
    ...(evaluation.countScores.animal ? [`열끗 ${evaluation.countScores.animal}점`] : []),
    ...(evaluation.countScores.ribbon ? [`띠 ${evaluation.countScores.ribbon}점`] : []),
    ...(evaluation.countScores.junk ? [`피 ${evaluation.countScores.junk}점`] : []),
  ]
  const modifierResult = applyScoreModifiers(ownedCharmIds, {
    cards,
    counts: {
      gwang: evaluation.counts.gwang,
      ribbon: evaluation.counts.ribbon,
      junk: evaluation.counts.junk,
      bird: cards.filter((card) => card.bird).length,
      completedMonths: new Set(cards.filter((card) => card.month >= 1).map((card) => card.month)).size,
    },
  })
  const bonus = modifierResult.score + ruleBonus
  return {
    gwang,
    animal,
    ribbon,
    pi,
    bonus,
    total: gwang + animal + ribbon + pi + bonus,
    details: [...baseDetails, ...modifierResult.details, ...ruleDetails],
  }
}
