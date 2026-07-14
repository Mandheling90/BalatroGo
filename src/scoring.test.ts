import { describe, expect, it } from 'vitest'
import { evaluatePatterns, ScoringCard } from './scoring'
import { defaultScoringOptions } from './scoring-config'

const card = (definitionId: string, kind: string, piValue = 1): ScoringCard => ({
  id: `instance-${definitionId}`,
  definitionId,
  month: 1,
  kind,
  piValue,
})

const patternIds = (cards: ScoringCard[]) => evaluatePatterns(cards).completedPatterns.map((pattern) => pattern.id)

describe('광 족보 배타 판정', () => {
  it('비광 없는 세 장은 삼광만 계산한다', () => {
    const result = evaluatePatterns([card('jan-gwang', 'gwang'), card('mar-gwang', 'gwang'), card('aug-gwang', 'gwang')])
    expect(result.totalScore).toBe(3)
    expect(result.completedPatterns.map((pattern) => pattern.id)).toEqual(['three-brights'])
  })

  it('비광 포함 세 장은 비삼광으로 계산한다', () => {
    const result = evaluatePatterns([card('jan-gwang', 'gwang'), card('mar-gwang', 'gwang'), card('dec-rain-gwang', 'gwang')])
    expect(result.totalScore).toBe(2)
    expect(result.completedPatterns.map((pattern) => pattern.id)).toEqual(['rain-three-brights'])
  })

  it('사광은 삼광과 중복되지 않는다', () => {
    const result = evaluatePatterns([card('jan-gwang', 'gwang'), card('mar-gwang', 'gwang'), card('aug-gwang', 'gwang'), card('nov-gwang', 'gwang')])
    expect(result.totalScore).toBe(4)
    expect(result.completedPatterns.map((pattern) => pattern.id)).toEqual(['four-brights'])
  })

  it('오광은 다른 광 족보와 중복되지 않고 15점이다', () => {
    const result = evaluatePatterns([
      card('jan-gwang', 'gwang'), card('mar-gwang', 'gwang'), card('aug-gwang', 'gwang'),
      card('nov-gwang', 'gwang'), card('dec-rain-gwang', 'gwang'),
    ])
    expect(result.totalScore).toBe(15)
    expect(result.completedPatterns.map((pattern) => pattern.id)).toEqual(['five-brights'])
  })
})

describe('중복 가능한 족보와 장수 점수', () => {
  it('홍단과 띠 5장 점수를 함께 계산한다', () => {
    const cards = [
      card('jan-red-ribbon', 'ribbon-red'), card('feb-red-ribbon', 'ribbon-red'), card('mar-red-ribbon', 'ribbon-red'),
      card('apr-plain-ribbon', 'ribbon-plain'), card('jun-blue-ribbon', 'ribbon-blue'),
    ]
    const result = evaluatePatterns(cards)
    expect(patternIds(cards)).toContain('hongdan')
    expect(result.countScores.ribbon).toBe(1)
    expect(result.totalScore).toBe(4)
  })

  it('고도리와 열끗 5장 점수를 함께 계산한다', () => {
    const cards = [
      card('feb-bird', 'animal'), card('apr-bird', 'animal'), card('aug-bird', 'animal'),
      card('jun-animal', 'animal'), card('jul-animal', 'animal'),
    ]
    const result = evaluatePatterns(cards)
    expect(patternIds(cards)).toContain('godori')
    expect(result.countScores.animal).toBe(1)
    expect(result.totalScore).toBe(6)
  })

  it.each([
    ['cheongdan', ['jun-blue-ribbon', 'sep-blue-ribbon', 'oct-blue-ribbon'], 'ribbon-blue'],
    ['chodan', ['apr-plain-ribbon', 'may-plain-ribbon', 'jul-plain-ribbon'], 'ribbon-plain'],
  ])('%s 족보를 3점으로 판정한다', (expectedId, ids, kind) => {
    const result = evaluatePatterns(ids.map((id) => card(id, kind)))
    expect(result.totalScore).toBe(3)
    expect(result.completedPatterns.map((pattern) => pattern.id)).toContain(expectedId)
  })

  it('띠와 열끗 장수 점수의 4·5·6장 경계를 계산한다', () => {
    const ribbons = Array.from({ length: 6 }, (_, index) => card(`ribbon-${index}`, 'ribbon-plain'))
    const animals = Array.from({ length: 6 }, (_, index) => card(`animal-${index}`, 'animal'))
    expect(evaluatePatterns(ribbons.slice(0, 4)).countScores.ribbon).toBe(0)
    expect(evaluatePatterns(ribbons.slice(0, 5)).countScores.ribbon).toBe(1)
    expect(evaluatePatterns(ribbons).countScores.ribbon).toBe(2)
    expect(evaluatePatterns(animals.slice(0, 4)).countScores.animal).toBe(0)
    expect(evaluatePatterns(animals.slice(0, 5)).countScores.animal).toBe(1)
    expect(evaluatePatterns(animals).countScores.animal).toBe(2)
  })
})

describe('피 환산과 옵션', () => {
  it('일반 피·쌍피·삼피를 정확히 환산한다', () => {
    const cards = [
      ...Array.from({ length: 7 }, (_, index) => card(`pi-${index}`, 'pi')),
      card('double-pi', 'pi', 2),
      card('triple-pi', 'pi', 3),
    ]
    const result = evaluatePatterns(cards)
    expect(result.counts.junk).toBe(12)
    expect(result.countScores.junk).toBe(3)
  })

  it('피 환산 장수의 9·10·11장 경계를 계산한다', () => {
    const junk = Array.from({ length: 11 }, (_, index) => card(`pi-${index}`, 'pi'))
    expect(evaluatePatterns(junk.slice(0, 9)).countScores.junk).toBe(0)
    expect(evaluatePatterns(junk.slice(0, 10)).countScores.junk).toBe(1)
    expect(evaluatePatterns(junk).countScores.junk).toBe(2)
  })

  it('보너스 패의 피 값은 옵션으로 변경할 수 있다', () => {
    const cards = Array.from({ length: 5 }, (_, index) => ({ ...card('bonus-pi', 'pi'), id: `bonus-${index}` }))
    const result = evaluatePatterns(cards, { ...defaultScoringOptions, bonusCardPiValue: 2 })
    expect(result.counts.junk).toBe(10)
    expect(result.countScores.junk).toBe(1)
  })

  it('5월 열끗을 쌍피로 쓰면 열끗과 피에 중복 계산하지 않는다', () => {
    const cards = [card('may-animal', 'animal'), ...Array.from({ length: 8 }, (_, index) => card(`pi-${index}`, 'pi'))]
    const result = evaluatePatterns(cards, { ...defaultScoringOptions, useMayAnimalAsDoublePi: true })
    expect(result.counts.animal).toBe(0)
    expect(result.counts.junk).toBe(10)
    expect(result.countScores.junk).toBe(1)
  })

  it('12월 비띠 포함 여부를 옵션으로 변경한다', () => {
    const cards = [
      card('dec-rain-ribbon', 'ribbon-plain'), card('jan-red-ribbon', 'ribbon-red'), card('feb-red-ribbon', 'ribbon-red'),
      card('apr-plain-ribbon', 'ribbon-plain'), card('jun-blue-ribbon', 'ribbon-blue'),
    ]
    expect(evaluatePatterns(cards).countScores.ribbon).toBe(1)
    expect(evaluatePatterns(cards, { ...defaultScoringOptions, includeRainRibbon: false }).countScores.ribbon).toBe(0)
  })
})
