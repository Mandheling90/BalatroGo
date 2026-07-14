import { HwatuCard } from '../core/cards/types'

export interface Charm {
  id: string
  name: string
  icon: string
  description: string
  price: number
  accent: string
}

export interface ScoreModifierContext {
  cards: HwatuCard[]
  counts: { gwang: number; ribbon: number; junk: number; bird: number; completedMonths: number }
}

export interface ScoreModifierResult { score: number; detail?: string }

export interface RuleModifier extends Charm {
  priority: number
  modifyScore?: (context: ScoreModifierContext) => ScoreModifierResult
}
