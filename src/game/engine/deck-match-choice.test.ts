import { describe, expect, it } from 'vitest'
import { createDeck } from '../core/cards/deck'
import { getDeckMatchCandidates, resolveGameTurn } from './resolve-turn'
import { createNewGame } from './setup'

describe('revealed deck card match choice', () => {
  it('returns both floor candidates for a revealed card with two matches', () => {
    const january = createDeck().filter((card) => card.month === 1)
    const february = createDeck().filter((card) => card.month === 2)
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [february[0]],
      deck: [january[2]],
      table: [january[0], january[1]],
      captured: [],
      selected: february[0].id,
    }

    expect(getDeckMatchCandidates(state).map((card) => card.id)).toEqual([
      january[0].id,
      january[1].id,
    ])
  })

  it('captures the floor card selected for the revealed deck card', () => {
    const january = createDeck().filter((card) => card.month === 1)
    const february = createDeck().filter((card) => card.month === 2)
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [february[0]],
      deck: [january[2]],
      table: [january[0], january[1]],
      captured: [],
      selected: february[0].id,
    }

    const result = resolveGameTurn(state, undefined, january[1].id)

    expect(result.captured.map((card) => card.id)).toContain(january[1].id)
    expect(result.table.map((card) => card.id)).toContain(january[0].id)
  })
})
