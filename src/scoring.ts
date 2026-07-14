import { defaultScoringOptions, patternDefinitions, PatternDefinition, ScoringOptions, specialRuleDefinitions } from './scoring-config'

export interface ScoringCard {
  id: string
  definitionId: string
  month: number
  kind: string
  piValue?: number
}

export interface CompletedPattern {
  id: string
  name: string
  score: number
  cardIds: string[]
}

export interface ScoreEvaluation {
  totalScore: number
  completedPatterns: CompletedPattern[]
  countScores: { ribbon: number; animal: number; junk: number }
  counts: { ribbon: number; animal: number; junk: number; gwang: number }
  multipliers: Array<{ id: string; name: string; value: number }>
}

const isRibbon = (card: ScoringCard) => card.kind.startsWith('ribbon')

export function evaluatePatterns(
  cards: ScoringCard[],
  options: ScoringOptions = defaultScoringOptions,
  definitions: PatternDefinition[] = patternDefinitions,
): ScoreEvaluation {
  const dualPiIds = new Set([
    ...(options.useMayAnimalAsDoublePi ? ['may-animal'] : []),
    ...(options.useSeptemberAnimalAsDoublePi ? ['sep-animal'] : []),
  ])
  const gwangCards = cards.filter((card) => card.kind === 'gwang')
  const ribbonCards = cards.filter((card) => isRibbon(card) && (options.includeRainRibbon || card.definitionId !== 'dec-rain-ribbon'))
  const animalCards = cards.filter((card) => card.kind === 'animal' && !dualPiIds.has(card.definitionId))
  const junkCards = cards.filter((card) => card.kind === 'pi' || dualPiIds.has(card.definitionId))
  const junkCount = junkCards.reduce((sum, card) => {
    if (card.definitionId === 'bonus-pi') return sum + options.bonusCardPiValue
    if (dualPiIds.has(card.definitionId)) return sum + 2
    return sum + (card.piValue ?? 1)
  }, 0)
  const byDefinitionId = new Map(cards.map((card) => [card.definitionId, card]))
  const categoryCards: Record<string, ScoringCard[]> = { gwang: gwangCards, ribbon: ribbonCards, animal: animalCards, junk: junkCards }
  const completed: Array<CompletedPattern & { exclusiveGroup?: string; priority: number; stackable: boolean }> = []
  const countScores = { ribbon: 0, animal: 0, junk: 0 }

  for (const definition of definitions.filter((item) => item.enabled)) {
    const candidates = categoryCards[definition.category] ?? []
    const effectiveCount = definition.category === 'junk' ? junkCount : candidates.length
    const required = definition.requiredCardIds ?? []
    const hasRequired = required.every((id) => byDefinitionId.has(id) && candidates.some((card) => card.definitionId === id))
    const hasForbidden = (definition.forbiddenCardIds ?? []).some((id) => candidates.some((card) => card.definitionId === id))
    const meetsCount = effectiveCount >= (definition.minimumCount ?? required.length)
    if (!hasRequired || hasForbidden || !meetsCount) continue
    const count = effectiveCount
    if (count < (definition.minimumCount ?? 0)) continue
    const score = definition.baseScore + Math.max(0, count - (definition.minimumCount ?? count)) * definition.scorePerExtraCard
    if (definition.id === 'ribbon-count') countScores.ribbon = score
    else if (definition.id === 'animal-count') countScores.animal = score
    else if (definition.id === 'junk-count') countScores.junk = score
    else completed.push({
      id: definition.id,
      name: definition.name,
      score,
      cardIds: required.length ? required.map((id) => byDefinitionId.get(id)!.id) : candidates.slice(0, definition.minimumCount).map((card) => card.id),
      exclusiveGroup: definition.exclusiveGroup,
      priority: definition.priority,
      stackable: definition.stackable,
    })
  }

  const selectedPatterns = completed.filter((pattern) => {
    if (!pattern.exclusiveGroup) return true
    const group = completed.filter((candidate) => candidate.exclusiveGroup === pattern.exclusiveGroup)
    return group.sort((a, b) => b.priority - a.priority)[0]?.id === pattern.id
  })
  const completedPatterns = selectedPatterns.map(({ exclusiveGroup: _exclusiveGroup, priority: _priority, stackable: _stackable, ...pattern }) => pattern)
  const patternScore = completedPatterns.reduce((sum, pattern) => sum + pattern.score, 0)
  const countScore = countScores.ribbon + countScores.animal + countScores.junk
  const multipliers = specialRuleDefinitions.filter((rule) => rule.enabled && rule.multiplier).map((rule) => ({ id: rule.id, name: rule.name, value: rule.multiplier! }))

  return {
    totalScore: patternScore + countScore,
    completedPatterns,
    countScores,
    counts: { ribbon: ribbonCards.length, animal: animalCards.length, junk: junkCount, gwang: gwangCards.length },
    multipliers,
  }
}
