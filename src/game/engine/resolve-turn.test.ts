import { describe, expect, it } from 'vitest'
import { createDeck } from '../core/cards/deck'
import { createNewGame } from './setup'
import { resolveGameTurn } from './resolve-turn'

describe('뻑 이후 진행', () => {
  it('뻑이 발생해도 손패와 덱을 소모하고 다음 턴을 진행할 수 있다', () => {
    const monthCards = createDeck().filter((card) => card.month === 1)
    const nextCard = createDeck().find((card) => card.month === 2)!
    const secondReveal = createDeck().find((card) => card.month === 3)!
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [monthCards[1], nextCard],
      deck: [monthCards[2], secondReveal],
      table: [monthCards[0]],
      captured: [],
      selected: monthCards[1].id,
    }

    const peok = resolveGameTurn(state)
    expect(peok.lastRuleEffect).toBe('peok')
    expect(peok.hand).toEqual([nextCard])
    expect(peok.deck).toEqual([secondReveal])
    expect(peok.table.filter((card) => card.month === 1)).toHaveLength(3)
    expect(peok.selected).toBeNull()

    const continued = resolveGameTurn({ ...peok, selected: nextCard.id })
    expect(continued.hand).toHaveLength(0)
  })

  it('서로 다른 월에서 뻑이 연속 발생해도 두 번째 손패와 덱을 정상 소모한다', () => {
    const january = createDeck().filter((card) => card.month === 1)
    const february = createDeck().filter((card) => card.month === 2)
    const initial = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [january[1], february[1]],
      deck: [january[2], february[2]],
      table: [january[0], february[0]],
      captured: [],
      selected: january[1].id,
    }

    const firstPeok = resolveGameTurn(initial)
    const secondPeok = resolveGameTurn({ ...firstPeok, selected: february[1].id })

    expect(firstPeok.lastRuleEffect).toBe('peok')
    expect(secondPeok.lastRuleEffect).toBe('peok')
    expect(secondPeok.hand).toHaveLength(0)
    expect(secondPeok.deck).toHaveLength(0)
    expect(secondPeok.turnsUsed).toBe(2)
    expect(secondPeok.selected).toBeNull()
  })

  it('고를 선언한 상태에서 뻑이 나면 패가 남아 있어도 즉시 고 실패로 처리한다', () => {
    const monthCards = createDeck().filter((card) => card.month === 1)
    const nextHand = createDeck().find((card) => card.month === 2)!
    const nextDeck = createDeck().find((card) => card.month === 3)!
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      target: 9999,
      scoreTotal: 100,
      goCount: 1,
      goRequiredScore: 3,
      hand: [monthCards[1], nextHand],
      deck: [monthCards[2], nextDeck],
      table: [monthCards[0]],
      captured: [],
      selected: monthCards[1].id,
    }

    const result = resolveGameTurn(state)

    expect(result.lastRuleEffect).toBe('peok')
    expect(result.pendingPhase).toBeNull()
    expect(result.lastTurnScore).toBe(0)
    expect(result.scoreTotal).toBe(100)
    expect(result.goCount).toBe(0)
    expect(result.goRequiredScore).toBe(0)
    expect(result.awaitingGoStop).toBe(false)
    expect(result.message).toContain('고 실패')
    expect(result.hand).toEqual([nextHand])
    expect(result.deck).toEqual([nextDeck])
  })

  it('카드 제출 턴에는 덱에서 한 장만 공개한다', () => {
    const monthCards = createDeck().filter((card) => card.month === 1)
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [monthCards[1]],
      deck: [monthCards[2], monthCards[3]],
      table: [monthCards[0]],
      captured: [],
      selected: monthCards[1].id,
    }

    const result = resolveGameTurn(state)
    expect(result.deck).toEqual([monthCards[3]])
    expect(result.table.filter((card) => card.month === 1)).toHaveLength(3)
    expect(result.captured.filter((card) => card.month === 1)).toHaveLength(0)
  })

  it('목표 화점을 달성하면 고 선택 없이 블라인드를 클리어한다', () => {
    const monthCards = createDeck().filter((card) => card.month === 1)
    const reveal = createDeck().find((card) => card.month === 2)!
    const nextReveal = createDeck().find((card) => card.month === 3)!
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      target: 10,
      hand: [monthCards[1]],
      deck: [reveal, nextReveal],
      table: [monthCards[0]],
      captured: [],
      selected: monthCards[1].id,
    }

    const result = resolveGameTurn(state)
    expect(result.pendingPhase).toBe('shop')
    expect(result.blindHistory[0]).toBe('cleared')
    expect(result.awaitingGoStop).toBe(false)
  })

  it('목표 화점 미달이어도 고스톱 요구 점수를 달성하면 고 선택을 기다린다', () => {
    const deck = createDeck()
    const januaryRibbon = deck.find((card) => card.definitionId === 'jan-red-ribbon')!
    const februaryRibbon = deck.find((card) => card.definitionId === 'feb-red-ribbon')!
    const marchRibbon = deck.find((card) => card.definitionId === 'mar-red-ribbon')!
    const marchMatch = deck.find((card) => card.month === 3 && card.id !== marchRibbon.id)!
    const reveal = deck.find((card) => card.month === 4)!
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      target: 9999,
      goRequiredScore: 3,
      hand: [marchRibbon],
      deck: [reveal, deck.find((card) => card.month === 5)!],
      table: [marchMatch],
      captured: [januaryRibbon, februaryRibbon],
      selected: marchRibbon.id,
    }

    const result = resolveGameTurn(state)

    expect(result.pendingPhase).toBeNull()
    expect(result.awaitingGoStop).toBe(true)
  })

  it('고 상태에서 덱이 소진될 때 족보가 진전되지 않으면 이번 턴을 0점 처리하고 고를 초기화한다', () => {
    const deck = createDeck()
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      target: 1,
      scoreTotal: 10,
      goCount: 1,
      goRequiredScore: 99,
      hand: [deck[0]],
      deck: [deck[4]],
      table: [],
      captured: [],
      selected: deck[0].id,
    }

    const result = resolveGameTurn(state)

    expect(result.pendingPhase).toBeNull()
    expect(result.awaitingGoStop).toBe(false)
    expect(result.gameOverReason).toBeNull()
    expect(result.lastTurnScore).toBe(0)
    expect(result.scoreTotal).toBe(10)
    expect(result.goCount).toBe(0)
    expect(result.goRequiredScore).toBe(0)
  })

  it('고 상태에서 아무 패도 획득하지 못하면 진행 가능한 패가 남아 있어도 고 실패 확인을 기다린다', () => {
    const deck = createDeck()
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      target: 9999,
      goCount: 1,
      goRequiredScore: 99,
      hand: [deck[0], deck[1]],
      deck: [deck[4], deck[8]],
      table: [],
      captured: [],
      selected: deck[0].id,
    }

    const result = resolveGameTurn(state)

    expect(result.pendingPhase).toBeNull()
    expect(result.awaitingGoStop).toBe(false)
    expect(result.awaitingGoFailureAck).toBe(true)
    expect(result.lastTurnScore).toBe(0)
    expect(result.goCount).toBe(0)
  })

  it('디버그 무제한 턴에서는 10턴에 도달해도 턴 제한 게임오버가 되지 않는다', () => {
    const deck = createDeck()
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      target: 9999,
      turnsUsed: 9,
      unlimitedTurns: true,
      hand: [deck[0]],
      deck: [deck[4]],
      table: [],
      captured: [],
      selected: deck[0].id,
    }

    const result = resolveGameTurn(state)

    expect(result.turnsUsed).toBe(10)
    expect(result.pendingPhase).toBeNull()
    expect(result.gameOverReason).toBeNull()
  })

  it('쪽에 성공하면 두 장을 획득하고 보너스 피 한 장을 지급한다', () => {
    const monthCards = createDeck().filter((card) => card.month === 1)
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      hand: [monthCards[0]],
      deck: [monthCards[1]],
      table: [],
      captured: [],
      selected: monthCards[0].id,
    }

    const result = resolveGameTurn(state)
    const bonusPi = result.captured.find((card) => card.definitionId === 'bonus-pi')
    expect(result.captured).toHaveLength(3)
    expect(bonusPi?.bonusEvent).toBe('쪽')
    expect(result.lastRuleEffect).toBe('jjok')
    expect(result.lastCapturedIds).toContain(bonusPi?.id)
  })
})
