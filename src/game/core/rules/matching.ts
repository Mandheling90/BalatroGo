import { HwatuCard } from '../cards/types'

export function captureCompleteMonths(table: HwatuCard[]) {
  const completeMonths = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((month) => table.filter((card) => card.month === month).length === 4)
  return {
    completeMonths,
    captured: table.filter((card) => completeMonths.includes(card.month)),
    table: table.filter((card) => !completeMonths.includes(card.month)),
  }
}

export function matchPlayedCard(table: HwatuCard[], played: HwatuCard, pickedMatchId?: string) {
  const matches = table.filter((card) => card.month === played.month)
  if (matches.length === 0) return { table: [...table, played], captured: [] as HwatuCard[], matched: false, swept: false }
  if (matches.length === 3) return { table: table.filter((card) => card.month !== played.month), captured: [played, ...matches], matched: true, swept: true }
  const picked = matches.find((card) => card.id === pickedMatchId) ?? matches[0]
  return { table: table.filter((card) => card.id !== picked.id), captured: [played, picked], matched: true, swept: false }
}
