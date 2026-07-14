import { describe, expect, it } from 'vitest'
import { cardDefinitions } from './definitions'
import { createDeck } from './deck'

describe('hwatu card data', () => {
  it('keeps 48 stable definitions and creates unique play instances', () => {
    const deck = createDeck()

    expect(cardDefinitions).toHaveLength(48)
    expect(deck).toHaveLength(48)
    expect(new Set(deck.map((card) => card.instanceId)).size).toBe(48)
    expect(deck.every((card) => card.definitionId && card.id === card.instanceId)).toBe(true)
  })

  it('does not use display text or asset positions as rule identifiers', () => {
    const deck = createDeck()
    expect(deck.every((card) => card.definitionId !== card.title)).toBe(true)
    expect(deck.find((card) => card.definitionId === 'feb-bird')?.month).toBe(2)
  })
})
