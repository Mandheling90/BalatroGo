import { describe, expect, it } from 'vitest'
import { canChooseGo } from './go-stop'

describe('고 선택 가능 여부', () => {
  it('고/스톱 대기 중이고 손패가 남아 있을 때만 고를 선택할 수 있다', () => {
    expect(canChooseGo({ awaitingGoStop: true, hand: [{} as never] })).toBe(true)
    expect(canChooseGo({ awaitingGoStop: true, hand: [] })).toBe(false)
    expect(canChooseGo({ awaitingGoStop: false, hand: [{} as never] })).toBe(false)
  })
})
