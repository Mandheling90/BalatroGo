export type CardKind = 'gwang' | 'animal' | 'ribbon-red' | 'ribbon-blue' | 'ribbon-plain' | 'pi'

export interface HwatuCard {
  id: string
  definitionId: string
  month: number
  spriteRow: number
  spriteColumn: number
  flower: string
  symbol: string
  kind: CardKind
  title: string
  chips: number
  bird?: boolean
  piValue?: number
}

export interface ScoreResult {
  gwang: number
  animal: number
  ribbon: number
  pi: number
  bonus: number
  total: number
  details: string[]
}

export interface Charm {
  id: string
  name: string
  icon: string
  description: string
  price: number
  accent: string
}

const months = [
  ['송학', '소나무', '松'], ['매조', '매화', '梅'], ['벚꽃', '벚꽃', '桜'],
  ['흑싸리', '등꽃', '藤'], ['난초', '창포', '菖'], ['모란', '모란', '牡'],
  ['홍싸리', '싸리', '萩'], ['공산', '억새', '芒'], ['국준', '국화', '菊'],
  ['단풍', '단풍', '楓'], ['오동', '오동', '桐'], ['비', '버드나무', '雨'],
] as const

const recipes: Array<Array<{ kind: CardKind; title: string; bird?: boolean }>> = [
  [{ kind: 'gwang', title: '학 광', bird: true }, { kind: 'ribbon-red', title: '홍단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '쌍피' }],
  [{ kind: 'animal', title: '꾀꼬리', bird: true }, { kind: 'ribbon-red', title: '홍단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'gwang', title: '막 광' }, { kind: 'ribbon-red', title: '홍단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'animal', title: '두견새', bird: true }, { kind: 'ribbon-plain', title: '초단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'animal', title: '다리' }, { kind: 'ribbon-plain', title: '초단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'animal', title: '나비' }, { kind: 'ribbon-blue', title: '청단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'animal', title: '멧돼지' }, { kind: 'ribbon-plain', title: '초단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'gwang', title: '달 광' }, { kind: 'animal', title: '기러기', bird: true }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'animal', title: '술잔' }, { kind: 'ribbon-blue', title: '청단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'animal', title: '사슴' }, { kind: 'ribbon-blue', title: '청단' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'gwang', title: '봉황 광', bird: true }, { kind: 'pi', title: '쌍피' }, { kind: 'pi', title: '피' }, { kind: 'pi', title: '피' }],
  [{ kind: 'gwang', title: '비 광' }, { kind: 'animal', title: '제비', bird: true }, { kind: 'ribbon-plain', title: '비 띠' }, { kind: 'pi', title: '피' }],
]

const cardDefinitionIds = [
  ['jan-gwang', 'jan-red-ribbon', 'jan-pi-1', 'jan-pi-2'],
  ['feb-bird', 'feb-red-ribbon', 'feb-pi-1', 'feb-pi-2'],
  ['mar-gwang', 'mar-red-ribbon', 'mar-pi-1', 'mar-pi-2'],
  ['apr-bird', 'apr-plain-ribbon', 'apr-pi-1', 'apr-pi-2'],
  ['may-animal', 'may-plain-ribbon', 'may-pi-1', 'may-pi-2'],
  ['jun-animal', 'jun-blue-ribbon', 'jun-pi-1', 'jun-pi-2'],
  ['jul-animal', 'jul-plain-ribbon', 'jul-pi-1', 'jul-pi-2'],
  ['aug-gwang', 'aug-bird', 'aug-pi-1', 'aug-pi-2'],
  ['sep-animal', 'sep-blue-ribbon', 'sep-pi-1', 'sep-pi-2'],
  ['oct-animal', 'oct-blue-ribbon', 'oct-pi-1', 'oct-pi-2'],
  ['nov-gwang', 'nov-double-pi', 'nov-pi-1', 'nov-pi-2'],
  ['dec-rain-gwang', 'dec-animal', 'dec-rain-ribbon', 'dec-double-pi'],
] as const

const chipByKind: Record<CardKind, number> = {
  gwang: 11,
  animal: 7,
  'ribbon-red': 5,
  'ribbon-blue': 5,
  'ribbon-plain': 4,
  pi: 2,
}

export const createDeck = (): HwatuCard[] => months.flatMap(([symbolName, flower, symbol], index) =>
  recipes[index].map((recipe, cardIndex) => ({
    id: `${index + 1}-${cardIndex}-${Math.random().toString(36).slice(2, 7)}`,
    definitionId: cardDefinitionIds[index][cardIndex],
    month: index + 1,
    spriteRow: Math.floor(index / 2),
    spriteColumn: (index % 2) * 4 + cardIndex,
    flower,
    symbol,
    kind: recipe.kind,
    title: `${symbolName} · ${recipe.title}`,
    chips: chipByKind[recipe.kind],
    bird: recipe.bird,
    piValue: recipe.kind === 'pi' && (cardDefinitionIds[index][cardIndex] === 'nov-double-pi' || cardDefinitionIds[index][cardIndex] === 'dec-double-pi') ? 2 : 1,
  })),
)

export const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export const charms: Charm[] = [
  { id: 'moon', name: '쌍월경', icon: '◑', description: '완성해 가져온 달마다 보너스 1점', price: 7, accent: '#ffe49a' },
  { id: 'gwang', name: '광명부', icon: '光', description: '획득한 광 2장마다 보너스 1점', price: 8, accent: '#ffd15c' },
  { id: 'pi', name: '피바람', icon: '血', description: '피 점수패 7장부터 1점 추가', price: 6, accent: '#ff6b57' },
  { id: 'ribbon', name: '삼색 매듭', icon: '結', description: '띠 점수패 3장부터 1점 추가', price: 7, accent: '#61d8ff' },
  { id: 'bird', name: '새벽의 새장', icon: '鳥', description: '획득한 새 두 마리마다 보너스 1점', price: 6, accent: '#b9f06a' },
]

export function scoreCaptured(cards: HwatuCard[], ownedCharmIds: string[], ruleBonus = 0, ruleDetails: string[] = []): ScoreResult {
  const count = (predicate: (card: HwatuCard) => boolean) => cards.filter(predicate).length
  const evaluation = evaluatePatterns(cards)
  const gwangCount = evaluation.counts.gwang
  const ribbonCount = evaluation.counts.ribbon
  const piCount = evaluation.counts.junk
  const birdCount = count((card) => Boolean(card.bird))
  const completedMonths = new Set(cards.filter((card) => card.month >= 1).map((card) => card.month)).size
  const patternScore = (ids: string[]) => evaluation.completedPatterns.filter((pattern) => ids.includes(pattern.id)).reduce((sum, pattern) => sum + pattern.score, 0)
  const gwang = patternScore(['three-brights', 'rain-three-brights', 'four-brights', 'five-brights'])
  const animal = patternScore(['godori']) + evaluation.countScores.animal
  const ribbon = patternScore(['hongdan', 'cheongdan', 'chodan']) + evaluation.countScores.ribbon
  const pi = evaluation.countScores.junk
  const details = [
    ...evaluation.completedPatterns.map((pattern) => `${pattern.name} ${pattern.score}점`),
    ...(evaluation.countScores.animal ? [`열끗 ${evaluation.countScores.animal}점`] : []),
    ...(evaluation.countScores.ribbon ? [`띠 ${evaluation.countScores.ribbon}점`] : []),
    ...(evaluation.countScores.junk ? [`피 ${evaluation.countScores.junk}점`] : []),
  ]

  let bonus = 0
  if (ownedCharmIds.includes('moon') && completedMonths) {
    bonus += completedMonths
    details.push(`쌍월경 ${completedMonths}점`)
  }
  if (ownedCharmIds.includes('gwang') && gwangCount >= 2) {
    const value = Math.floor(gwangCount / 2)
    bonus += value
    details.push(`광명부 ${value}점`)
  }
  if (ownedCharmIds.includes('pi') && piCount >= 7) { bonus += 1; details.push('피바람 1점') }
  if (ownedCharmIds.includes('ribbon') && ribbonCount >= 3) { bonus += 1; details.push('삼색 매듭 1점') }
  if (ownedCharmIds.includes('bird') && birdCount >= 2) {
    const value = Math.floor(birdCount / 2)
    bonus += value
    details.push(`새벽의 새장 ${value}점`)
  }

  if (ruleBonus > 0) {
    bonus += ruleBonus
    details.push(...ruleDetails)
  }

  return { gwang, animal, ribbon, pi, bonus, total: gwang + animal + ribbon + pi + bonus, details }
}

export const kindLabel: Record<CardKind, string> = {
  gwang: '광',
  animal: '열끗',
  'ribbon-red': '홍단',
  'ribbon-blue': '청단',
  'ribbon-plain': '초단',
  pi: '피',
}
import { evaluatePatterns } from './scoring'
