import { describe, expect, it } from 'vitest'
import type { CardKind, HwatuCard } from './game/core/cards/types'
import { scoreCaptured } from './game'

const card = (definitionId: string, kind: CardKind, month: number): HwatuCard => ({
  id: `instance-${definitionId}`,
  instanceId: `instance-${definitionId}`,
  definitionId,
  month,
  kind,
  title: definitionId,
  flower: '',
  symbol: '',
  spriteRow: 0,
  spriteColumn: 0,
  chips: 0,
})

describe('획득패 요약 점수', () => {
  it('goScore에는 화점 부적과 흔들기 보너스를 섞지 않는다', () => {
    const cards = [
      card('jan-red-ribbon', 'ribbon-red', 1),
      card('feb-red-ribbon', 'ribbon-red', 2),
      card('mar-red-ribbon', 'ribbon-red', 3),
    ]

    const result = scoreCaptured(cards, ['flower-shoes', 'yaku-bell'], 5, ['흔들기 +5점'])

    expect(result.goScore).toBe(3)
  })

  it('신명 방울은 상시 상태 배수에는 포함되지 않는다', () => {
    const cards = [
      card('jan-red-ribbon', 'ribbon-red', 1),
      card('feb-red-ribbon', 'ribbon-red', 2),
      card('mar-red-ribbon', 'ribbon-red', 3),
    ]

    const result = scoreCaptured(cards, ['yaku-bell'])

    expect(result.multiplier).toBe(4)
  })
})
