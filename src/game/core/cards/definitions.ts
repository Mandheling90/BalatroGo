import { CardDefinition, CardKind } from './types'

const months = [
  ['송학', '소나무', '松'], ['매조', '매화', '梅'], ['벚꽃', '벚꽃', '桜'],
  ['흑싸리', '등꽃', '藤'], ['난초', '창포', '菖'], ['모란', '모란', '牡'],
  ['홍싸리', '싸리', '萩'], ['공산', '억새', '芒'], ['국준', '국화', '菊'],
  ['단풍', '단풍', '楓'], ['오동', '오동', '桐'], ['비', '버드나무', '雨'],
] as const

const recipes: Array<Array<{ id: string; kind: CardKind; title: string; bird?: boolean; piValue?: number }>> = [
  [{ id: 'jan-gwang', kind: 'gwang', title: '학 광', bird: true }, { id: 'jan-red-ribbon', kind: 'ribbon-red', title: '홍단' }, { id: 'jan-pi-1', kind: 'pi', title: '피' }, { id: 'jan-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'feb-bird', kind: 'animal', title: '꾀꼬리', bird: true }, { id: 'feb-red-ribbon', kind: 'ribbon-red', title: '홍단' }, { id: 'feb-pi-1', kind: 'pi', title: '피' }, { id: 'feb-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'mar-gwang', kind: 'gwang', title: '막 광' }, { id: 'mar-red-ribbon', kind: 'ribbon-red', title: '홍단' }, { id: 'mar-pi-1', kind: 'pi', title: '피' }, { id: 'mar-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'apr-bird', kind: 'animal', title: '두견새', bird: true }, { id: 'apr-plain-ribbon', kind: 'ribbon-plain', title: '초단' }, { id: 'apr-pi-1', kind: 'pi', title: '피' }, { id: 'apr-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'may-animal', kind: 'animal', title: '다리' }, { id: 'may-plain-ribbon', kind: 'ribbon-plain', title: '초단' }, { id: 'may-pi-1', kind: 'pi', title: '피' }, { id: 'may-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'jun-animal', kind: 'animal', title: '나비' }, { id: 'jun-blue-ribbon', kind: 'ribbon-blue', title: '청단' }, { id: 'jun-pi-1', kind: 'pi', title: '피' }, { id: 'jun-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'jul-animal', kind: 'animal', title: '멧돼지' }, { id: 'jul-plain-ribbon', kind: 'ribbon-plain', title: '초단' }, { id: 'jul-pi-1', kind: 'pi', title: '피' }, { id: 'jul-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'aug-gwang', kind: 'gwang', title: '달 광' }, { id: 'aug-bird', kind: 'animal', title: '기러기', bird: true }, { id: 'aug-pi-1', kind: 'pi', title: '피' }, { id: 'aug-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'sep-animal', kind: 'animal', title: '술잔' }, { id: 'sep-blue-ribbon', kind: 'ribbon-blue', title: '청단' }, { id: 'sep-pi-1', kind: 'pi', title: '피' }, { id: 'sep-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'oct-animal', kind: 'animal', title: '사슴' }, { id: 'oct-blue-ribbon', kind: 'ribbon-blue', title: '청단' }, { id: 'oct-pi-1', kind: 'pi', title: '피' }, { id: 'oct-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'nov-gwang', kind: 'gwang', title: '봉황 광', bird: true }, { id: 'nov-double-pi', kind: 'pi', title: '쌍피', piValue: 2 }, { id: 'nov-pi-1', kind: 'pi', title: '피' }, { id: 'nov-pi-2', kind: 'pi', title: '피' }],
  [{ id: 'dec-rain-gwang', kind: 'gwang', title: '비 광' }, { id: 'dec-animal', kind: 'animal', title: '제비', bird: true }, { id: 'dec-rain-ribbon', kind: 'ribbon-plain', title: '비 띠' }, { id: 'dec-double-pi', kind: 'pi', title: '쌍피', piValue: 2 }],
]

const chipByKind: Record<CardKind, number> = { gwang: 11, animal: 7, 'ribbon-red': 5, 'ribbon-blue': 5, 'ribbon-plain': 4, pi: 2 }

export const cardDefinitions: CardDefinition[] = months.flatMap(([symbolName, flower, symbol], monthIndex) =>
  recipes[monthIndex].map((recipe, cardIndex) => ({
    id: recipe.id,
    month: monthIndex + 1,
    spriteRow: Math.floor(monthIndex / 2),
    spriteColumn: (monthIndex % 2) * 4 + cardIndex,
    flower,
    symbol,
    kind: recipe.kind,
    title: `${symbolName} · ${recipe.title}`,
    chips: chipByKind[recipe.kind],
    bird: recipe.bird,
    piValue: recipe.kind === 'pi' ? (recipe.piValue ?? 1) : undefined,
  })),
)
