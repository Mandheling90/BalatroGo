import { describe, expect, it } from 'vitest'
import type { CardKind, HwatuCard } from '../core/cards/types'
import { calculateBalatroScore, getCardPoints, getSettlementScore } from './calculate-score'
import { getGoAdditiveMultiplier, getGoFinalMultiplier } from './score-config'

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

  it.each([
    { goCount: 1, multiplier: 5, finalMultiplier: 1, total: 150, multDelta: 1, xMult: undefined },
    { goCount: 2, multiplier: 6, finalMultiplier: 1, total: 180, multDelta: 2, xMult: undefined },
    { goCount: 3, multiplier: 4, finalMultiplier: 2, total: 240, multDelta: undefined, xMult: 2 },
    { goCount: 4, multiplier: 4, finalMultiplier: 3, total: 360, multDelta: undefined, xMult: 3 },
  ])('$goCount고 효과를 정산 단계에 맞게 적용한다', ({
    goCount,
    multiplier,
    finalMultiplier,
    total,
    multDelta,
    xMult,
  }) => {
    const cards = [
      card('jan-red-ribbon', 'ribbon-red', 1),
      card('feb-red-ribbon', 'ribbon-red', 2),
      card('mar-red-ribbon', 'ribbon-red', 3),
    ]
    const result = calculateBalatroScore({ cards, goCount, previousGoCount: 0 })
    expect(result.basePoints).toBe(30)
    expect(result.multiplier).toBe(multiplier)
    expect(result.finalMultiplier).toBe(finalMultiplier)
    expect(result.total).toBe(total)
    expect(result.events.at(-1)).toMatchObject({ sourceType: 'go', multDelta, xMult })
  })

  it('1·2고는 가산 배수, 3고 이상은 최종 배수 설정을 가져온다', () => {
    expect([0, 1, 2, 3, 4, 5].map(getGoAdditiveMultiplier)).toEqual([0, 1, 2, 0, 0, 0])
    expect([0, 1, 2, 3, 4, 5].map(getGoFinalMultiplier)).toEqual([1, 1, 1, 2, 3, 4])
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

  it('새 화점 부적은 족보 점수가 아니라 이번 턴 기본 화점만 올린다', () => {
    const cards = Array.from({ length: 4 }, (_, index) => card(`month-one-pi-${index}`, 'pi', 1))
    const result = calculateBalatroScore({
      cards,
      previousCards: [],
      ownedCharmIds: ['flower-shoes', 'pi-pouch', 'sweep-fan', 'moon-mirror'],
    })

    expect(result.yakuMultiplier).toBe(0)
    expect(result.events.filter((event) => event.sourceType === 'joker').map((event) => event.baseDelta)).toEqual([5, 12, 25, 30])
    expect(getSettlementScore(result)).toEqual({ basePoints: 92, score: 92 })
  })

  it('광채석은 이번 턴 새로 획득한 광에만 15 화점을 더한다', () => {
    const previousCards = [card('jan-gwang', 'gwang', 1)]
    const result = calculateBalatroScore({
      cards: [...previousCards, card('mar-gwang', 'gwang', 3)],
      previousCards,
      ownedCharmIds: ['bright-stone'],
    })

    expect(result.events.find((event) => event.sourceId === 'bright-stone')).toMatchObject({ baseDelta: 15 })
    expect(getSettlementScore(result).basePoints).toBe(45)
  })

  it('쌍화전은 보너스 피를 제외한 일반패를 정확히 2장 획득했을 때 발동한다', () => {
    const pair = [card('jan-pi-1', 'pi', 1), card('jan-pi-2', 'pi', 1)]
    const bonusPi = card('bonus-pi', 'pi', -1)
    const result = calculateBalatroScore({
      cards: [...pair, bonusPi],
      previousCards: [],
      ownedCharmIds: ['twin-flowers'],
    })

    expect(result.events.find((event) => event.sourceId === 'twin-flowers')).toMatchObject({ baseDelta: 15 })
    expect(getSettlementScore(result).basePoints).toBe(30)
  })

  it('쌍화전은 일반패를 4장 획득하면 발동하지 않는다', () => {
    const result = calculateBalatroScore({
      cards: Array.from({ length: 4 }, (_, index) => card(`jan-pi-${index}`, 'pi', 1)),
      previousCards: [],
      ownedCharmIds: ['twin-flowers'],
    })

    expect(result.events.some((event) => event.sourceId === 'twin-flowers')).toBe(false)
    expect(getSettlementScore(result).basePoints).toBe(20)
  })

  it('족보 강화 부적은 족보 총점을 바꾸지 않고 일반 배수만 강화한다', () => {
    const previousCards = [
      card('jan-red-ribbon', 'ribbon-red', 1),
      card('feb-red-ribbon', 'ribbon-red', 2),
    ]
    const result = calculateBalatroScore({
      cards: [...previousCards, card('mar-red-ribbon', 'ribbon-red', 3)],
      previousCards,
      ownedCharmIds: ['yaku-scroll', 'three-ribbon-seal', 'yaku-bell'],
    })

    expect(result.yakuMultiplier).toBe(3)
    expect(result.jokerMultiplier).toBe(5)
    expect(result.multiplier).toBe(9)
    expect(result.events.filter((event) => event.sourceType === 'joker').map((event) => event.multDelta)).toEqual([1, 2, 2])
    expect(getSettlementScore(result)).toEqual({ basePoints: 10, score: 90 })
  })

  it('신명 방울은 화점만 증가하고 족보 총점이 그대로면 발동하지 않는다', () => {
    const previousCards = [card('jan-pi', 'pi', 1)]
    const result = calculateBalatroScore({
      cards: [...previousCards, card('feb-pi', 'pi', 2)],
      previousCards,
      ownedCharmIds: ['yaku-bell'],
    })

    expect(result.yakuMultiplier).toBe(0)
    expect(result.jokerMultiplier).toBe(0)
    expect(result.events.some((event) => event.sourceId === 'yaku-bell')).toBe(false)
  })

  it('쌍월경은 같은 월 카드를 4장 완성한 증가분에만 화점을 준다', () => {
    const firstThree = Array.from({ length: 3 }, (_, index) => card(`jan-pi-${index}`, 'pi', 1))
    const beforeCompletion = calculateBalatroScore({
      cards: firstThree,
      previousCards: [],
      ownedCharmIds: ['moon'],
    })
    const completed = calculateBalatroScore({
      cards: [...firstThree, card('jan-pi-3', 'pi', 1)],
      previousCards: firstThree,
      ownedCharmIds: ['moon'],
    })

    expect(beforeCompletion.events.some((event) => event.sourceId === 'moon')).toBe(false)
    expect(completed.events.find((event) => event.sourceId === 'moon')).toMatchObject({ baseDelta: 1 })
  })
})
