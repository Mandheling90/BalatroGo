import { describe, expect, it } from 'vitest'
import { shouldGameOverAfterTurn } from './resolve-turn'

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
