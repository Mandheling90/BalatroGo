import { HwatuCard } from '../core/cards/types'
import type { ScoreEvent } from '../scoring/types'

export type Phase = 'blind' | 'playing' | 'shop' | 'gameover'
export type BlindIndex = 0 | 1 | 2
export type BlindStatus = 'pending' | 'cleared' | 'skipped'

export interface GameState {
  round: number
  blindIndex: BlindIndex
  blindHistory: BlindStatus[]
  target: number
  coins: number
  deck: HwatuCard[]
  hand: HwatuCard[]
  table: HwatuCard[]
  captured: HwatuCard[]
  selected: string | null
  ownedCharms: string[]
  shopOfferIds: string[]
  shopRerollCost: number
  phase: Phase
  pendingPhase: 'shop' | 'gameover' | null
  gameOverReason: string | null
  message: string
  lastRevealed: string[]
  lastCapturedMonths: number[]
  lastPlayedId: string | null
  lastSubmittedId: string | null
  lastCapturedIds: string[]
  lastMatchTarget: { x: number; y: number } | null
  ruleBonus: number
  ruleDetails: string[]
  shakenMonths: number[]
  awaitingGoStop: boolean
  goCount: number
  goRequiredScore: number
  lastScoreEvents: ScoreEvent[]
  lastRuleEffect: 'peok' | 'jjok' | null
  turnsUsed: number
  lastTurnAction: 'card' | 'deck' | null
  scoreTotal: number
  lastTurnBasePoints: number
  lastTurnScore: number
  unlimitedTurns: boolean
}
