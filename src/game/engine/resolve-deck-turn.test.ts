import { describe, expect, it } from 'vitest'
import { createDeck } from '../core/cards/deck'
import { resolveDeckTurn } from './resolve-deck-turn'
import { resolveGameTurn } from './resolve-turn'
import { createNewGame } from './setup'

describe('중앙 덱 턴', () => {
  it('한 턴을 사용해 두 장을 매칭 없이 바닥에 놓는다', () => {
    const monthOne = createDeck().filter((card) => card.month === 1)
    const monthTwo = createDeck().filter((card) => card.month === 2)
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [],
      deck: [monthOne[1], monthTwo[1]],
      table: [monthOne[0], monthTwo[0]],
      captured: [],
      turnsUsed: 2,
    }

    const result = resolveDeckTurn(state)
    expect(result.turnsUsed).toBe(3)
    expect(result.deck).toHaveLength(0)
    expect(result.table).toHaveLength(4)
    expect(result.captured).toHaveLength(0)
    expect(result.lastScoreEvents).toHaveLength(0)
  })

  it('배치 결과 같은 월 네 장이 되면 그 월의 카드만 획득한다', () => {
    const monthOne = createDeck().filter((card) => card.month === 1)
    const monthTwo = createDeck().filter((card) => card.month === 2)
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [],
      deck: [monthOne[2], monthOne[3]],
      table: [monthOne[0], monthOne[1], monthTwo[0]],
      captured: [],
      turnsUsed: 0,
    }

    const result = resolveDeckTurn(state)
    expect(result.captured).toEqual(expect.arrayContaining(monthOne))
    expect(result.captured).toHaveLength(4)
    expect(result.table).toEqual([monthTwo[0]])
    expect(result.lastScoreEvents.filter((event) => event.sourceType === 'card')).toHaveLength(4)
  })

  it('연속으로 사용할 수 없고 카드 제출 이후 다시 사용할 수 있다', () => {
    const deck = createDeck()
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [deck[4]],
      deck: deck.slice(0, 4),
      table: [],
      captured: [],
      turnsUsed: 0,
    }

    const firstDeckTurn = resolveDeckTurn(state)
    expect(firstDeckTurn.lastTurnAction).toBe('deck')
    expect(resolveDeckTurn(firstDeckTurn)).toBe(firstDeckTurn)

    const cardTurn = resolveGameTurn({ ...firstDeckTurn, selected: firstDeckTurn.hand[0].id })
    expect(cardTurn.lastTurnAction).toBe('card')
    expect(resolveDeckTurn(cardTurn).lastTurnAction).toBe('deck')
  })

  it('고 이후 덱을 펼쳐 아무 패도 획득하지 못하면 고 실패 확인을 기다린다', () => {
    const deck = createDeck()
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      target: 999,
      scoreTotal: 10,
      goCount: 1,
      goRequiredScore: 99,
      hand: [deck[4]],
      deck: deck.slice(0, 4),
      table: [],
      captured: [],
      turnsUsed: 2,
    }

    const result = resolveDeckTurn(state)

    expect(result.pendingPhase).toBeNull()
    expect(result.gameOverReason).toBeNull()
    expect(result.lastTurnAction).toBe('deck')
    expect(result.awaitingGoFailureAck).toBe(true)
    expect(result.lastTurnScore).toBe(0)
    expect(result.goCount).toBe(0)
    expect(result.hand).toHaveLength(1)
  })
})
