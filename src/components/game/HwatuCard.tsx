import type { AnimationEvent, CSSProperties } from 'react'
import type { HwatuCard } from '../../game/core/cards/types'
import { getCardPoints } from '../../game/scoring/calculate-score'

const kindLabels = {
  gwang: '광',
  animal: '열끗',
  'ribbon-red': '홍단',
  'ribbon-blue': '청단',
  'ribbon-plain': '띠',
  pi: '피',
} as const

interface HwatuCardViewProps {
  card: HwatuCard
  selected?: boolean
  compact?: boolean
  revealed?: boolean
  slapped?: boolean
  flyToScore?: boolean
  submittedCapture?: boolean
  effectIndex?: number
  effectDelayMs?: number
  onClick?: () => void
  onFlyToScoreEnd?: () => void
}

export function Card({
  card,
  selected = false,
  compact = false,
  revealed = false,
  slapped = false,
  flyToScore = false,
  submittedCapture = false,
  effectIndex = 0,
  effectDelayMs,
  onClick,
  onFlyToScoreEnd,
}: HwatuCardViewProps) {
  const Tag = onClick ? 'button' : 'div'
  const isBonusPi = card.definitionId === 'bonus-pi'
  const bonusTone = card.bonusEvent === '폭탄' ? 'bomb'
    : card.bonusEvent === '따닥' ? 'ttadak'
      : card.bonusEvent === '쪽' ? 'jjok'
      : card.bonusEvent === '쓸' ? 'sweep'
        : 'peok'

  return (
    <Tag
      className={`hwatu-card kind-${card.kind} ${isBonusPi ? `bonus-pi bonus-${bonusTone}` : ''} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''} ${revealed ? 'revealed' : ''} ${slapped ? 'slapped' : ''} ${flyToScore ? 'fly-to-score' : ''} ${submittedCapture ? 'submitted-capture' : ''}`}
      onClick={onClick}
      onAnimationEnd={(event: AnimationEvent<HTMLElement>) => {
        if (flyToScore && event.animationName === 'floorToScore') onFlyToScoreEnd?.()
      }}
      aria-pressed={onClick ? selected : undefined}
      style={{
        '--sprite-position': `${(card.spriteColumn / 7) * 100}% ${(card.spriteRow / 5) * 100}%`,
        '--effect-index': effectIndex,
        '--effect-delay': `${effectDelayMs ?? effectIndex * 45}ms`,
        '--fly-offset': `${(effectIndex - 1.5) * 16}px`,
      } as CSSProperties}
    >
      {!isBonusPi && <>
        <span className="month">{card.month}월</span>
        <span className="flower-point">{getCardPoints(card)}화점</span>
      </>}
      <span className="plant">{card.symbol}</span>
      <span className="flower">{card.flower}</span>
      {!isBonusPi && <span className="card-title">{card.title}</span>}
      {!isBonusPi && <span className="kind">{kindLabels[card.kind]}</span>}
      {isBonusPi && <span className="bonus-pi-mark"><b>+1 피</b><small>{card.bonusEvent ?? '보너스'}</small></span>}
    </Tag>
  )
}
