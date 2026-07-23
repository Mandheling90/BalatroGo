import { describe, expect, it } from 'vitest'
import { createDeck } from '../core/cards/deck'
import { createNewGame } from './setup'
import { resolveGameTurn, shouldGameOverAfterTurn } from './resolve-turn'

describe('고 이후 턴 종료 판정', () => {
  it('고 이후 다음 턴에 목표 점수를 못 내면 손패가 남아 있어도 게임오버다', () => {
    expect(shouldGameOverAfterTurn(1, false, 6)).toBe(true)
  })

  it('고 이후 다음 턴에 목표 점수를 내면 게임오버가 아니다', () => {
    expect(shouldGameOverAfterTurn(1, true, 6)).toBe(false)
  })

  it('고를 하지 않았다면 손패가 남아 있는 동안 계속 진행한다', () => {
    expect(shouldGameOverAfterTurn(0, false, 6)).toBe(false)
    expect(shouldGameOverAfterTurn(0, false, 0)).toBe(true)
  })
})

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

  it('목표 화점을 달성하면 고스톱 선택 없이 블라인드를 종료한다', () => {
    const monthCards = createDeck().filter((card) => card.month === 1)
    const reveal = createDeck().find((card) => card.month === 2)!
    const state = {
      ...createNewGame(),
      phase: 'playing' as const,
      target: 10,
      hand: [monthCards[1]],
      deck: [reveal],
      table: [monthCards[0]],
      captured: [],
      selected: monthCards[1].id,
    }

    const result = resolveGameTurn(state)
    expect(result.pendingPhase).toBe('shop')
    expect(result.blindHistory[0]).toBe('cleared')
    expect(result.awaitingGoStop).toBe(false)
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
