import { describe, expect, it } from 'vitest'
import { canChooseGo, chooseGo } from './go-stop'
import { createNewGame } from './setup'

describe('고 선택 가능 여부', () => {
  it('고/스톱 대기 중이고 손패가 남아 있을 때만 고를 선택할 수 있다', () => {
    expect(canChooseGo({ awaitingGoStop: true, hand: [{} as never], deck: [], turnsUsed: 9 })).toBe(true)
    expect(canChooseGo({ awaitingGoStop: true, hand: [], deck: [{} as never], turnsUsed: 9 })).toBe(true)
    expect(canChooseGo({ awaitingGoStop: true, hand: [], deck: [], turnsUsed: 9 })).toBe(false)
    expect(canChooseGo({ awaitingGoStop: true, hand: [{} as never], deck: [], turnsUsed: 10 })).toBe(false)
    expect(canChooseGo({ awaitingGoStop: false, hand: [{} as never], deck: [], turnsUsed: 9 })).toBe(false)
  })

  it('고를 선택해도 코인을 지급하지 않는다', () => {
    const state = { ...createNewGame(), awaitingGoStop: true, phase: 'playing' as const }
    expect(chooseGo(state).coins).toBe(state.coins)
  })
})
