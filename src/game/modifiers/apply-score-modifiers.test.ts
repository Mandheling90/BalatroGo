import { describe, expect, it } from 'vitest'
import { applyScoreModifiers } from './apply-score-modifiers'

const context = {
  cards: [],
  yakuScore: 0,
  completedPatternIds: [],
  counts: { gwang: 2, ribbon: 3, junk: 7, bird: 0, completedMonths: 0, completeMonthSets: 0 },
}

describe('rule modifier pipeline', () => {
  it('leaves core scoring unchanged without an enabled modifier', () => {
    expect(applyScoreModifiers([], context)).toEqual({ score: 0, details: [] })
  })

  it('applies only explicitly owned charms', () => {
    const result = applyScoreModifiers(['gwang', 'pi'], context)
    expect(result.score).toBe(2)
    expect(result.details).toEqual(['광명부 1점', '피바람 1점'])
  })
})
