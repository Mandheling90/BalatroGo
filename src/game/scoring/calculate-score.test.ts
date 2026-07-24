import { describe, expect, it } from 'vitest'
import type { CardKind, HwatuCard } from '../core/cards/types'
import { calculateBalatroScore, getCardPoints, getSettlementScore } from './calculate-score'

const card = (definitionId: string, kind: CardKind, month = 1, piValue?: number): HwatuCard => ({
  id: `instance-${definitionId}`,
  instanceId: `instance-${definitionId}`,
  definitionId,
  month,
  kind,
  piValue,
  title: definitionId,
  flower: '',
  symbol: '',
  spriteRow: 0,
  spriteColumn: 0,
  chips: 0,
})

describe('Balatro-style score calculation', () => {
  it('uses configured points for every card class and pi value', () => {
    expect(getCardPoints(card('pi', 'pi'))).toBe(5)
    expect(getCardPoints(card('double-pi', 'pi', 1, 2))).toBe(10)
    expect(getCardPoints(card('triple-pi', 'pi', 1, 3))).toBe(15)
    expect(getCardPoints(card('ribbon', 'ribbon-plain'))).toBe(10)
    expect(getCardPoints(card('animal', 'animal'))).toBe(20)
    expect(getCardPoints(card('gwang', 'gwang'))).toBe(30)
  })

  it('scores each newly captured card once even when input contains a duplicate', () => {
    const pi = card('pi', 'pi')
    const animal = card('animal', 'animal')
    const result = calculateBalatroScore({ cards: [pi, pi, animal], previousCards: [] })
    expect(result.cardPoints).toBe(25)
    expect(result.events.filter((event) => event.sourceType === 'card')).toHaveLength(2)
  })

  it('returns card, joker, then newly completed yaku events', () => {
    const previousCards = [
      card('jan-red-ribbon', 'ribbon-red', 1),
      card('feb-red-ribbon', 'ribbon-red', 2),
      ...Array.from({ length: 6 }, (_, index) => card(`pi-${index}`, 'pi', index + 1)),
    ]
    const cards = [...previousCards, card('mar-red-ribbon', 'ribbon-red', 3), card('pi-6', 'pi', 7)]
    const result = calculateBalatroScore({ cards, previousCards, ownedCharmIds: ['pi'] })
    expect(result.events.map((event) => event.sourceType)).toEqual(['card', 'card', 'joker', 'yaku'])
    expect(result.events.at(-1)).toMatchObject({ sourceId: 'hongdan', multDelta: 3 })
  })

  it('applies the separated base, additive, and final multipliers', () => {
    const cards = [
      card('jan-red-ribbon', 'ribbon-red', 1),
      card('feb-red-ribbon', 'ribbon-red', 2),
      card('mar-red-ribbon', 'ribbon-red', 3),
    ]
    const result = calculateBalatroScore({ cards, goCount: 2, previousGoCount: 1 })
    expect(result.basePoints).toBe(30)
    expect(result.multiplier).toBe(4)
    expect(result.finalMultiplier).toBe(3)
    expect(result.total).toBe(360)
    expect(result.events.at(-1)).toMatchObject({ sourceType: 'go', xMult: 3 })
  })

  it('applies a completed yaku multiplier only to points earned in this settlement', () => {
    const previousCards = [
      card('jan-red-ribbon', 'ribbon-red', 1),
      card('feb-red-ribbon', 'ribbon-red', 2),
    ]
    const result = calculateBalatroScore({
      cards: [...previousCards, card('mar-red-ribbon', 'ribbon-red', 3)],
      previousCards,
    })

    expect(result.cardPoints).toBe(30)
    expect(result.multiplier).toBe(4)
    expect(getSettlementScore(result)).toEqual({ basePoints: 10, score: 40 })
  })
})
