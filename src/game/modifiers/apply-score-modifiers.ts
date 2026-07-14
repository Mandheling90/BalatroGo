import { charmModifiers } from './charms'
import { ScoreModifierContext } from './types'

export function applyScoreModifiers(ownedIds: string[], context: ScoreModifierContext) {
  const results = charmModifiers
    .filter((modifier) => ownedIds.includes(modifier.id) && modifier.modifyScore)
    .sort((a, b) => a.priority - b.priority)
    .map((modifier) => modifier.modifyScore!(context))
  return {
    score: results.reduce((sum, result) => sum + result.score, 0),
    details: results.flatMap((result) => result.detail ? [result.detail] : []),
  }
}
