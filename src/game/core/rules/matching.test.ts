import { describe, expect, it } from 'vitest'
import { createDeck } from '../cards/deck'
import { matchPlayedCard } from './matching'

describe('month matching', () => {
  it('keeps an unmatched card on the floor', () => {
    const [played] = createDeck().filter((card) => card.month === 1)
    const result = matchPlayedCard([], played)
    expect(result.table).toEqual([played])
    expect(result.captured).toEqual([])
  })

  it('honors the selected floor card when two matches exist', () => {
    const [played, first, second] = createDeck().filter((card) => card.month === 1)
    const result = matchPlayedCard([first, second], played, second.id)
    expect(result.captured).toEqual([played, second])
    expect(result.table).toEqual([first])
  })
})
