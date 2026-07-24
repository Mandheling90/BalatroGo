import { describe, expect, it } from 'vitest'
import { canChooseGo, chooseGo, chooseStop } from './go-stop'
import { createNewGame } from './setup'

describe('고 선택 가능 여부', () => {
  it('고/스톱 대기 중이고 손패가 남아 있을 때만 고를 선택할 수 있다', () => {
    expect(canChooseGo({ awaitingGoStop: true, hand: [{} as never], deck: [], turnsUsed: 9, unlimitedTurns: false })).toBe(true)
    expect(canChooseGo({ awaitingGoStop: true, hand: [], deck: [{} as never], turnsUsed: 9, unlimitedTurns: false })).toBe(true)
    expect(canChooseGo({ awaitingGoStop: true, hand: [], deck: [], turnsUsed: 9, unlimitedTurns: false })).toBe(false)
    expect(canChooseGo({ awaitingGoStop: true, hand: [{} as never], deck: [], turnsUsed: 10, unlimitedTurns: false })).toBe(false)
    expect(canChooseGo({ awaitingGoStop: false, hand: [{} as never], deck: [], turnsUsed: 9, unlimitedTurns: false })).toBe(false)
    expect(canChooseGo({ awaitingGoStop: true, hand: [{} as never], deck: [], turnsUsed: 99, unlimitedTurns: true })).toBe(true)
  })

  it('고를 선택해도 코인을 지급하지 않는다', () => {
    const state = { ...createNewGame(), awaitingGoStop: true, phase: 'playing' as const }
    expect(chooseGo(state).coins).toBe(state.coins)
  })

  it('스톱을 선택하면 고 횟수와 진행 기준을 초기화한다', () => {
    const state = {
      ...createNewGame(),
      awaitingGoStop: true,
      phase: 'playing' as const,
      goCount: 2,
      goRequiredScore: 7,
    }
    const result = chooseStop(state)

    expect(result.awaitingGoStop).toBe(false)
    expect(result.goCount).toBe(0)
    expect(result.goRequiredScore).toBe(0)
  })
})
