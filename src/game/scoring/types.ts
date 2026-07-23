export type ScoreEventSourceType = 'card' | 'joker' | 'yaku' | 'go'
export type ScoreEventEmphasis = 'normal' | 'strong' | 'critical'

export interface ScoreEvent {
  id: string
  sourceType: ScoreEventSourceType
  sourceId: string
  label: string
  baseDelta?: number
  multDelta?: number
  xMult?: number
  emphasis: ScoreEventEmphasis
}

export interface BalatroScoreResult {
  cardPoints: number
  jokerPoints: number
  basePoints: number
  baseMultiplier: number
  yakuMultiplier: number
  jokerMultiplier: number
  ruleMultiplier: number
  multiplier: number
  finalMultiplier: number
  total: number
  events: ScoreEvent[]
}
